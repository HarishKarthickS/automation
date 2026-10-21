# Focused review history

These PRs build on one another. Review and merge in this order, retargeting the
next PR to `main` after its parent merges (or allow GitHub to retarget it):

1. [Auth and CSRF flow](https://github.com/HarishKarthickS/automation/pull/1): session guards, token issuance and path-boundary fixes.
2. [Scheduler queue fallback](https://github.com/HarishKarthickS/automation/pull/2): Redis success, async fallback and fallback failure tests.
3. [Executor controls](https://github.com/HarishKarthickS/automation/pull/3): runtime validation, actual subprocess tests and honest execution limits.
4. [Secrets and CI](https://github.com/HarishKarthickS/automation/pull/4): route ownership/metadata tests and automated API checks.
5. Product/demo docs: consistent personal-workspace copy, screenshots and endpoint reference.

Use focused module commits and PRs for future work too. The pre-existing history
contains broad implementation commits; these are retained without fabricating an
alternate development timeline.
