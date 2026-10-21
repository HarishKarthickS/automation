# C++23 Runtime (`cpp23`)

Production execution requires an approved account, a configured Docker host and an installed/probed runtime image. The runtime API reports the actual compiler/interpreter version; persistent IDs retain their historical suffixes. Network package installation is disabled in production. Inline dependency examples below apply only to trusted development subprocess mode. See [execution setup](../operations/isolated-execution.md).


## Toolchain

- Compiler: `g++`
- Standard: `-std=c++23`

## Execution flow

1. Code is written to `main.cpp`.
2. Compile: `g++ -std=c++23 main.cpp -O2 -o automation_cpp.exe`
3. Execute binary: `automation_cpp.exe`

## Example

```cpp
#include <iostream>
int main() {
  std::cout << "hello from C++ automation" << std::endl;
  return 0;
}
```

## Limits and notes

- Compile time counts toward run timeout.
- Stdout/stderr are truncated at platform output limit.
- External native libs are not installed automatically in V1.
