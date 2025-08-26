#include "codegen.h"

#include <iostream>
#include <thread>

#include "llvm/IR/Constants.h"
#include "llvm/IR/Intrinsics.h"
#include "llvm/IR/Verifier.h"

namespace lambdawg {

CodeGen::CodeGen() : builder(context) {
    module = std::make_unique<llvm::Module>("lambdawg_module", context);
}

void CodeGen::generate(const std::shared_ptr<ASTNode>& node) { visit(node); }

void CodeGen::dumpModule() { module->print(llvm::errs(), nullptr); }

void CodeGen::visit(const std::shared_ptr<ASTNode>& node) {
    if (!node) return;

    if (auto lit = std::dynamic_pointer_cast<Literal>(node))
        visitLiteral(lit);
    else if (auto fn = std::dynamic_pointer_cast<FunctionDecl>(node))
        visitFunction(fn);
    else if (auto call = std::dynamic_pointer_cast<Call>(node))
        visitCall(call);
    else if (auto pipe = std::dynamic_pointer_cast<Pipeline>(node))
        visitPipeline(pipe);
    else if (auto block = std::dynamic_pointer_cast<EffectBlock>(node))
        visitEffectBlock(block);
}

void CodeGen::visitLiteral(const std::shared_ptr<Literal>& lit) {
    if (lit->semType == "Int") {
        lit->llvmValue = llvm::ConstantInt::get(
            context, llvm::APInt(32, std::stoi(lit->value)));
    } else if (lit->semType == "String") {
        lit->llvmValue = builder.CreateGlobalStringPtr(lit->value);
    }
}

llvm::Function* CodeGen::getOrDeclareConsolePrint() {
    llvm::Function* f = module->getFunction("lambdawg_console_print");
    if (!f) {
        llvm::FunctionType* ft = llvm::FunctionType::get(
            llvm::Type::getVoidTy(context),       // return void
            {llvm::Type::getInt8Ty(context)->getPointerTo()},  // i8*
            false
        );
        f = llvm::Function::Create(ft, llvm::Function::ExternalLinkage,
                                   "lambdawg_console_print", module.get());
    }
    return f;
}

llvm::Function* CodeGen::getOrDeclareMap() {
    llvm::Function* f = module->getFunction("lambdawg_map");
    if (!f) {
        // map(std::vector<int>*, int(*)(int))
        llvm::Type* vecType = llvm::PointerType::getUnqual(builder.getInt32Ty()); // simplified
        llvm::Type* fnType = llvm::PointerType::getUnqual(builder.getInt32Ty()); // placeholder for function pointer
        llvm::FunctionType* ft = llvm::FunctionType::get(
            vecType, {vecType, fnType}, false);
        f = llvm::Function::Create(ft, llvm::Function::ExternalLinkage,
                                   "lambdawg_map", module.get());
    }
    return f;
}

llvm::Function* CodeGen::getOrDeclareFilter() {
    llvm::Function* f = module->getFunction("lambdawg_filter");
    if (!f) {
        // filter(std::vector<int>*, bool(*)(int))
        llvm::Type* vecType = llvm::PointerType::getUnqual(builder.getInt32Ty());
        llvm::Type* fnType = llvm::PointerType::getUnqual(builder.getInt1Ty()); // bool(*)(int)
        llvm::FunctionType* ft = llvm::FunctionType::get(
            vecType, {vecType, fnType}, false);
        f = llvm::Function::Create(ft, llvm::Function::ExternalLinkage,
                                   "lambdawg_filter", module.get());
    }
    return f;
}

void CodeGen::visitFunction(const std::shared_ptr<FunctionDecl>& fn) {
    std::vector<llvm::Type*> paramTypes(fn->params.size(),
                                        builder.getInt32Ty());
    // Add ambient lambdas as hidden parameters
    paramTypes.insert(paramTypes.end(), currentAmbient.size(),
                      builder.getInt32Ty());

    llvm::FunctionType* funcType =
        llvm::FunctionType::get(builder.getInt32Ty(), paramTypes, false);

    llvm::Function* llvmFunc =
        llvm::Function::Create(funcType, llvm::Function::ExternalLinkage,
                               fn->name->name, module.get());

    functionTable[fn->name->name] = llvmFunc;

    llvm::BasicBlock* entry =
        llvm::BasicBlock::Create(context, "entry", llvmFunc);
    builder.SetInsertPoint(entry);

    visit(fn->body);

    builder.CreateRet(llvm::ConstantInt::get(context, llvm::APInt(32, 0)));
}

void CodeGen::visitCall(const std::shared_ptr<Call>& call) {
    auto id = std::dynamic_pointer_cast<Identifier>(call->callee);
    if (!id) return;

    auto it = functionTable.find(id->name);
    if (it == functionTable.end()) return;

    llvm::Function* calleeFunc = it->second;
    std::vector<llvm::Value*> args;

    for (auto& arg : call->args) {
        if (auto lit = std::dynamic_pointer_cast<Literal>(arg))
            args.push_back(lit->llvmValue);
        else
            args.push_back(llvm::ConstantInt::get(context, llvm::APInt(32, 0)));
    }

    // Add ambient arguments
    args.insert(args.end(), currentAmbient.begin(), currentAmbient.end());

    builder.CreateCall(calleeFunc, args);
}

void CodeGen::visitPipeline(const std::shared_ptr<Pipeline>& pipe) {
    std::vector<std::thread> threads;

    for (auto& stage : pipe->stages) {
        if (stage->isPure) {
            threads.emplace_back([this, stage]() {
                if (auto call = std::dynamic_pointer_cast<Call>(stage)) {
                    auto id = std::dynamic_pointer_cast<Identifier>(call->callee);
                    if (!id) return;

                    if (id->name == "map") {
                        llvm::Function* mapFunc = getOrDeclareMap();
                        llvm::Value* listPtr = call->args[0]->llvmValue;
                        llvm::Value* fnPtr = call->args[1]->llvmValue;
                        builder.CreateCall(mapFunc, {listPtr, fnPtr});
                    } else if (id->name == "filter") {
                        llvm::Function* filterFunc = getOrDeclareFilter();
                        llvm::Value* listPtr = call->args[0]->llvmValue;
                        llvm::Value* fnPtr = call->args[1]->llvmValue;
                        builder.CreateCall(filterFunc, {listPtr, fnPtr});
                    } else {
                        visit(stage);
                    }
                } else {
                    visit(stage);
                }
            });
        } else {
            visit(stage); // effectful sequential
        }
    }

    for (auto& t : threads) t.join();
}


void CodeGen::visitEffectBlock(const std::shared_ptr<EffectBlock>& block) {
    for (auto& stmt : block->statements) {
        visit(stmt);
        if (block->isEffect) {
            if (auto call = std::dynamic_pointer_cast<Call>(stmt)) {
                auto id = std::dynamic_pointer_cast<Identifier>(call->callee);
                if (id && id->name == "console.print") {
                    llvm::Function* printFunc = getOrDeclareConsolePrint();
                    llvm::Value* arg = call->args[0]->llvmValue;
                    builder.CreateCall(printFunc, {arg});
                }
            }
        }
    }
}

}  // namespace lambdawg
