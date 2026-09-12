# Dispatch Instructions

## 2026-09-10T23:08:00Z

From: Project Orchestrator (orchestrator_1)
Target: spec_miner_survey_3 (teamwork_preview_spec_miner)
Working directory: c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3
Role: Specification, WCAG 2.2 AA & Acceptance Criteria Miner

Objective:
Mine and document all precise requirements, edge cases, accessibility standards (WCAG 2.2 AA), and sports format rules required by ORIGINAL_REQUEST.md and the existing application contracts.

Scope:
- Enumerate every feature and invariant required across R1 (Intent-driven UI), R2 (Live Match Board), R3 (Payload & DB Integrity), and R4 (Accessibility WCAG 2.2 AA).
- Define the exact keyboard navigation requirements (radiogroup/radio arrow keys, Enter, Space, tab order, focus visible).
- Define ARIA roles, states, live regions (`aria-live="polite"`), and screen reader announcement sequences for intent changes and slot additions/removals.
- Define color contrast and visual requirements (minimum 4.5:1 text/background, non-reliance on emojis, SVG icons).
- Map all sports formats (fútbol 5v5/7v7/8v8/11v11, vóley 6v6, etc.) and calculate `playersPerSideFromFormat` for each intent.
- Formulate acceptance test cases and boundary conditions (Tier 1-4) to provide the basis for the E2E testing track.

Read:
- c:\EstudioALL\2026\BaFut\.agents\ORIGINAL_REQUEST.md

Deliverable:
Write a rigorous specification and requirements matrix to c:\EstudioALL\2026\BaFut\.agents\spec_miner_survey_3\spec_report.md and a handoff.md in your working directory.
Send a message to parent when done.
