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

void CodeGen::visitFunction(const std::shared_ptr<FunctionDecl>& fn) {
    std::vector<llvm::Type*> argTypes(fn->params.size(),
                                      llvm::Type::getInt32Ty(context));
    auto funcType = llvm::FunctionType::get(llvm::Type::getInt32Ty(context),
                                            argTypes, false);
    auto function =
        llvm::Function::Create(funcType, llvm::Function::ExternalLinkage,
                               fn->name->name, module.get());

    functionTable[fn->name->name] = function;

    auto block = llvm::BasicBlock::Create(context, "entry", function);
    builder.SetInsertPoint(block);

    // Bind params into namedValues
    size_t idx = 0;
    for (auto& arg : function->args()) {
        namedValues[fn->params[idx++]->name] = &arg;
    }

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
        return;
    }

    std::vector<llvm::Value*> argVals;
    for (auto& arg : call->args) {
        visit(arg);
        argVals.push_back(arg->llvmValue);
    }

    if (calleeId->name == "print") {
        if (call->args.size() == 1 && call->args[0]->type == "String") {
            auto fn = getOrDeclareConsolePrintStr();
            builder.CreateCall(fn, argVals);
        } else {
            auto fn = getOrDeclareConsolePrintVec();
            builder.CreateCall(fn, argVals);
        }
        return;
    }

    if (calleeId->name == "map") {
        auto fn = getOrDeclareMap();
        call->llvmValue = builder.CreateCall(fn, argVals);
        return;
    }

    if (calleeId->name == "filter") {
        auto fn = getOrDeclareFilter();
        call->llvmValue = builder.CreateCall(fn, argVals);
        return;
    }

    auto it = functionTable.find(calleeId->name);
    if (it != functionTable.end()) {
        call->llvmValue = builder.CreateCall(it->second, argVals);
    } else {
        std::cerr << "Unknown function: " << calleeId->name << "\n";
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
    if (auto* f = module->getFunction("console_print_str")) return f;

    // Use builder to get types safely
    auto* fnType = llvm::FunctionType::get(
        builder.getVoidTy(),                    // return type: void
        {llvm::PointerType::getUnqual(
            llvm::Type::getInt8Ty(context))},  // parameter: i8*
        false                                  // not variadic
    );

    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "console_print_str", module.get());
}

llvm::Function* CodeGen::getOrDeclareConsolePrintVec() {
    if (auto* f = module->getFunction("console_print_vec")) return f;
    auto* fnType = llvm::FunctionType::get(llvm::Type::getVoidTy(context),
                                           {getVectorType()}, false);
    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "console_print_vec", module.get());
}

llvm::Function* CodeGen::getOrDeclareMap() {
    if (auto* f = module->getFunction("runtime_map")) return f;
    auto* fnType =
        llvm::FunctionType::get(getVectorType(), {getVectorType()}, false);
    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "runtime_map", module.get());
}

llvm::Function* CodeGen::getOrDeclareFilter() {
    if (auto* f = module->getFunction("runtime_filter")) return f;
    auto* fnType =
        llvm::FunctionType::get(getVectorType(), {getVectorType()}, false);
    return llvm::Function::Create(fnType, llvm::Function::ExternalLinkage,
                                  "runtime_filter", module.get());
}

llvm::StructType* CodeGen::getVectorType() {
    if (!vectorType) {
        vectorType = llvm::StructType::create(context, "Vector");
        vectorType->setBody({
            llvm::Type::getInt32Ty(context),  // length
            llvm::PointerType::getUnqual(
                llvm::Type::getInt8Ty(context))  // data ptr
        });
    }
    return vectorType;
}
