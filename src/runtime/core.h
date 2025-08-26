#pragma once

struct LLVMVector {
    int* data;
    int length;
    int capacity;
};

// Map and filter
LLVMVector* lambdawg_map(LLVMVector* vec, int (*fn)(int));
LLVMVector* lambdawg_filter(LLVMVector* vec, bool (*pred)(int));

// Console print
void lambdawg_console_print(LLVMVector* vec);
