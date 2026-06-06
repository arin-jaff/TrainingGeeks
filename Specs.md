This is TrainingGeeks, a self-hosted version of trainingpeaks that can run either on a local laptop/data reserve.

The goal of this software is essentially to replicate TrainingPeaks 1-to-1. We want to get the same UI, drag and drop features, keep things sharp and NOT looking like AI (NO EMOJIs, clear text, simple layout), and store all of our data/trends locally.

Features we need primarily:

- Home
- Calendar
- Dashboard

We need Fitness Scores, Fatigue, Form, Peak Performances, extensive graphs and analyzation, FIT file analyzation.

METRICS:

TrainingPeaks uses advanced metrics to quantify an athlete's effort, fitness, and fatigue. The core formulas are summarized below:Training Stress Score (TSS): Quantifies the overall difficulty of a workout.Formula: \(\text{TSS} = \frac{\text{Duration (seconds)} \times \text{Normalized Power (NP)} \times \text{Intensity Factor (IF)}}{\text{FTP} \times 3600} \times 100\)Normalized Power (NP) / Normalized Graded Pace (NGP): Estimates the physiological "cost" of variable training by giving greater weight to higher-intensity efforts.Intensity Factor (IF): Measures the relative intensity of a workout compared to your threshold.Formula: \(\text{IF} = \frac{\text{NP}}{\text{FTP}}\) (or \(\frac{\text{NGP}}{\text{Threshold\ Pace}}\))Chronic Training Load (CTL / Fitness): Represents your long-term fitness, calculated as an exponentially weighted average of daily TSS over the past 42 days.Acute Training Load (ATL / Fatigue): Represents your short-term fatigue, calculated as an exponentially weighted average of daily TSS over the past 7 days.Training Stress Balance (TSB / Form): Indicates your readiness to perform, calculated by subtracting yesterday's Fatigue from yesterday's Fitness (TSB = CTL - ATL).Variability Index (VI): Measures pacing efficiency by dividing Normalized Power by Average Power (target \(\le 1.05\) for time trials).Efficiency Factor (EF): Measures aerobic efficiency by dividing your Normalized Power (or Pace) by your Average Heart Rate.Aerobic Decoupling (Pw:Hr or Pa:Hr): Tracks heart rate drift relative to power or pace during a steady-state workout, indicating aerobic fitness

^ If you require any additional information, please ask before beginning.

For connections, we will need there to be an auto-upload feature. Garmin's API access is notoriously gated, so this could either be from:
- Strava (so the flow would be Garmin --> Strava connector --> TrainingGeeks)
- Open source (if feasible) -- python-garminconnect or garth if feasible
- Intervals.icu
- Self-hosted auto daemon




On the topic of analyzing/storing fit files, we should do this:
FIT file --> Parse once --> Store normalized records --> Generate metrics --> Cache results

We can store FIT files locally, or on CloudFlare R2/Supabase Storage.

Then, potentially the following:

Downloader
    ↓
Raw FIT Storage
    ↓
Import Queue
    ↓
FIT Parser
    ↓
SQLite/DuckDB
    ↓
Metrics Engine
    ↓
Dashboard

- Search approved asset sources.
- Download assets into /assets/raw.
- Generate textures using AI tools when available.
- Record source URLs and licenses.
- Never use copyrighted assets from random websites.
- Create an asset_manifest.json for everything imported.

If no suitable logo/image/texture exists:

- Generate one.
- Save prompt.
- Save generated image.
- Add metadata.

