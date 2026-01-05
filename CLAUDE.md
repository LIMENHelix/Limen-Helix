# LIMEN Helix — Project Operating Rules for Claude

## Prime Directive
Build LIMENhelix.com as a "Living Threshold Intelligence":
- The site renders as incomplete/latent at first.
- Within seconds it infers a **cognitive signature** from interaction-only signals (no cookies, no login).
- The UI and content **phase-shift** in real time based on that signature.
- The system is not "personalized preferences"; it adapts to **how the user thinks**.

## Non-Negotiables
- No identity inference. No fingerprinting. No cross-site tracking.
- No cookies/localStorage for tracking. Session-only memory allowed in RAM.
- All inference must be explainable and bounded. Prefer simple features + transparent mapping.
- Degrade gracefully: if JS disabled,er, render a minimal static experience.

## Experience Requirements
1. **Latent Start**
   - Initial view shows fragments, partial diagrams, and a “never fully resolved” loading state.
2. **Phase Shift**
   - 3–7s after first interaction, adapt:
     - semantic density (simple ↔ dense)
     - navigation topology (linear ↔ graph)
     - layout density (spacious ↔ compact)
     - motif (technical ↔ symbolic ↔ narrative)
3. **Threshold Moment**
   - At least one moment where the user senses observation of attention:
     - short line, no CTA, no explanation.

## Cognitive Signature Model (MVP)
Compute a rolling vector C from:
- scroll velocity + variability
- cursor jitter + hesitation (pauses before clicks)
- time-to-first-action
- interaction entropy (diversity of actions)
- dwell time by region
Map C into 4 archetypes:
- Analyst, Engineer, Philosopher, Artist
Each archetype has:
- content manifold selection rules
- UI density rules
- navigation rules

## Architecture Constraints
- Implement as a small "cognition engine" module that emits:
  - `signature` (vector)
  - `archetype` (label)
  - `phase` (0..1)
- Rendering layer subscribes to these outputs.
- Keep it deterministic, testable, and easy to audit.

## Testing
- Unit tests for feature extraction (scroll, mouse, dwell).
- Property-based tests for stability (small perturbations should not wildly flip archetype).
- E2E test: verify phase shift happens without errors and remains within bounds.

## Output Standards
When proposing changes, always provide:
- file list + diffs (or patch blocks)
- rationale tied to Prime Directive
- privacy implications (explicit)