# GithubPill Deep-Search — Refactor-Safety Characterization Harness (N2)

**Verdict: 🟢 Emptiest lane** — the *practice* is documented, no OSS *product* exists.

**Sharpened idea:** Before an agent refactors, auto-generate **characterization / golden-master tests** that pin current behavior; the gate = behavior-preserved (tests still green post-refactor). "Refactor without fear."

## Cloned & inspected

| Repo | Stars | Last push | Finding |
|------|------:|-----------|---------|
| [gsantopaolo/reforge-ai](https://github.com/gsantopaolo/reforge-ai) | 3 | 2025-05-28 | Personal app-modernization codegen experiment + dev scratch notes. **No characterization-test generation** — grep for `characteriz\|golden master\|approval test\|pinning` hit only KB prose, not a feature. |
| [darrenhinde/OpenAgentsControl](https://github.com/darrenhinde/OpenAgentsControl) | 4631 | 2026-07-21 | General plan-first agent framework with approval gates. Not refactor-specific; no characterization tests. |

Practice is well-documented (Augment/ModLogix guides on "write characterization tests before AI refactors") — that's credibility, not a competing product.

## Your angle
- **Auto-generate the characterization suite** (the manual step everyone says to do) + enforce it as the refactor gate. Nobody productizes this.
- Combine with N1: verify the pinned tests are *real* via a mutation check before trusting them to guard the refactor.

## Verdict
🟢 — Even emptier than N1. Strong solo-buildable, differentiated portfolio piece.
