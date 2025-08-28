#include "codegen.h"

#include <iostream>

using namespace lambdawg;

CodeGen::CodeGen() : builder(context) {
    module = std::make_unique<llvm::Module>("lambdawg", context);
}

void CodeGen::generate(const std::shared_ptr<ASTNode>& node) { visit(node); }

void CodeGen::dumpModule() { module->print(llvm::outs(), nullptr); }

void CodeGen::visit(const std::shared_ptr<ASTNode>& node) {
    if (auto lit = std::dynamic_pointer_cast<Literal>(node))
        visitLiteral(lit);
    else if (auto fn = std::dynamic_pointer_cast<FunctionDecl>(node))
        visitFunction(fn);
    else if (auto call = std::dynamic_pointer_cast<Call>(node))
        visitCall(call);
    else if (auto pipe = std::dynamic_pointer_cast<Pipeline>(node))
        visitPipeline(pipe);
    else if (auto eff = std::dynamic_pointer_cast<EffectBlock>(node))
        visitEffectBlock(eff);
    else
        std::cerr << "Unknown AST node\n";
}

void CodeGen::visitLiteral(const std::shared_ptr<Literal>& lit) {
    switch (lit->litType) {
        case Literal::LitType::Int:
            lit->llvmValue = llvm::ConstantInt::get(
                llvm::Type::getInt32Ty(context), std::stoi(lit->value));
            lit->type = "Int";
            break;
        case Literal::LitType::Bool:
            lit->llvmValue = llvm::ConstantInt::get(
                llvm::Type::getInt1Ty(context), lit->value == "true" ? 1 : 0);
            lit->type = "Bool";
            break;
        case Literal::LitType::String:
            lit->llvmValue = builder.CreateGlobalStringPtr(lit->value);
            lit->type = "String";
            break;
    }
}

void CodeGen::visitIdentifierNode(const std::shared_ptr<Identifier>& id) {
    auto it = namedValues.find(id->name);
    if (it != namedValues.end()) {
        llvm::Value* ptr = it->second;
        if (auto* alloca = llvm::dyn_cast<llvm::AllocaInst>(ptr)) {
            llvm::Type* elemTy = alloca->getAllocatedType();
            id->llvmValue = builder.CreateLoad(elemTy, ptr);
        } else {
            id->llvmValue = ptr; // not an alloca, just a value
        }
    } else {
        auto fit = functionTable.find(id->name);
        if (fit != functionTable.end())
            id->llvmValue = fit->second;
        else
            id->llvmValue = nullptr;
    }
}

void CodeGen::visitFunction(const std::shared_ptr<FunctionDecl>& fn) {
    std::vector<llvm::Type*> argTypes(fn->params.size(),
                                      llvm::Type::getInt32Ty(context));
    auto funcType = llvm::FunctionType::get(llvm::Type::getInt32Ty(context),
                                            argTypes, false);
    auto function =
        llvm::Function::Create(funcType, llvm::Function::ExternalLinkage,
                               fn->name->name, module.get());

    functionTable[fn->name->name] = function;

    auto entryBB = llvm::BasicBlock::Create(context, "entry", function);
    builder.SetInsertPoint(entryBB);

    namedValues.clear();
    size_t idx = 0;
    for (auto& arg : function->args()) {
        // create an alloca in entry block to hold the parameter
        llvm::AllocaInst* alloca =
            builder.CreateAlloca(arg.getType(), nullptr, fn->params[idx]->name);
        // store the incoming argument into the alloca
        builder.CreateStore(&arg, alloca);
        // record pointer to alloca (so later loads can occur)
        namedValues[fn->params[idx]->name] = alloca;
        ++idx;
    }

    // now generate body
    visit(fn->body);

    if (fn->body->llvmValue)
        builder.CreateRet(fn->body->llvmValue);
    else
        builder.CreateRet(
            llvm::ConstantInt::get(llvm::Type::getInt32Ty(context), 0));
}

void CodeGen::visitCall(const std::shared_ptr<Call>& call) {
    auto calleeId = std::dynamic_pointer_cast<Identifier>(call->callee);
    if (!calleeId) {
        std::cerr << "Non-identifier callee not supported yet\n";
        call->llvmValue = nullptr;
        return;
    }

    // Evaluate args first
    std::vector<llvm::Value*> argVals;
    argVals.reserve(call->args.size());
    for (auto& arg : call->args) {
        visit(arg);
        if (!arg->llvmValue) {
            std::cerr << "Warning: argument produced no llvmValue\n";
            // push a safe default to avoid crashes
            argVals.push_back(
                llvm::ConstantInt::get(llvm::Type::getInt32Ty(context), 0));
        } else {
            argVals.push_back(arg->llvmValue);
        }
    }

    // Built-in console.print (support either "console.print" or "print")
    if (calleeId->name == "console.print" || calleeId->name == "print") {
        if (!argVals.empty()) {
            // choose string or vector overload by argument type
            if (call->args[0]->type == "String") {
                auto* fn = getOrDeclareConsolePrintStr();
                builder.CreateCall(fn, {argVals[0]});
            } else {
                auto* fn = getOrDeclareConsolePrintVec();
                builder.CreateCall(fn, {argVals[0]});
            }
        }
        call->llvmValue = nullptr;  // printing returns no value
        return;
    }

    // map/filter
    if (calleeId->name == "map") {
        auto* fn = getOrDeclareMap();
        call->llvmValue = builder.CreateCall(fn, argVals);
        return;
    }
    if (calleeId->name == "filter") {
        auto* fn = getOrDeclareFilter();
        call->llvmValue = builder.CreateCall(fn, argVals);
        return;
    }

    // user function
    auto it = functionTable.find(calleeId->name);
    if (it != functionTable.end()) {
        call->llvmValue = builder.CreateCall(it->second, argVals);
    } else {
        std::cerr << "Unknown function: " << calleeId->name << "\n";
        call->llvmValue = nullptr;
    }
}

void CodeGen::visitPipeline(const std::shared_ptr<Pipeline>& pipe) {
    llvm::Value* current = nullptr;
    for (auto& stage : pipe->stages) {
        visit(stage);
        if (stage->llvmValue) current = stage->llvmValue;
    }
    pipe->llvmValue = current;
}

void CodeGen::visitEffectBlock(const std::shared_ptr<EffectBlock>& block) {
    for (auto& stmt : block->statements) {
        visit(stmt);
    }
}

// declarations for runtime functions

llvm::Function* CodeGen::getOrDeclareConsolePrintStr() {
    if (auto* f = module->getFunction("lambdawg_runtime_console_print_str"))
        return f;

    auto* fnType = llvm::FunctionType::get(
        llvm::Type::getVoidTy(context),
        {llvm::PointerType::getUnqual(llvm::Type::getInt8Ty(context))},  // i8*
        false);

    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "lambdawg_runtime_console_print_str",
                                  module.get());
}

llvm::Function* CodeGen::getOrDeclareConsolePrintVec() {
    if (auto* f = module->getFunction("lambdawg_runtime_console_print_vec"))
        return f;

    auto* vecPtrTy = llvm::PointerType::getUnqual(getVectorType());
    auto* fnType = llvm::FunctionType::get(llvm::Type::getVoidTy(context),
                                           {vecPtrTy}, false);
    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "lambdawg_runtime_console_print_vec",
                                  module.get());
}

llvm::Function* CodeGen::getOrDeclareMap() {
    if (auto* f = module->getFunction("lambdawg_runtime_map")) return f;

    auto* vecPtrTy = llvm::PointerType::getUnqual(getVectorType());
    auto* intTy = llvm::Type::getInt32Ty(context);

    // int (int)  -> function pointer type
    auto* mapperTy = llvm::FunctionType::get(intTy, {intTy}, false);
    auto* mapperPtrTy = llvm::PointerType::getUnqual(mapperTy);

    auto* fnType =
        llvm::FunctionType::get(vecPtrTy, {vecPtrTy, mapperPtrTy}, false);
    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "lambdawg_runtime_map", module.get());
}

llvm::Function* CodeGen::getOrDeclareFilter() {
    if (auto* f = module->getFunction("lambdawg_runtime_filter")) return f;

    auto* vecPtrTy = llvm::PointerType::getUnqual(getVectorType());
    auto* intTy = llvm::Type::getInt32Ty(context);
    auto* boolTy = llvm::Type::getInt1Ty(context);

    // i1 (i32) -> predicate pointer type
    auto* predTy = llvm::FunctionType::get(boolTy, {intTy}, false);
    auto* predPtrTy = llvm::PointerType::getUnqual(predTy);

    auto* fnType =
        llvm::FunctionType::get(vecPtrTy, {vecPtrTy, predPtrTy}, false);
    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "lambdawg_runtime_filter", module.get());
}

llvm::StructType* CodeGen::getVectorType() {
    if (!vectorType) {
        vectorType = llvm::StructType::create(context, "LLVMVector");
        vectorType->setBody({
            llvm::PointerType::getUnqual(
                llvm::Type::getInt32Ty(context)),  // int*
            llvm::Type::getInt32Ty(context),       // length
            llvm::Type::getInt32Ty(context)        // capacity
        });
    }
    return vectorType;
}