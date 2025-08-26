#include "lexer.h"

#include <cctype>

namespace lambdawg {

Lexer::Lexer(const std::string& src)
    : source(src), pos(0), line(1), column(1) {}

char Lexer::peek() { return pos < source.size() ? source[pos] : '\0'; }

char Lexer::advance() {
    char c = peek();
    pos++;
    column++;
    if (c == '\n') {
        line++;
        column = 1;
    }
    return c;
}

void Lexer::skipWhitespace() {
    while (isspace(peek())) advance();
}

Token Lexer::lexIdentifierOrKeyword() {
    std::string val;
    while (isalnum(peek()) || peek() == '_') val += advance();
    return {TokenType::Identifier, val, line, column};
}

Token Lexer::lexNumber() {
    std::string val;
    while (isdigit(peek())) val += advance();
    return {TokenType::IntLiteral, val, line, column};
}

Token Lexer::lexString() {
    advance();  // skip opening quote
    std::string val;
    while (peek() != '"' && peek() != '\0') val += advance();
    advance();  // skip closing quote
    return {TokenType::StringLiteral, val, line, column};
}

Token Lexer::nextToken() {
    skipWhitespace();
    char c = peek();
    if (c == '\0') return {TokenType::EndOfFile, "", line, column};
    if (isalpha(c) || c == '_') return lexIdentifierOrKeyword();
    if (isdigit(c)) return lexNumber();
    if (c == '"') return lexString();
    // Handle symbols
    advance();
    return {TokenType::Symbol, std::string(1, c), line, column};
}

}  // namespace lambdawg
