# Accessibility Skill (Local Copy)
Source: c:\EstudioALL\2026\BaFut\.agents\skills\accessibility\SKILL.md

Key rules for WCAG 2.2 AA:
1. Keyboard Accessible (2.1): All functionality keyboard operable. ArrowKeys for roving tabindex/radio groups, Space/Enter activation.
2. Focus Visible (2.4.7) & Focus Not Obscured (2.4.11): Clear outlines (≥3:1 contrast against bg), not covered by sticky headers/footers.
3. Target Size (2.5.8): Minimum 24x24 CSS px target size (44x44 recommended touch).
4. Color Contrast (1.4.3): 4.5:1 minimum for normal text, 3:1 for large text (≥18px or ≥14px bold) and UI components/borders (1.4.11).
5. Non-text Contrast & Don't rely on color alone (1.4.1): Never use color or emojis alone as the only status indicators.
6. Screen Reader & ARIA (4.1.2, 4.1.3): Live regions (aria-live="polite") for dynamic feedback; explicit roles (radiogroup, radio, fieldset, legend).
