# GithubPill Report — AI Code Review System (MCP-native)

**Verdict: 🔴 Saturated — near-exact OSS + a crowded SaaS lane**

**Sharpened idea:** An MCP-native reviewer that ingests a diff and reviews AI-generated code for correctness/security/altitude, shipped as an MCP server + Next.js review dashboard.

## Candidates (verified this run)

| Repo | Stars | Last push | Overlap |
|------|------:|-----------|---------|
| [raye-deng/open-code-review](https://github.com/raye-deng/open-code-review) | 29 | 2026-04-16 | **Near-exact** — "AI code quality gate for AI-generated code… MCP Server + CLI + CI/CD Action." |
| [praneybehl/code-review-mcp](https://github.com/praneybehl/code-review-mcp) | 33 | 2025-05-16 | High — MCP server for code reviews via OpenAI/Google, for Claude Code/Cursor. |

Plus multiple other MCP review servers (crazyrabbitLTC/mcp-code-review-server) and a heavy **closed-source SaaS lane**: CodeRabbit, Qodo (PR-Agent), Greptile, Graphite Reviewer.

## Verdict
🔴 — The exact "MCP code review" slot is occupied both in OSS and SaaS. Building this reads as "reimplemented CodeRabbit." Skip as a headline project; a *thin reviewer step inside* the harness project is fine.
