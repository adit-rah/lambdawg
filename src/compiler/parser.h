#pragma once
#include <memory>
#include <vector>

#include "ast.h"
#include "lexer.h"

namespace lambdawg {

class Parser {
   public:
    Parser(Lexer& l) : lexer(l) {}
    std::shared_ptr<ASTNode> parse();

   private:
    Lexer& lexer;
    Token current;

    void advance();

    std::shared_ptr<ASTNode> parseExpression();
    std::shared_ptr<FunctionDecl> parseFunction();
    std::shared_ptr<ASTNode> parseEffectBlock();
    std::shared_ptr<Call> parseCall();
};

}  // namespace lambdawg
