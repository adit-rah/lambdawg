#include "semantic.h"

namespace lambdawg {

void SemanticChecker::check(const std::shared_ptr<ASTNode>& node) {
    Env env;
    visit(node, env);
}

void SemanticChecker::visit(const std::shared_ptr<ASTNode>& node, Env& env) {
    if (!node) return;

    if (auto fn = std::dynamic_pointer_cast<FunctionDecl>(node)) {
        Env fnEnv = env;

        // Add function parameters to scope
        for (auto& p : fn->params) fnEnv.vars[p->name] = "Unknown";

        // Add ambient lambdas
        for (auto& a : fn->context) fnEnv.ambient[a->name] = "Ambient";

        visit(fn->body, fnEnv);

        // Function is pure if body is pure
        fn->isPure = fn->body->isPure;
    } else if (auto call = std::dynamic_pointer_cast<Call>(node)) {
        auto id = std::dynamic_pointer_cast<Identifier>(call->callee);
        if (id) {
            if (!inScope(id->name, env)) {
                std::cerr << "Semantic Error: '" << id->name
                          << "' not in scope\n";
            }
        }

        // Visit arguments
        bool pure = true;
        for (auto& arg : call->args) {
            visit(arg, env);
            pure &= arg->isPure;
        }

        // If calling an effectful function inside effect context
        if (env.inEffect)
            call->isPure = false;
        else
            call->isPure = pure;
    } else if (auto pipeline = std::dynamic_pointer_cast<Pipeline>(node)) {
        bool pure = true;
        for (auto& stage : pipeline->stages) {
            visit(stage, env);
            if (!stage->isPure) pure = false;
        }
        pipeline->isPure = pure;
        if (!pure) {
            std::cerr << "Warning: pipeline contains effectful stages\n";
        }
    } else if (auto block = std::dynamic_pointer_cast<EffectBlock>(node)) {
        Env blockEnv = env;
        if (block->isEffect) blockEnv.inEffect = true;
        bool pure = true;
        for (auto& stmt : block->statements) {
            visit(stmt, blockEnv);
            if (!stmt->isPure) pure = false;
        }
        block->isPure = !block->isEffect && pure;
    } else if (auto lit = std::dynamic_pointer_cast<Literal>(node)) {
        lit->isPure = true;
        if (lit->type == Literal::Type::Int)
            lit->semType = "Int";
        else if (lit->type == Literal::Type::String)
            lit->semType = "String";
        else if (lit->type == Literal::Type::Bool)
            lit->semType = "Bool";
    } else if (auto id = std::dynamic_pointer_cast<Identifier>(node)) {
        if (!inScope(id->name, env)) {
            std::cerr << "Semantic Error: identifier '" << id->name
                      << "' not in scope\n";
        }
        id->isPure = true;  // just referring is pure
    }
}

bool SemanticChecker::inScope(const std::string& name, Env& env) {
    if (env.vars.find(name) != env.vars.end()) return true;
    if (env.ambient.find(name) != env.ambient.end()) return true;
    return false;
}

}  // namespace lambdawg