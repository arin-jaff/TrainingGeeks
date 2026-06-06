---
name: asset-sourcing
description: Rules for sourcing, generating, and tracking images/logos/textures in TrainingGeeks — licensed sources only, everything recorded in assets/asset_manifest.json. Use when adding any logo, icon, image, or texture.
---

# Asset Sourcing

Never use copyrighted assets from random websites. Every asset is licensed or generated, and
everything is tracked.

## Sourcing an existing asset

1. Use only **approved/licensed sources** (permissive/CC0/owned). Verify the license.
2. Download into `assets/raw/`.
3. Record the **source URL and license** in `assets/asset_manifest.json`.

## Generating an asset (when no suitable licensed one exists)

1. Generate with AI tools.
2. Save the **prompt**, the **generated image** (into `assets/raw/`), and metadata.
3. Add the entry to `assets/asset_manifest.json`.

## `assets/asset_manifest.json`

One entry per imported/generated asset:

```json
{
  "assets": [
    {
      "file": "raw/logo-traininggeeks.png",
      "type": "logo",
      "origin": "generated",            // "generated" | "downloaded"
      "source_url": null,                // set when downloaded
      "license": "self-generated",       // license string when downloaded
      "prompt": "…",                     // set when generated
      "added": "YYYY-MM-DD",
      "notes": ""
    }
  ]
}
```

Keep the manifest in sync with the contents of `assets/`. If an asset isn't in the manifest,
it doesn't belong in the repo.
