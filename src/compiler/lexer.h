#pragma once
#include <string>
#include <vector>

namespace lambdawg {

enum class TokenType {
    Identifier,
    Keyword,
    Symbol,
    IntLiteral,
    StringLiteral,
    BoolLiteral,
    EndOfFile
};

struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
};

class Lexer {
   public:
    Lexer(const std::string& src);
    Token nextToken();

   private:
    std::string source;
    size_t pos;
    int line;
    int column;
    char peek();
    char advance();
    void skipWhitespace();
    Token lexIdentifierOrKeyword();
    Token lexNumber();
    Token lexString();
};

}  // namespace lambdawg
