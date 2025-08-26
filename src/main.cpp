#include "lexer.h"
#include "parser.h"
#include "semantic.h"
#include "codegen.h"

#include <fstream>
#include <iostream>
#include <sstream>
#include <memory>

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <source.ld>\n";
        return 1;
    }

    std::ifstream file(argv[1]);
    if (!file) {
        std::cerr << "Error: Cannot open file " << argv[1] << "\n";
        return 1;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string source = buffer.str();

    // Lexing
    lambdawg::Lexer lexer(source);
    // Parsing
    lambdawg::Parser parser(lexer);
    std::shared_ptr<lambdawg::ASTNode> ast = parser.parse();

    if (!ast) {
        std::cerr << "Parsing failed.\n";
        return 1;
    }

    // Semantic Checking
    lambdawg::SemanticChecker semantic;
    semantic.check(ast);

    // Code Generation
    lambdawg::CodeGen codegen;
    codegen.generate(ast);

    // Dump LLVM IR to stderr
    codegen.dumpModule();

    return 0;
}
