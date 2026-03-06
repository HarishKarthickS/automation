# Go 1.22 Runtime (`go122`)

## Toolchain

- Command: `go run`

## Execution flow

1. Code is written to `main.go`.
2. Execute: `go run main.go`

## Example

```go
package main

import "fmt"

func main() {
  fmt.Println("hello from Go automation")
}
```

## Dependencies

- Declare dependencies at the top of code:

```go
// deps: github.com/google/uuid@v1.6.0
```

- Runner installs only declared modules before execution.

## Limits and notes

- Build time counts toward timeout.
- Output is subject to platform cap.
