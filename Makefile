CXX = g++
CXXFLAGS = -std=c++17 -I./src -I./src/compiler -I./src/runtime `llvm-config --cxxflags`
LDFLAGS = `llvm-config --ldflags --libs core orcjit native nativecodegen` -lpthread

SRC = $(wildcard src/compiler/*.cpp) $(wildcard src/runtime/*.cpp) src/main.cpp
OBJ = $(SRC:.cpp=.o)
TARGET = lambdawg

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJ) $(TARGET)
