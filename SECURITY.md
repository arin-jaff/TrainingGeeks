# Security Policy

TrainingGeeks is designed to be self-hosted and to keep your data on your own
machine. Still, security issues happen — thank you for reporting them
responsibly.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report privately using GitHub's
[Report a vulnerability](https://github.com/arin-jaff/TrainingGeeks/security/advisories/new)
flow (Security tab → Advisories). This keeps the details private until a fix is
available.

Include, where possible:

- A description of the issue and its impact.
- Steps to reproduce or a proof of concept.
- The affected version/commit and your environment.

You can expect an initial acknowledgement within a few days. Once confirmed, a
fix will be prepared and a coordinated disclosure agreed.

## Scope notes

TrainingGeeks runs as a single-user app. Common things worth reporting:

- Authentication or session bypass (the `TG_PASSWORD` / session-cookie flow).
- Read-only/demo mode failing to block writes (`TG_READONLY`).
- The sync bearer token (`TG_SYNC_TOKEN`) being bypassable.
- Path traversal, SSRF, or injection in the FIT/connector pipeline.

Self-hosting hardening (TLS, reverse proxy, OS patching) is the operator's
responsibility, but documentation gaps that lead to insecure defaults are fair
game to report.
