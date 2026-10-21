# Job dependency policy

Production Docker jobs have no network access. Dependencies must be included in reviewed runtime images before deployment; inline install declarations are rejected. Runtime probes establish which images are available. Keep image digests in release records and update them through reviewed builds.

Development subprocess mode accepts inline Python, Go and Rust dependency declarations. It bounds declaration count/size and installation time. `DEPENDENCY_ALLOWLIST_MODE=strict` requires configured package allowlists; relaxed mode accepts arbitrary packages and is intended only for code you trust. Python packages install into the job directory. There is no claimed download-size enforcement or automatic package audit log.

Application dependencies are managed with pnpm and reviewed separately from job dependencies. CI and Dependabot monitor application advisories; reachability and deployment conditions must be documented for exceptions.
