#include "parser.h"

#include <iostream>

namespace lambdawg {

Parser::Parser(const std::vector<Token>& tokens)
    : tokens(tokens), currentIndex(0) {}

const Token& Parser::peek() const { return tokens.at(currentIndex); }
const Token& Parser::previous() const { return tokens.at(currentIndex - 1); }
const Token& Parser::advance() {
    if (!isAtEnd()) ++currentIndex;
    return previous();
}

bool Parser::isAtEnd() const { return peek().type == TokenType::EOF_TOKEN; }

bool Parser::check(TokenType type) const {
    if (isAtEnd()) return false;
    return peek().type == type;
}

bool Parser::match(std::initializer_list<TokenType> types) {
    for (auto t : types) {
        if (check(t)) {
            advance();
            return true;
        }
    }
    return false;
}

int Parser::getPrecedence(TokenType type) const {
    switch (type) {
        case TokenType::STAR:
        case TokenType::SLASH:
            return 2;
        case TokenType::PLUS:
        case TokenType::MINUS:
            return 1;
        default:
            return 0;
    }
}

Token Parser::consume(TokenType type, const std::string& message) {
    if (check(type)) return advance();
    errorAt(peek(), message);
    std::terminate();  // unreachable, but silences warnings
}

[[noreturn]] void Parser::errorAt(const Token& token,
                                  const std::string& message) {
    std::cerr << "Parse error at line " << token.line << ", column "
              << token.column << ": " << message << std::endl;
    std::terminate();
}

void Parser::synchronize() {
    // Simple panic-mode: skip tokens until we find a likely statement boundary
    while (!isAtEnd()) {
        // if (previous().type == TokenType::SEMICOLON) return;  // if we add
        // semicolons later
        switch (peek().type) {
            case TokenType::LET:
            case TokenType::MODULE:
            case TokenType::IMPORT:
            case TokenType::TYPE:
            case TokenType::MATCH:
                return;
            default:
                break;
        }
        advance();
    }
}

std::shared_ptr<Program> Parser::parseProgram() {
    auto program = std::make_shared<Program>();
    while (!isAtEnd()) {
        auto decl = parseDeclaration();
        if (decl) {
            program->decls.push_back(decl);
        } else {
            synchronize();  // still useful for skipping junk
        }
    }
    return program;
}

ASTNodePtr Parser::parse() {
    auto program = std::make_shared<Program>();
    while (!isAtEnd()) {
        auto decl = parseDeclaration();
        if (decl)
            program->decls.push_back(decl);
        else
            synchronize();  // optional, safe fallback
    }
    return program;
}

ASTNodePtr Parser::parseDeclaration() {
    if (match({TokenType::LET})) return parseLetDeclaration();
    if (match({TokenType::MODULE})) return parseModuleDeclaration();
    if (match({TokenType::IMPORT})) return parseImportDeclaration();
    if (match({TokenType::TYPE})) return parseTypeDeclaration();

    // Fallback: expression as a top-level declaration
    return parseExpression();
}

ASTNodePtr Parser::parseLetDeclaration() {
    // syntax: let <ident> [with <ctx-list>] [: type]? = <expr>
    Token nameTok =
        consume(TokenType::IDENTIFIER, "Expected identifier after 'let'");
    auto fnName = std::make_shared<Identifier>(nameTok.value);

    // optional 'with' for ambient lambdas
    std::vector<std::shared_ptr<Identifier>> context;
    if (match({TokenType::WITH})) {
        context = parseContextList();
    }

    // optional type annotation (skip for now)
    if (check(TokenType::COLON)) {
        advance();
        // consume a type identifier for now
        if (check(TokenType::TYPE_IDENTIFIER) || check(TokenType::IDENTIFIER))
            advance();
    }

    consume(TokenType::EQUAL, "Expected '=' after let declaration");

    // If the right-hand side is a function literal, parse specially
    ASTNodePtr body = parseExpression();

    auto fn = std::make_shared<FunctionDecl>();
    fn->name = fnName;
    fn->context = context;
    fn->body = body;

    return fn;
}

ASTNodePtr Parser::parseModuleDeclaration() {
    // For now, parse 'module' <ident> { ... } or bare block. We'll return a
    // generic ASTNode (Identifier)
    Token nameTok = consume(TokenType::IDENTIFIER, "Expected module name");
    // skip block for now
    if (match({TokenType::LBRACE})) {
        int braceDepth = 1;
        while (braceDepth > 0 && !isAtEnd()) {
            if (match({TokenType::LBRACE}))
                ++braceDepth;
            else if (match({TokenType::RBRACE}))
                --braceDepth;
            else
                advance();
        }
    }
    return std::make_shared<Identifier>(nameTok.value);
}

ASTNodePtr Parser::parseImportDeclaration() {
    // import <ident>
    Token nameTok = consume(TokenType::IDENTIFIER, "Expected import target");
    return std::make_shared<Identifier>(nameTok.value);
}

ASTNodePtr Parser::parseTypeDeclaration() {
    // type <ident> = ... ; for now return identifier
    Token nameTok = consume(TokenType::TYPE_IDENTIFIER, "Expected type name");
    // skip until EQUAL and expression
    if (match({TokenType::EQUAL})) {
        // skip until end of line or next decl
        while (!isAtEnd() && peek().type != TokenType::LET &&
               peek().type != TokenType::MODULE &&
               peek().type != TokenType::TYPE &&
               peek().type != TokenType::IMPORT) {
            advance();
        }
    }
    return std::make_shared<Identifier>(nameTok.value);
}

ASTNodePtr Parser::parseExpression(int precedence) {
    auto left = parsePipeline();  // parse primary/call/pipeline

    while (true) {
        TokenType opType = peek().type;
        int opPrec = getPrecedence(opType);
        if (opPrec < precedence) break;

        Token opToken = advance();  // consume operator
        auto right = parseExpression(opPrec + 1);

        left = std::make_shared<BinaryOp>(opType, left, right);
    }

    return left;
}

ASTNodePtr Parser::parseAssignment() {
    // not implemented yet
    return parseExpression();
}

ASTNodePtr Parser::parsePipeline() {
    auto node = parseCallOrPrimary();
    // pipeline operator is PIPE (for |>)
    while (match({TokenType::PIPE})) {
        auto pipeline = std::make_shared<Pipeline>();
        // left-hand stage(s)
        if (auto existingPipeline = std::dynamic_pointer_cast<Pipeline>(node)) {
            // flatten
            pipeline->stages = existingPipeline->stages;
        } else {
            pipeline->stages.push_back(node);
        }
        // parse right side as a stage (call or function literal)
        auto stage = parseCallOrPrimary();
        pipeline->stages.push_back(stage);
        node = pipeline;
    }
    return node;
}

ASTNodePtr Parser::parseSequenceOrParallel() {
    // not used yet; placeholder for 'seq' or 'parallel' annotations
    return parsePipeline();
}

ASTNodePtr Parser::parseMatchExpression() {
    // TODO: implement full match parsing
    return parseExpression();
}

ASTNodePtr Parser::parseIfExpression() {
    // if <cond> then <expr> else <expr>
    auto cond = parseExpression();
    if (match({TokenType::THEN})) {
        auto thenExpr = parseExpression();
        if (match({TokenType::ELSE})) {
            auto elseExpr = parseExpression();
            // represent as a call: if(cond, then, else) - for now return
            // thenExpr
            return thenExpr;
        }
        return thenExpr;
    }
    return cond;
}

ASTNodePtr Parser::parseFunctionLiteral() {
    // Expect '('
    Token lp = consume(TokenType::LPAREN, "Expected '(' in function literal");

    // Parse parameters
    std::vector<std::shared_ptr<Identifier>> params;
    if (!check(TokenType::RPAREN)) {
        do {
            Token t = consume(TokenType::IDENTIFIER, "Expected parameter name");
            params.push_back(std::make_shared<Identifier>(t.value));
        } while (match({TokenType::COMMA}));
    }
    consume(TokenType::RPAREN, "Expected ')' after parameter list");

    // Expect '=>'
    consume(TokenType::ARROW, "Expected '=>' in function literal");

    // Parse body
    auto body = parseExpression();

    auto fn = std::make_shared<FunctionDecl>();
    fn->params = params;
    fn->body = body;
    return fn;
}


ASTNodePtr Parser::parseCallOrPrimary() {
    auto expr = parsePrimary();

    while (true) {
        if (check(TokenType::LPAREN)) {
            advance(); // consume '('
            std::vector<ASTNodePtr> args;
            if (!check(TokenType::RPAREN)) {
                do { args.push_back(parseExpression()); } while (match({TokenType::COMMA}));
            }
            consume(TokenType::RPAREN, "Expected ')' after arguments");

            auto call = std::make_shared<Call>();
            call->callee = expr;
            call->args = args;
            expr = call;
        } else {
            break;
        }
    }

    return expr;
}


ASTNodePtr Parser::parsePrimary() {
    if (match({TokenType::INT_LITERAL})) {
        Token t = previous();
        auto lit = std::make_shared<Literal>(Literal::LitType::Int, t.value);
        lit->semType = "Int";
        return lit;
    }

    if (match({TokenType::STRING_LITERAL})) {
        Token t = previous();
        auto lit = std::make_shared<Literal>(Literal::LitType::String, t.value);
        lit->semType = "String";
        return lit;
    }

    if (match({TokenType::TRUE, TokenType::FALSE})) {
        Token t = previous();
        auto lit = std::make_shared<Literal>(Literal::LitType::Bool, t.value);
        lit->semType = "Bool";
        return lit;
    }

    if (match({TokenType::IDENTIFIER, TokenType::TYPE_IDENTIFIER})) {
        Token t = previous();
        return std::make_shared<Identifier>(t.value);
    }

    if (match({TokenType::PLACEHOLDER})) {
        return std::make_shared<Placeholder>();
    }

    if (check(TokenType::LPAREN)) {
        // peek ahead to see if this is a function literal
        size_t saved = currentIndex;

        // try to find RPAREN
        size_t look = saved + 1;
        int depth = 1;
        bool looksLikeParams = true;

        while (look < tokens.size() && depth > 0) {
            TokenType t = tokens[look].type;
            if (t == TokenType::LPAREN)
                ++depth;
            else if (t == TokenType::RPAREN)
                --depth;
            ++look;
        }

        if (look < tokens.size() && tokens[look].type == TokenType::ARROW) {
            // It's a function literal
            return parseFunctionLiteral();
        }

        // Otherwise grouped expression
        advance();  // consume '('
        auto expr = parseExpression();
        consume(TokenType::RPAREN, "Expected ')' after expression");
        return expr;
    }

    if (match({TokenType::DO})) {
        auto block = parseEffectBlock();
        block->isEffect = false;
        return block;
    }

    if (match({TokenType::DO_BANG})) {
        auto block = std::make_shared<EffectBlock>();
        block->isEffect = true;
        if (check(TokenType::LBRACE)) {
            block = parseEffectBlock();
        } else {
            block->statements.push_back(parseExpression());
        }
        return block;
    }

    errorAt(peek(), "Expected expression");
}

std::vector<ASTNodePtr> Parser::parseArgumentList() {
    std::vector<ASTNodePtr> args;
    consume(TokenType::LPAREN, "Expected '(' for argument list");
    if (!check(TokenType::RPAREN)) {
        do {
            args.push_back(parseExpression());  // now parseExpression() can
                                                // return Placeholder
        } while (match({TokenType::COMMA}));
    }
    consume(TokenType::RPAREN, "Expected ')' after arguments");
    return args;
}

std::vector<std::shared_ptr<Identifier>> Parser::parseParamList() {
    std::vector<std::shared_ptr<Identifier>> params;
    consume(TokenType::LPAREN, "Expected '(' for parameter list");
    if (!check(TokenType::RPAREN)) {
        do {
            Token t = consume(TokenType::IDENTIFIER, "Expected parameter name");
            params.push_back(std::make_shared<Identifier>(t.value));
        } while (match({TokenType::COMMA}));
    }
    consume(TokenType::RPAREN, "Expected ')' after parameter list");
    return params;
}

std::vector<std::shared_ptr<Identifier>> Parser::parseContextList() {
    // syntax: with a, b, c
    std::vector<std::shared_ptr<Identifier>> ctx;
    do {
        Token t = consume(TokenType::IDENTIFIER, "Expected context identifier");
        ctx.push_back(std::make_shared<Identifier>(t.value));
    } while (match({TokenType::COMMA}));
    return ctx;
}

std::shared_ptr<EffectBlock> Parser::parseEffectBlock() {
    // expect '{' ... '}' after do or do!
    consume(TokenType::LBRACE, "Expected '{' to start effect block");
    auto block = std::make_shared<EffectBlock>();
    while (!check(TokenType::RBRACE) && !isAtEnd()) {
        auto stmt = parseExpression();
        if (stmt) block->statements.push_back(stmt);
        // optional separators allowed (newline / semicolon) - our lexer doesn't
        // emit semicolons currently
    }
    consume(TokenType::RBRACE, "Expected '}' to close effect block");
    return block;
}

std::shared_ptr<Pipeline> Parser::parsePipelineNode() {
    auto p = std::make_shared<Pipeline>();
    // parse one or more stages separated by PIPE
    p->stages.push_back(parseCallOrPrimary());
    while (match({TokenType::PIPE})) {
        p->stages.push_back(parseCallOrPrimary());
    }
    return p;
}

ASTNodePtr Parser::parsePattern() {
    // Placeholder: pattern parsing for match statements
    return parsePrimary();
}

bool Parser::matchKeyword(const std::string& kw) {
    if (check(TokenType::IDENTIFIER) && peek().value == kw) {
        advance();
        return true;
    }
    return false;
}

int Parser::currentLine() const { return peek().line; }
int Parser::currentColumn() const { return peek().column; }

}  // namespace lambdawg
