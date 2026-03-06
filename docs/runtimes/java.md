# Java 21 Runtime (`java21`)

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
