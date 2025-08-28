#pragma once
#include <string>
#include <unordered_map>
#include <vector>

namespace lambdawg {

enum class TokenType {
    // Keywords
    LET,
    MODULE,
    IMPORT,
    TYPE,
    MATCH,
    WITH,
    DO,
    DO_BANG,
    SEQ,
    PARALLEL,
    TRUE,
    FALSE,
    ERROR,
    OK,
    IF,
    THEN,
    ELSE,

    // Identifiers
    IDENTIFIER,       // foo, bar
    TYPE_IDENTIFIER,  // Int, String, Result

    // Literals
    INT_LITERAL,
    STRING_LITERAL,
    BOOL_LITERAL,

    // Operators & Special Symbols
    ARROW,     // =>
    PIPE,      // |>
    COLON,     // :
    COMMA,     // ,
    DOT,       // .
    EQUAL,     // =
    LBRACE,    // {
    RBRACE,    // }
    LBRACKET,  // [
    RBRACKET,  // ]
    LPAREN,    // (
    RPAREN,    // )
    BAR,       // |
    PLUS,
    MINUS,
    STAR,
    SLASH,  // + - * /

    // Other
    COMMENT,  // -- or {- -}
    EOF_TOKEN,
    UNKNOWN
};

static const std::unordered_map<std::string, TokenType> keywords = {
    {"let", TokenType::LET},       {"module", TokenType::MODULE},
    {"import", TokenType::IMPORT}, {"type", TokenType::TYPE},
    {"match", TokenType::MATCH},   {"with", TokenType::WITH},
    {"do", TokenType::DO},         {"do!", TokenType::DO_BANG},
    {"seq", TokenType::SEQ},       {"parallel", TokenType::PARALLEL},
    {"true", TokenType::TRUE},     {"false", TokenType::FALSE},
    {"Ok", TokenType::OK},         {"Error", TokenType::ERROR},
    {"if", TokenType::IF},         {"then", TokenType::THEN},
    {"else", TokenType::ELSE}};

struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
};

class Lexer {
   public:
    explicit Lexer(const std::string& src);
    std::vector<Token> tokenize();

   private:
    std::string src;
    size_t pos;
    int line, col;

    bool isAtEnd() const;
    char peek() const;
    char advance();
    bool match(char expected);

    Token makeToken(TokenType type, const std::string& lexeme);
    void skipWhitespaceAndComments();
    Token nextToken();
};

}  // namespace lambdawg
