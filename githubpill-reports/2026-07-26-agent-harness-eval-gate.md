# GithubPill Report — Agent Harness + Eval Gate

**Verdict: 🟡 Emerging space — concept is being named, OSS is thin & unpolished**

**Sharpened idea:** A system where you author a typed/contractual task spec, an AI coding agent generates code to fulfill it, and a validation pipeline (tests, schema/type checks, LLM-judge, static analysis) automatically gates the output before merge — with a Next.js UI to author specs and inspect run/feedback loops. Node/TS + MCP.

## Candidates (verified this run)

| Repo | Stars | Last push | Overlap |
|------|------:|-----------|---------|
| [najeed/ai-agent-eval-harness](https://github.com/najeed/ai-agent-eval-harness) | 36 | 2026-07-25 | **High concept overlap** — "evaluation and verification harness" for agent workflows. Very new/active. No spec-authoring UI or MCP-native gate-before-merge product yet. |
| [raye-deng/open-code-review](https://github.com/raye-deng/open-code-review) | 29 | 2026-04-16 | Partial — quality gate for AI-generated code (hallucinated imports, stale APIs). It's a *reviewer*, not a spec→generate→gate loop. |

Docs/patterns (not products): agentic-dev.org "Evaluation Harness" handbook, Datadog "harness-first agents", Augment Code "Verifier Agent / pre-merge verification". The *pattern* is now named; polished OSS implementing it end-to-end is not established.

## Your angle (how to stand out)
- **Spec as a typed contract** (tRPC/Zod schema), not a prose prompt — the JD literally asks for "contractual prompts" and "typed API contracts."
- **Gate-before-merge as a hard CI+MCP dual gate** the agent can't bypass.
- **Run-trace UI** (Next.js) showing spec → agent diff → per-check pass/fail → accept/reject.
- This maps 1:1 to the JD bullet "agent harnesses: scaffolding, guardrails, feedback loops."

## Verdict
🟡 — Not novel as a *concept*, but no dominant OSS product owns it. Differentiable and, crucially, it **is the JD**. Strong portfolio pick.
