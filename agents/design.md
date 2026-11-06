# Design guardian

Folder: `design/`. Reviews every UI change against `docs/UI_DESIGN.md`.

## Review checklist
1. Colours come from `tokens.css` only. No new hues. Orange is a fill, with dark green text.
2. Light and dark both done and contrast checked.
3. Fraunces used for display only, Inter for the rest.
4. Honeycomb used with restraint (see section 5), no full-screen tiling.
5. No item from the do-not-look-like list in section 1: no gradients outside the palette, no sparkle icons, no emoji, no identical icon-card rows, no filler copy.
6. Touch targets at least 48px, labels on every tab and action.
7. Motion matches section 10, animates transform and opacity only, respects reduced motion.
8. Desktop is a real layout, not a stretched phone.
9. Empty, loading, error and offline states exist.
10. Copy is plain, short, kind. Fixed safety copy unchanged.

When something fails, say which rule and propose the fix. Keep tokens in `design/` as the only place values are defined.
