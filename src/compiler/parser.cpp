#include "parser.h"

#include <iostream>

namespace lambdawg {

void Parser::advance() { current = lexer.nextToken(); }

// Entry point
std::shared_ptr<ASTNode> Parser::parse() {
    advance();
    return parseFunction();  // for v0, parse one top-level function
}

// Parse function declaration with optional ambient lambdas
std::shared_ptr<FunctionDecl> Parser::parseFunction() {
    if (current.value != "let") {
        std::cerr << "Expected 'let'\n";
        return nullptr;
    }
    advance();  // skip 'let'

    auto name = std::make_shared<Identifier>(current.value);
    advance();

    // Check for 'with' ambient lambdas
    std::vector<std::shared_ptr<Identifier>> context;
    if (current.value == "with") {
        advance();  // skip 'with'
        while (true) {
            context.push_back(std::make_shared<Identifier>(current.value));
            advance();
            if (current.value == ",") {
                advance();
            } else {
                break;
            }
        }
    }

    // Expect '='
    if (current.value != "=") {
        std::cerr << "Expected '='\n";
        return nullptr;
    }
    advance();

    auto body = parseExpression();

    auto fn = std::make_shared<FunctionDecl>();
    fn->name = name;
    fn->context = context;
    fn->body = body;
    return fn;
}

// Parse general expressions (pipeline, literals, calls, effect blocks)
std::shared_ptr<ASTNode> Parser::parseExpression() {
    std::shared_ptr<ASTNode> expr = nullptr;

    // Effect block
    if (current.value == "do" || current.value == "do!") {
        expr = parseEffectBlock();
    }
    // Literal
    else if (current.type == TokenType::IntLiteral ||
             current.type == TokenType::StringLiteral) {
        expr = std::make_shared<Literal>(current.type == TokenType::IntLiteral
                                             ? Literal::Type::Int
                                             : Literal::Type::String,
                                         current.value);
        advance();
    }
    // Identifier or function call
    else if (current.type == TokenType::Identifier) {
        auto id = std::make_shared<Identifier>(current.value);
        advance();
        // function call
        if (current.value == "(") {
            advance();  // skip '('
            std::vector<std::shared_ptr<ASTNode>> args;
            while (current.value != ")") {
                args.push_back(parseExpression());
                if (current.value == ",") advance();
            }
            advance();  // skip ')'
            auto call = std::make_shared<Call>();
            call->callee = id;
            call->args = args;
            expr = call;
        } else {
            expr = id;
        }
    }

    // Check for pipeline
    if (current.value == "|>") {
        auto pipeline = std::make_shared<Pipeline>();
        pipeline->stages.push_back(expr);
        while (current.value == "|>") {
            advance();
            pipeline->stages.push_back(parseExpression());
        }
        expr = pipeline;
    }

    return expr;
}

// Parse effect block
std::shared_ptr<ASTNode> Parser::parseEffectBlock() {
    bool isEffect = (current.value == "do!");
    advance();  // skip do / do!

    if (current.value != "{") {
        std::cerr << "Expected '{' after do/do!\n";
        return nullptr;
    }
    advance();  // skip '{'

    std::vector<std::shared_ptr<ASTNode>> stmts;
    while (current.value != "}") {
        stmts.push_back(parseExpression());
    }
    advance();  // skip '}'

    auto block = std::make_shared<EffectBlock>();
    block->isEffect = isEffect;
    block->statements = stmts;
    return block;
}

}  // namespace lambdawg
