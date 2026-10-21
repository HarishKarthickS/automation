# Java 21 Runtime (`java21`)

Production execution requires an approved account, a configured Docker host and an installed/probed runtime image. The runtime API reports the actual compiler/interpreter version; persistent IDs retain their historical suffixes. Network package installation is disabled in production. Inline dependency examples below apply only to trusted development subprocess mode. See [execution setup](../operations/isolated-execution.md).


## Toolchain

- Compiler: `javac`
- Runtime: `java`

## Execution flow

1. Code is written to `Main.java`.
2. Compile: `javac Main.java`
3. Execute: `java -cp <workspace> Main`

## Example

```java
public class Main {
  public static void main(String[] args) {
    System.out.println("hello from Java automation");
  }
}
```

## Limits and notes

- Main class must be named `Main`.
- Compile + run duration is bounded by timeout.
- Output is capped by platform output limit.
