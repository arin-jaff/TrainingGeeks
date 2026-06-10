# TrainingGeeks Methodology

How every number in TrainingGeeks is calculated — training load, intensity,
fitness, peak performances, zones — plus how planning, logging, and our new
**Strength Score (S³)** work. Formulas follow the standard endurance-training
definitions popularized by TrainingPeaks and Dr. Andrew Coggan, computed locally
from your activity files.

> TL;DR: a workout's **intensity** (IF) and **duration** combine into a
> **training stress** number (TSS). Daily stress is rolled into long- and
> short-term averages — **Fitness** (CTL), **Fatigue** (ATL) and **Form** (TSB).
> Strength work gets its own parallel score, **S³**, so lifting doesn't distort
> your endurance numbers.

---

## Strength Score (S³) — a TrainingGeeks original

Endurance TSS needs power or pace data, which a barbell or a core session
doesn't produce. Rather than leave strength work unmeasured (or shoehorn it into
TSS with a fake threshold), TrainingGeeks introduces **S³ — the Strength Stress
Score**: a simple, honest load number built from the two things you reliably
know about a strength session — **how long** it was and **how hard** it felt.

### The formula

```
S³ = duration_minutes × ( M / 1.5 )
M  = 1.0 + RPE/10,  clamped to [1.0, 2.0]
```

where **RPE** is your Rating of Perceived Exertion on a 1–10 scale (default 5).

### The anchor

S³ is calibrated against the universal endurance anchor — *one moderate hour =
100 TSS… ish*. We deliberately set the reference point at **a 60-minute session
at RPE 5 = 60 S³**, matching the feel of a steady aerobic hour rather than an
all-out threshold hour. From there:

| Session | RPE | M | S³ |
| --- | --- | --- | --- |
| 60 min, easy/moderate | 5 | 1.5 | **60** |
| 60 min, max effort | 10 | 2.0 | **80** |
| 30 min, hard | 8 | 1.8 | **36** |
| 45 min, light | 3 | 1.3 | **39** |

### Why RPE, and why clamp it

Perceived effort is the most validated subjective load marker in sport science
(it tracks well with %HRmax and blood lactate). Clamping `M` to `[1.0, 2.0]`
keeps a single session from ever scoring more than ~2× its "easy" value, so one
brutal day can't swamp weeks of consistent work. RPE defaults to 5 when you
don't enter one, so logging stays one tap.

### How S³ flows through the app

S³ accumulates into the **Strength** fitness curve exactly like TSS accumulates
into the cardio curves (same 42/7-day EWMAs), giving you a Strength **Fitness/
Fatigue/Form** of its own — kept visually distinct (purple) and **excluded from
overall Fitness**.

---

## Strength sets, estimated 1RM & tonnage

Garmin (and other) FIT files record strength workouts set-by-set — exercise,
reps, time, rest, and weight. TrainingGeeks parses these into an editable table
and derives per-exercise records.

### Estimated one-rep max (1RM)

From any weight × reps set, the estimated max you could lift once:

```
Brzycki (default):  1RM = weight / (1.0278 − 0.0278 × reps)
Epley:              1RM = weight × (1 + reps / 30)
```

Both return the lifted weight for a true single. Brzycki's denominator goes
non-positive past ~37 reps, where it falls back to Epley. Pick the formula in
**Settings → Strength**. A 1RM needs a weight, so estimates only appear for sets
you've entered a weight on (watches usually log weight as 0).

### Per-exercise records & tonnage

- **Exercise identity** is the display name (FIT `category` camelCase → Title
  Case, e.g. `benchPress` → "Bench Press", editable), so renamed sets group
  together. There's no preset list — exercises appear once you log them.
- **Estimated max** per exercise = the best 1RM estimate across its weighted
  sets; also tracked: max weight, max reps, best single-set volume (reps ×
  weight), and **tonnage** (Σ reps × weight).
- These surface in the home **Strength Maxes** panel, the `/strength` records
  page, and a **Lift Progression** dashboard chart (best est-1RM per workout
  over time, with a PR line).

---

## Intensity Factor (IF)

IF is how hard a session was **relative to your threshold**, where 1.0 = riding/
running right at threshold for the whole session.

```
IF = normalized_intensity / threshold
```

- **Power (bike):** `IF = NP / FTP`
- **Pace (run, swim, row):** `IF = NGP / threshold_pace`
- **Heart rate (fallback):** `IF = avg_HR / threshold_HR`

The app picks the best signal available for each sport — power for cycling, pace
for run/swim/row, and heart rate when neither is present.

## Normalized Power (NP)

Steady efforts and surgey efforts with the same *average* power are not equally
hard. NP weights the hard surges using Coggan's algorithm:

1. Take a **30-second rolling average** of the power stream.
2. Raise each value to the **4th power**.
3. Average those, then take the **4th root**.

```
NP = ( mean( rolling30s(power)^4 ) ) ^ (1/4)
```

## Normalized Graded Pace (NGP)

The running/rowing equivalent of NP. Running uphill at 9:00/mi is much harder
than 9:00/mi on the flat, so we first convert speed to a **grade-adjusted speed**
using a Minetti-style cost-of-running curve, then normalize it the same way NP
normalizes power.

## Variability Index (VI)

How evenly-paced the effort was:

```
VI = NP / average_power      (≈ 1.0 = very steady; higher = surgey)
```

## Training Stress Score (TSS)

TSS rolls intensity and duration into one number. By definition, **one hour at
threshold (IF = 1.0) = 100 TSS**.

```
TSS = (duration_seconds / 3600) × IF² × 100
```

Because IF is squared, intensity matters a lot: an hour at IF 0.8 is 64 TSS,
while an hour at IF 1.0 is 100. The label adapts to the data source:

- **TSS** — power-based (cycling).
- **rTSS** — pace-based (running, swimming, rowing).
- **hrTSS** — heart-rate-based (any sport, when power/pace aren't available).

They're all the same `IF² × hours × 100` formula; only the IF input differs.

## Efficiency Factor (EF) & Decoupling

- **EF** = normalized output ÷ average HR — rising EF over time suggests
  improving aerobic efficiency.
- **Decoupling** = the % drift between (output / HR) in the first half vs. the
  second half of a session. Low decoupling (< ~5%) indicates good aerobic
  durability for the effort.

## Work (kJ)

Mechanical work from the power stream: `kJ = Σ power_watts / 1000` (for cycling,
1 kJ ≈ 1 kcal of metabolic energy, a handy calorie proxy).

---

## Fitness, Fatigue & Form (the Performance Management Chart)

Daily training stress is fed into two exponentially-weighted moving averages:

- **CTL — Chronic Training Load → "Fitness"**: a **42-day** EWMA of daily TSS.
  Slow-moving; represents accumulated fitness.
- **ATL — Acute Training Load → "Fatigue"**: a **7-day** EWMA of daily TSS.
  Fast-moving; represents recent tiredness.
- **TSB — Training Stress Balance → "Form"**: `TSB = CTL − ATL` (yesterday's
  values). Positive = fresh/tapered; negative = carrying fatigue.

Each EWMA updates daily as:

```
today = yesterday + (todays_TSS − yesterday) × (1 − e^(−1/N))
```

with `N = 42` for CTL and `N = 7` for ATL. The chart also **projects 60 days
forward** with zero future stress, so you can see how Form will rebound on a
taper.

### Per-sport curves, and what counts toward Fitness

TrainingGeeks computes these curves **per sport** (Run, Bike, Swim, Row,
Strength) and a combined **All**. Importantly:

- **Overall Fitness (All) includes only cardio sports** — Run, Bike, Swim, Row.
- **Strength is tracked on its own curve** and reported as a separate **Strength
  Score**, *not* folded into your endurance Fitness/Fatigue/Form.

This avoids the classic problem of a heavy lifting block inflating your
"fitness" line even though your endurance engine hasn't changed.

## Peak Performances (mean-maximal curves)

For every activity the app finds your **best effort** at a range of durations and
distances — e.g. best 5-second power, best 20-minute power, fastest 1 km, fastest
mile. Plotted across all activities, these form a **mean-maximal curve**: the
highest value you've ever sustained for each window. Power and heart-rate peaks
are by duration; pace peaks are by both duration and distance. Your top efforts
earn 🥇🥈🥉.

---

## Zones

Heart-rate, power, and pace **zones** are derived from your thresholds using
published models (Coggan power zones, Friel/USAT HR zones, etc.). Pick a method
and anchor (FTP, threshold HR, threshold pace) in **Settings → Zones**; the app
builds contiguous integer ranges and uses them for time-in-zone charts.

---

## Training Plans

Structured plans (e.g. Hal Higdon 5K/10K/Half/Marathon, a sprint-tri plan) are
stored as a sequence of prescribed daily workouts (type, sport, duration or
distance, intensity). Scheduling a plan from a **start Monday** expands it onto
your calendar as **planned workouts** (rest days left open); each planned day is
tagged so the plan can be rescheduled or removed as a unit.

---

## Logging: planned vs. completed

Every calendar workout has a **Planned** side and a **Completed** side.

- **Planned** values (duration, distance, target TSS) live as a *planned
  workout*. Upcoming planned days are grey; **past-due** planned days that were
  never completed turn **red**.
- **Completed** values become an **activity** — imported from a FIT file /
  intervals.icu, or entered by hand. Completed days show a **green** banner.
  Completed cardio carries TSS; completed strength carries S³.
- When a planned workout is completed, the two are **linked**, so plan-vs-actual
  stays intact and fitness is computed from what you actually did.

Manual entries are first-class: anything you can sync, you can also type in.

---

*All calculations run locally on your own instance from your own data. There is
no server-side processing and nothing leaves your machine unless you enable
intervals.icu sync.*
