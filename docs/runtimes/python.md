# Python 3.12 Runtime (`python312`)

## Toolchain

- Interpreter: `python`

## Execution flow

1. Code is written to `automation.py`.
2. Execute: `python automation.py`

## Example

```python
print("hello from Python automation")
```

## Dependencies

- Declare dependencies at the top of code:

```python
# deps: requests==2.32.3, pydantic==2.11.0
```

- Only declared packages are installed before execution.

## Limits and notes

- Execution timeout is enforced.
- Output is truncated at platform output limit.
