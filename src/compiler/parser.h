#pragma once

#include <memory>
#include <optional>
#include <string>
#include <vector>

#include "ast.h"
#include "lexer.h"

namespace lambdawg {
    
class Parser {
   public:
    explicit Parser(const std::vector<Token>& tokens);

    // Parse the full program. Returns a Program AST or throws a
    // fatal parse error.
    std::shared_ptr<Program> parseProgram();

    // convenience: parse and return top-level declarations
    ASTNodePtr parse();

   private:
    const std::vector<Token>& tokens;
    size_t currentIndex;

    // core parsing primitives
    const Token& peek() const;
    const Token& previous() const;
    const Token& advance();
    bool isAtEnd() const;
    bool check(TokenType type) const;
    bool match(std::initializer_list<TokenType> types);
    Token consume(TokenType type, const std::string& message);
    int getPrecedence(TokenType type) const;

    // error handling
    [[noreturn]] void errorAt(const Token& token, const std::string& message);
    void synchronize();

    // high level parsing functions
    ASTNodePtr parseDeclaration();
    ASTNodePtr parseLetDeclaration();
    ASTNodePtr parseModuleDeclaration();
    ASTNodePtr parseImportDeclaration();
    ASTNodePtr parseTypeDeclaration();

    // expressions
    ASTNodePtr parseExpression(int precedence = 0);
    ASTNodePtr parseAssignment();
    ASTNodePtr parsePipeline();
    ASTNodePtr parseSequenceOrParallel();
    ASTNodePtr parseMatchExpression();
    ASTNodePtr parseIfExpression();
    ASTNodePtr parseFunctionLiteral();
    ASTNodePtr parseCallOrPrimary();
    ASTNodePtr parsePrimary();

    // helpers for calls, pipelines and blocks
    std::vector<ASTNodePtr> parseArgumentList();
    std::vector<std::shared_ptr<Identifier>> parseParamList();
    std::vector<std::shared_ptr<Identifier>> parseContextList();
    std::shared_ptr<EffectBlock> parseEffectBlock();
    std::shared_ptr<Pipeline> parsePipelineNode();

    // patterns (for match)
    ASTNodePtr parsePattern();

    // utilities
    bool matchKeyword(const std::string& kw);

    // source position helpers
    int currentLine() const;
    int currentColumn() const;
};

}  // namespace lambdawg
