# Rust 1.83 Runtime (`rust183`)

Production execution requires an approved account, a configured Docker host and an installed/probed runtime image. The runtime API reports the actual compiler/interpreter version; persistent IDs retain their historical suffixes. Network package installation is disabled in production. Inline dependency examples below apply only to trusted development subprocess mode. See [execution setup](../operations/isolated-execution.md).


## Toolchain

- Compiler: `rustc` (edition 2021)

## Execution flow

1. Code is written to `main.rs`.
2. Compile: `rustc main.rs --edition=2021 -O -o automation.exe`
3. Execute binary: `automation.exe`

## Example

```rust
fn main() {
    println!("hello from Rust automation");
}
```

## Dependencies

- Declare dependencies at the top of code:

```rust
// deps: regex=1.11.1, serde=1.0.218
```

- If deps are declared, runner generates `Cargo.toml` and runs through Cargo.
- Without deps declaration, runner uses single-file `rustc` mode.

## Limits and notes

- Compile + run are covered by timeout.
- Output is capped by platform output limit.
