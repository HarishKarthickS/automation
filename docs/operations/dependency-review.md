# Dependency security review — 21 October 2026

The original production audit reported 162 findings across 155 advisory records. The updated lockfile reports **zero advisories** in both `pnpm audit --prod --json` and the full `pnpm audit --json` snapshot. This is a package-registry advisory result, not a guarantee that all application or container vulnerabilities are absent.

Updates include Better Auth 1.7.12, Fastify 5.12.7, Next.js 16.4.2, React 19.3.1, Drizzle ORM 0.45.4, Nodemailer 10.1.7, cron-parser 5.10.2 and Vitest 5.0.5. Compatible direct/transitive packages were refreshed too. The unused frontend Better Auth package and stale npm lockfiles were removed; pnpm is the sole package manager. Optional peers are not silently installed. Required development peers such as Vite are explicit.

Next.js uses the `proxy.ts` convention and standalone ESLint. Tailwind uses its v4 PostCSS plugin; the original visual design is retained and checked in browser CI. cron-parser uses its current parser API. Better Auth custom privilege fields remain server-controlled, with PostgreSQL-backed signup/login/session tests and a real Fastify HTTP cookie roundtrip. Existing session schema is retained. Review the [Next.js migration guide](https://nextjs.org/docs/app/guides/upgrading/version-16) and [Better Auth database contract](https://better-auth.com/docs/concepts/database) when making further upgrades.

The root esbuild override removes a vulnerable old development loader dependency; keep the override until its parent no longer requires the old range. Runtime images are pinned by manifest digest in the runner and CI matrix, so verification uses the same image content as deployment. Image OS/toolchain advisories are a separate maintenance responsibility from npm audits.

No advisory IDs are suppressed. CI rejects high/critical findings in the full dependency graph. Dependabot checks npm and GitHub Actions updates weekly. For a future advisory with no patch, record the dependency path, reachable feature, mitigation, owner and a dated review deadline before proposing any exception; do not describe an unused plugin advisory as a confirmed production exploit.
