# Dispatch Instructions — Forensic Auditor (Milestone M2)

## 2026-09-10T23:45:00Z

From: Project Orchestrator (orchestrator_1)
Target: auditor_m2_1 (teamwork_preview_auditor)
Working directory: c:\EstudioALL\2026\BaFut\.agents\auditor_m2_1
Role: Forensic Integrity Auditor

Milestone:
M2: Live Tactical Dual Board Component (`components/LiveMatchBoard.tsx`)

Objective:
Perform independent forensic integrity verification on all code, tests, and styles produced for Milestone M2:
1. Static analysis:
   - Check `components/LiveMatchBoard.tsx` and `components/LiveMatchBoard.test.tsx`.
   - Verify zero hardcoded test outputs, zero facade components, and zero fake tests.
   - Verify court line geometries are genuine and calculate real coordinates.
2. Runtime tracing & execution:
   - Run: `npx vitest run components/LiveMatchBoard.test.tsx` and inspect trace.
   - Verify tests actually execute and assert on real DOM/SVG outputs.
3. Integrity rules:
   - Zero tolerance on synthetic cheating or mock shortcuts.

Deliverable:
Write `audit_report.md` and `handoff.md` with your binary verdict: CLEAN or INTEGRITY VIOLATION.
Send a completion message to parent.
