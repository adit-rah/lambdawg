#pragma once
#include <memory>
#include <unordered_map>
#include <vector>

#include "ast.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/LLVMContext.h"
#include "llvm/IR/Module.h"

namespace lambdawg {

class CodeGen {
   public:
    CodeGen();

    void generate(const std::shared_ptr<ASTNode>& node);
    void dumpModule();

   private:
    llvm::LLVMContext context;
    llvm::IRBuilder<> builder;
    std::unique_ptr<llvm::Module> module;

    std::unordered_map<std::string, llvm::Function*> functionTable;
    std::unordered_map<std::string, llvm::Value*> namedValues;
    llvm::StructType* vectorType = nullptr;
    std::vector<llvm::Value*> currentAmbient;  // hidden args for ambient lambdas

    void visit(const std::shared_ptr<ASTNode>& node);
    void visitLiteral(const std::shared_ptr<Literal>& lit);
    void visitIdentifierNode(const std::shared_ptr<Identifier>& id);
    void visitFunction(const std::shared_ptr<FunctionDecl>& fn);
    void visitCall(const std::shared_ptr<Call>& call);
    void visitPipeline(const std::shared_ptr<Pipeline>& pipe);
    void visitEffectBlock(const std::shared_ptr<EffectBlock>& block);

    llvm::StructType* getVectorType();
    llvm::Function* getOrDeclareConsolePrintStr();
    llvm::Function* getOrDeclareConsolePrintVec();
    llvm::Function* getOrDeclareMap();
    llvm::Function* getOrDeclareFilter();
};

}  // namespace lambdawg
