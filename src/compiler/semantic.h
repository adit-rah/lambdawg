#pragma once
#include "ast.h"
#include <memory>
#include <vector>
#include <string>
#include <iostream>
#include <unordered_map>

namespace lambdawg {

class SemanticChecker {
public:
    bool check(const std::shared_ptr<ASTNode>& node);

private:
    int errorCount = 0;
    struct Env {
        std::unordered_map<std::string, std::string> vars; // var -> type
        std::unordered_map<std::string, std::string> ambient; // ambient lambdas
        bool inEffect = false; // true if inside do!
    };

    void visit(const std::shared_ptr<ASTNode>& node, Env& env);

    bool inScope(const std::string& name, Env& env);
};

} // namespace lambdawg