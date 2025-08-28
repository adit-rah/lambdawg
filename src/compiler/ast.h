#pragma once
#include <memory>
#include <string>
#include <vector>

#include "llvm/IR/Value.h"

namespace lambdawg {

// base AST node
struct ASTNode {
    virtual ~ASTNode() = default;
    bool isPure = true;            // true if node has no effects
    llvm::Value *llvmValue = nullptr;  // LLVM value generated during codegen
    std::string type = "Unknown";  // basic type inference: Int, String, Bool
};

// literal node
struct Literal : ASTNode {
    enum class LitType { Int, String, Bool } litType;

    std::string value;
    std::string semType;

    Literal(LitType t, const std::string &v) : litType(t), value(v) {}
};

// identifier
struct Identifier : ASTNode {
    std::string name;
    Identifier() = default;
    Identifier(const std::string &n) : name(n) {}
};

// function declaration
struct FunctionDecl : ASTNode {
    std::shared_ptr<Identifier> name;
    std::vector<std::shared_ptr<Identifier>> params;
    std::vector<std::shared_ptr<Identifier>> context;  // ambient lambdas
    std::shared_ptr<ASTNode> body;
};

// function call
struct Call : ASTNode {
    std::shared_ptr<ASTNode> callee;
    std::vector<std::shared_ptr<ASTNode>> args;
};

// pipeline node
struct Pipeline : ASTNode {
    std::vector<std::shared_ptr<ASTNode>> stages;
};

struct EffectBlock : ASTNode {
    bool isEffect = false;  // true if do!
    std::vector<std::shared_ptr<ASTNode>> statements;
};

}  // namespace lambdawg
