# Dispatch Instructions — Forensic Auditor (Milestone M1)

## 2026-09-10T23:22:00Z

From: Project Orchestrator (orchestrator_1)
Target: auditor_m1_1 (teamwork_preview_auditor)
Working directory: c:\EstudioALL\2026\BaFut\.agents\auditor_m1_1
Role: Forensic Integrity Auditor

Milestone:
M1: Domain Logic, Atomic Payload Builder & Server Action Remediation

Objective:
Perform independent forensic integrity verification on all code, tests, and modifications produced by Worker M1.

Audit Scope:
1. Static analysis & code inspection:
   - Check `lib/match-intent-payload.ts`, `lib/match-intent-payload.test.ts`, and `app/actions.ts`.
   - Verify there are NO hardcoded test results, fake returns, facade functions, or mock bypasses.
   - Verify that all logic actually validates the data and performs real computation.
2. Runtime tracing & execution:
   - Verify tests actually execute the code paths and assert on real outputs.
   - Run: `npx vitest run lib/match-intent-payload.test.ts` and inspect execution trace.
3. Integrity rules verification:
   - ZERO TOLERANCE on cheating or synthetic pass-throughs.
   - Any cheat or dummy implementation = INTEGRITY VIOLATION.

Deliverable:
Write `audit_report.md` and `handoff.md` with your binary verdict: CLEAN or INTEGRITY VIOLATION.
Send a completion message to parent.

## 2026-09-10T23:30:31Z

From: Parent (d4c119cc-b9a6-4d68-81b6-7a770dc4f2e3)
Context: Milestone M1 Forensic Integrity Audit
Content: Checking status on Phase 1-4 audit. Both reviewers and both challengers have reported APPROVE. Are you awaiting any subagents or ready to compile audit_report.md and handoff.md?
Action: Please report current status and progress.

