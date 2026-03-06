# Dependency Policy

Dependency installation must be minimal and controlled.

## Principles

- Install only what is required for the run.
- Prefer explicit manifests over implicit inference.
- Enforce package source controls and version pinning.
- Block unsupported native/system package installs by default.

## Operational controls

- Max dependency count per run.
- Max download size cap.
- Separate dependency install timeout.
- Audit log of installed package set.
