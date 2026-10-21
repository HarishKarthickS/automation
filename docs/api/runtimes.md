# Runtime API

Authenticated `GET /api/v1/runtimes` returns `{ items, mode, message }`. Each available item includes its persistent `id`, display `label`, actual probed `version`, and Docker `image` when applicable. Missing executables/images and disabled runtimes are omitted. A disabled deployment returns an empty list with an explanatory message.

Runtime IDs remain `nodejs20`, `python312`, `cpp23`, `java21`, `go122` and `rust183` for saved-job compatibility. An ID's historical suffix is not a substitute for the actual version returned by the host/image probe. The editor consumes this endpoint and keeps the configured runtime of existing jobs readable during outages. Draft creation is permitted while execution is unavailable; trigger/admission requires actual capability and account approval.
