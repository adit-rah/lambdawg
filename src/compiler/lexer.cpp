#include "lexer.h"

#include <cctype>

namespace lambdawg {

Lexer::Lexer(const std::string& src) : src(src), pos(0), line(1), col(1) {}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    while (!isAtEnd()) {
        skipWhitespaceAndComments();
        if (isAtEnd()) break;
        tokens.push_back(nextToken());
    }
    tokens.push_back(makeToken(TokenType::EOF_TOKEN, ""));
    return tokens;
}

bool Lexer::isAtEnd() const { return pos >= src.size(); }
char Lexer::peek() const { return isAtEnd() ? '\0' : src[pos]; }
char Lexer::advance() {
    char c = peek();
    pos++;
    col++;
    return c;
}
bool Lexer::match(char expected) {
    if (isAtEnd() || src[pos] != expected) return false;
    pos++;
    col++;
    return true;
}

Token Lexer::makeToken(TokenType type, const std::string& lexeme) {
    return {type, lexeme, line, col - (int)lexeme.size()};
}

void Lexer::skipWhitespaceAndComments() {
    while (!isAtEnd()) {
        char c = peek();
        if (isspace(c)) {
            if (c == '\n') {
                line++;
                col = 1;
            }
            advance();
        } else if (c == '-' && pos + 1 < src.size() && src[pos + 1] == '-') {
            while (!isAtEnd() && peek() != '\n')
                advance();  // single-line comment
        } else if (c == '{' && pos + 1 < src.size() && src[pos + 1] == '-') {
            advance();
            advance();  // consume "{-"
            while (!(peek() == '-' && pos + 1 < src.size() &&
                     src[pos + 1] == '}') &&
                   !isAtEnd()) {
                if (peek() == '\n') {
                    line++;
                    col = 1;
                }
                advance();
            }
            if (!isAtEnd()) {
                advance();
                advance();
            }  // consume "-}"
        } else
            break;
    }
}

Token Lexer::nextToken() {
    char c = advance();

    // Identifiers & keywords
    if (isalpha(c)) {
        std::string lex(1, c);
        while (isalnum(peek()) || peek() == '_') lex += advance();
        if (keywords.count(lex)) return makeToken(keywords.at(lex), lex);
        if (isupper(lex[0])) return makeToken(TokenType::TYPE_IDENTIFIER, lex);
        return makeToken(TokenType::IDENTIFIER, lex);
    }

    // Numbers
    if (isdigit(c)) {
        std::string lex(1, c);
        while (isdigit(peek())) lex += advance();
        return makeToken(TokenType::INT_LITERAL, lex);
    }

    // Strings
    if (c == '"') {
        std::string lex;
        while (!isAtEnd() && peek() != '"') {
            if (peek() == '\n') {
                line++;
                col = 1;
            }
            lex += advance();
        }
        if (!isAtEnd()) advance();  // closing quote
        return makeToken(TokenType::STRING_LITERAL, lex);
    }

    // Multi-char operators
    if (c == '=' && match('>')) return makeToken(TokenType::ARROW, "=>");
    if (c == '|' && match('>')) return makeToken(TokenType::PIPE, "|>");

    // Single-char tokens
    switch (c) {
        case ':':
            return makeToken(TokenType::COLON, ":");
        case ',':
            return makeToken(TokenType::COMMA, ",");
        case '.':
            return makeToken(TokenType::DOT, ".");
        case '=':
            return makeToken(TokenType::EQUAL, "=");
        case '{':
            return makeToken(TokenType::LBRACE, "{");
        case '}':
            return makeToken(TokenType::RBRACE, "}");
        case '[':
            return makeToken(TokenType::LBRACKET, "[");
        case ']':
            return makeToken(TokenType::RBRACKET, "]");
        case '(':
            return makeToken(TokenType::LPAREN, "(");
        case ')':
            return makeToken(TokenType::RPAREN, ")");
        case '|':
            return makeToken(TokenType::BAR, "|");
        case '+':
            return makeToken(TokenType::PLUS, "+");
        case '-':
            return makeToken(TokenType::MINUS, "-");
        case '*':
            return makeToken(TokenType::STAR, "*");
        case '/':
            return makeToken(TokenType::SLASH, "/");
    }

    return makeToken(TokenType::UNKNOWN, std::string(1, c));
}

}  // namespace lambdawg
