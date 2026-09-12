# Accessibility (a11y) Skill Dump for Worker M2
Loaded from: c:\EstudioALL\2026\BaFut\.agents\skills\accessibility\SKILL.md

Core Methodology:
1. Perceivable: Text alternatives for all icons (aria-hidden="true" on SVGs, semantic text or aria-label), high contrast (>= 4.5:1 text, >= 3:1 UI/focus).
2. Operable: Full keyboard accessibility (Tab, Enter, Space), visible focus rings (focus-visible with --flood #ffd25a), target size >= 44x44px (with concentric transparent hitbox circle r=22).
3. Understandable: Meaningful role="region", aria-label, figcaption narrative descriptions.
4. Robust: role="status" with aria-live="polite" for dynamic state announcements.
