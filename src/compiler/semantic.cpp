#include "semantic.h"

namespace lambdawg {

bool SemanticChecker::check(const std::shared_ptr<ASTNode>& node) {
    Env env;
    visit(node, env);
    if (errorCount > 0) {
        std::cerr << "SemanticChecker: " << errorCount << " error(s) found\n";
    }
    return errorCount == 0;
}

void SemanticChecker::visit(const std::shared_ptr<ASTNode>& node, Env& env) {
    if (!node) {
        std::cerr << "Semantic Checker: visited nullptr node\n";
        ++errorCount;
        return;
    }

    if (auto fn = std::dynamic_pointer_cast<FunctionDecl>(node)) {
        Env fnEnv = env;
        for (auto& p : fn->params) {
            if (p)
                fnEnv.vars[p->name] = "Unknown";
            else {
                std::cerr << "Semantic Error: function has null parameter\n";
                ++errorCount;
            }
        }
        for (auto& a : fn->context) {
            if (a)
                fnEnv.ambient[a->name] = "Ambient";
            else {
                std::cerr
                    << "Semantic Warning: null ambient in function context\n";
                ++errorCount;
            }
        }
        if (fn->body) {
            visit(fn->body, fnEnv);
            fn->isPure = fn->body->isPure;
        } else {
            std::cerr << "Semantic Error: function body is null\n";
            ++errorCount;
            fn->isPure = true;
        }
        return;
    }

    if (auto call = std::dynamic_pointer_cast<Call>(node)) {
        if (!call->callee) {
            std::cerr << "Semantic Error: call has null callee\n";
            ++errorCount;
        } else {
            if (auto id = std::dynamic_pointer_cast<Identifier>(call->callee)) {
                if (!inScope(id->name, env)) {
                    std::cerr << "Semantic Error: '" << id->name
                              << "' not in scope\n";
                    ++errorCount;
                }
            } else {
                visit(call->callee, env);
            }
        }

        bool pure = true;
        for (auto& arg : call->args) {
            if (!arg) {
                std::cerr << "Semantic Error: call contains null argument\n";
                ++errorCount;
                pure = false;
                continue;
            }
            visit(arg, env);
            pure &= arg->isPure;
        }

        call->isPure = env.inEffect ? false : pure;
        return;
    }

    if (auto pipeline = std::dynamic_pointer_cast<Pipeline>(node)) {
        bool pure = true;
        for (auto& stage : pipeline->stages) {
            if (!stage) {
                std::cerr << "Semantic Error: pipeline contains null stage\n";
                ++errorCount;
                pure = false;
                continue;
            }
            visit(stage, env);
            if (!stage->isPure) pure = false;
        }
        pipeline->isPure = pure;
        if (!pure) {
            std::cerr << "Warning: pipeline contains effectful stages\n";
        }
        return;
    }

    if (auto block = std::dynamic_pointer_cast<EffectBlock>(node)) {
        Env blockEnv = env;
        if (block->isEffect) blockEnv.inEffect = true;
        bool pure = true;
        for (auto& stmt : block->statements) {
            if (!stmt) {
                std::cerr
                    << "Semantic Error: effect block contains null statement\n";
                ++errorCount;
                pure = false;
                continue;
            }
            visit(stmt, blockEnv);
            if (!stmt->isPure) pure = false;
        }
        block->isPure = !block->isEffect && pure;
        return;
    }

    if (auto lit = std::dynamic_pointer_cast<Literal>(node)) {
        lit->isPure = true;
        if (lit->litType == Literal::LitType::Int) {
            lit->semType = "Int";
            lit->type = "Int";
        } else if (lit->litType == Literal::LitType::String) {
            lit->semType = "String";
            lit->type = "String";
        } else if (lit->litType == Literal::LitType::Bool) {
            lit->semType = "Bool";
            lit->type = "Bool";
        }
        return;
    }

    if (auto id = std::dynamic_pointer_cast<Identifier>(node)) {
        if (!inScope(id->name, env)) {
            std::cerr << "Semantic Error: identifier '" << id->name
                      << "' not in scope\n";
            ++errorCount;
        }
        id->isPure = true;
        return;
    }

    std::cerr << "Semantic Warning: unhandled AST node type\n";
}

bool SemanticChecker::inScope(const std::string& name, Env& env) {
    if (env.vars.find(name) != env.vars.end()) return true;
    if (env.ambient.find(name) != env.ambient.end()) return true;
    return false;
}

}  // namespace lambdawg