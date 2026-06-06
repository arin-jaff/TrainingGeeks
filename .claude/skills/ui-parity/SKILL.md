---
name: ui-parity
description: Check every TrainingGeeks UI feature against the TrainingPeaks reference screenshots in references/ for visual and behavioral parity. Use when building or changing any screen, component, layout, color, or label.
---

# UI Parity with TrainingPeaks

`references/` is the source of truth for how TrainingGeeks looks and behaves. The goal is a
1-to-1 TrainingPeaks feel: clean, sharp, data-dense, **no emojis**, plain clear text.

## Workflow for any UI work

1. **Open the relevant reference(s) before building.** Identify which screenshot covers the
   feature and read the actual layout, wording, colors, ordering, and interactions.

   All UI screenshots live in `references/tp-ui/`:

   | Screen | Reference file(s) |
   |---|---|
   | Home | `tp-ui/BAFFAF1E-...png` |
   | Calendar | `tp-ui/5F550EB3-...png` |
   | Dashboard / Charts Library | `tp-ui/D230C5B7-...png`, `tp-ui/133F68FB-...png`, `tp-ui/1A5FFA9D-...png` |
   | Workout / Analyze | `tp-ui/image copy 2.png` |
   | Peak Performances modal | `tp-ui/image.png`, `tp-ui/image copy.png` |
   | Account Settings / Zones | `tp-ui/78ACC3F9-...png`, `tp-ui/AB86A637-...png`, `tp-ui/89E7ED36-...png` |

2. **Match the details:** three-column Home layout; Fatigue/Fitness/Form boxes (red / dark /
   orange); weekly calendar grid + Summary column with sport-colored cards; planned-vs-actual;
   navy top nav with Home/Calendar/Dashboard/ATP; blue (`#2563EB`-family) accents on a light
   surface.

3. **While building, compare back to the screenshot** — spacing, labels, dropdown options
   (e.g. Peak Performances distances: 400m, 800m, 1km, 1mi, 5km…), button text ("Save & Close",
   "Add a Workout", "Add Zone"), and ordering. If it diverges, fix it or note why.

4. **No reference for it?** Keep it visually consistent with the existing TP-styled components.
   Never introduce emojis or playful/AI-looking styling.

5. When practical, run the app and visually diff against the screenshot before considering the
   feature done.
