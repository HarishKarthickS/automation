# Runtime API

## `GET /api/v1/runtimes`

Returns runtimes available to authenticated users.

### Response

```json
{
  "items": [
    { "id": "cpp23", "label": "C++23" },
    { "id": "java21", "label": "Java 21" },
    { "id": "python312", "label": "Python 3.12" },
    { "id": "go122", "label": "Go 1.22" },
    { "id": "rust183", "label": "Rust 1.83" },
    { "id": "nodejs20", "label": "Node.js" }
  ]
}
```

## Runtime field in automations/templates

- `runtime` is required on create.
- `runtime` is optional on update.
- Supported values are validated by shared schema enum.

Node.js is available for both new and existing automations. Its persistent ID
remains `nodejs20` for compatibility with saved jobs; execution uses the host's
Node.js executable. See [Node.js runtime](../runtimes/nodejs.md).
