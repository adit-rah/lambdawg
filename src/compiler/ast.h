#pragma once
#include <string>
#include <vector>
#include <memory>

namespace lambdawg {
    
// base AST node
struct ASTNode {
    virtual ~ASTNode() = default;
};

// literal node
struct Literal : ASTNode {
    enum class Type {
        Int,
        String,
        Bool
    } type;
    
    std::string value;
    Literal(Type t, const std::string &v) : type(t), value(v) {}
};

// identifier
struct Identifier : ASTNode {
    std::string name;
    Identifier(const std::string &n) : name(n) {}
};

// function declaration
struct FunctionDecl : ASTNode {
    std::shared_ptr<Identifier> name;
    std::vector<std::shared_ptr<Identifier>> params;
    std::vector<std::shared_ptr<Identifier>> context; // ambient lambdas
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
    bool isEffect; // true if do!
    std::vector<std::shared_ptr<ASTNode>> statements;
};

} // namespace lambdawg
