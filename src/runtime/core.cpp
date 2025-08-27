#include "core.h"

#include <cstdlib>
#include <iostream>

LLVMVector* lambdawg_runtime_map(LLVMVector* vec, int (*fn)(int)) {
    LLVMVector* result = new LLVMVector;
    result->length = vec->length;
    result->capacity = vec->length;
    result->data = new int[result->length];

    for (int i = 0; i < vec->length; ++i) {
        result->data[i] = fn(vec->data[i]);
    }

    return result;
}

LLVMVector* lambdawg_runtime_filter(LLVMVector* vec, bool (*pred)(int)) {
    int count = 0;
    for (int i = 0; i < vec->length; ++i)
        if (pred(vec->data[i])) count++;

    LLVMVector* result = new LLVMVector;
    result->length = count;
    result->capacity = count;
    result->data = new int[count];

    int idx = 0;
    for (int i = 0; i < vec->length; ++i)
        if (pred(vec->data[i])) result->data[idx++] = vec->data[i];

    return result;
}

void lambdawg_runtime_console_print_vec(LLVMVector* vec) {
    for (int i = 0; i < vec->length; ++i) {
        std::cout << vec->data[i] << " ";
    }
    std::cout << std::endl;
}

void lambdawg_runtime_console_print_str(const char* str) {
    if (str) {
        std::cout << str << std::endl;
    }
}
