#include "core.h"
#include <iostream>
#include <cstdlib> // for new

LLVMVector* lambdawg_map(LLVMVector* vec, int (*fn)(int)) {
    LLVMVector* result = new LLVMVector;
    result->length = vec->length;
    result->capacity = vec->length;
    result->data = new int[result->length];

    for (int i = 0; i < vec->length; ++i) {
        result->data[i] = fn(vec->data[i]);
    }

    return result;
}

LLVMVector* lambdawg_filter(LLVMVector* vec, bool (*pred)(int)) {
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

void lambdawg_console_print(LLVMVector* vec) {
    for (int i = 0; i < vec->length; ++i) {
        std::cout << vec->data[i] << " ";
    }
    std::cout << std::endl;
}
