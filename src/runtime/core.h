#pragma once

struct LLVMVector {
    int* data;
    int length;
    int capacity;
};

extern "C" {
LLVMVector* lambdawg_runtime_map(LLVMVector* vec, int (*fn)(int));
LLVMVector* lambdawg_runtime_filter(LLVMVector* vec, bool (*pred)(int));
void lambdawg_runtime_console_print_vec(LLVMVector* vec);
void lambdawg_runtime_console_print_str(const char* str);
}
