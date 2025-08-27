#include "parser.h"
#include <iostream>

namespace lambdawg {

void Parser::advance() { current = lexer.nextToken(); }

std::shared_ptr<ASTNode> Parser::parse() {
    advance();
    return parseFunction();  // for v0, parse one top-level function
}

std::shared_ptr<FunctionDecl> Parser::parseFunction() {
    if (current.value != "let") {
        std::cerr << "Expected 'let'\n";
        return nullptr;
    }
    advance();  // skip 'let'

    auto name = std::make_shared<Identifier>(current.value);
    advance();

    // context after "with"
    std::vector<std::shared_ptr<Identifier>> context;
    if (current.value == "with") {
        advance();
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

std::shared_ptr<ASTNode> Parser::parseExpression() {
    std::shared_ptr<ASTNode> expr = nullptr;

    // effect block
    if (current.value == "do" || current.value == "do!") {
        expr = parseEffectBlock();
    }
    // literal
    else if (current.type == TokenType::IntLiteral ||
             current.type == TokenType::StringLiteral) {
        expr = std::make_shared<Literal>(
            current.type == TokenType::IntLiteral ? Literal::LitType::Int
                                                  : Literal::LitType::String,
            current.value);
        advance();
    }
    // identifier (possibly call)
    else if (current.type == TokenType::Identifier) {
        expr = parseCall();
        if (!expr) {
            expr = std::make_shared<Identifier>(current.value);
            advance();
        }
    }

    // pipeline
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

std::shared_ptr<ASTNode> Parser::parseEffectBlock() {
    bool isEffect = (current.value == "do!");
    advance();  // skip do/do!

    if (current.value != "{") {
        std::cerr << "Expected '{' after do/do!'\n";
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

std::shared_ptr<Call> Parser::parseCall() {
    if (current.type != TokenType::Identifier) return nullptr;

    auto id = std::make_shared<Identifier>(current.value);
    advance();

    if (current.value != "(") {
        return nullptr;  // not a call, just an identifier
    }

    advance();  // skip '('
    std::vector<std::shared_ptr<ASTNode>> args;

    while (current.value != ")") {
        args.push_back(parseExpression());
        if (current.value == ",") {
            advance();
        }
    }
    advance();  // skip ')'

    auto call = std::make_shared<Call>();
    call->callee = id;
    call->args = args;
    return call;
}

}  // namespace lambdawg
