// AUTO-GENERATED from references/zones/*.xlsx — zone boundaries as a
// fraction of the anchor (FTP/CP for power, LTHR or MaxHR for heart rate).
// 'high: null' means the open-ended top zone (capped at runtime).

export interface MethodZone { name: string; high: number | null; }
export interface MethodDef { label: string; zones: MethodZone[]; }

export const POWER_METHOD_DATA: Record<string, MethodDef> = {
  "stryd-running-5": {
    "label": "Stryd Running (5)",
    "zones": [
      {
        "name": "Easy",
        "high": 0.8
      },
      {
        "name": "Moderate",
        "high": 0.9
      },
      {
        "name": "Threshold",
        "high": 1
      },
      {
        "name": "Interval",
        "high": 1.15
      },
      {
        "name": "Repetition",
        "high": 1.3
      }
    ]
  },
  "andy-coggan-6": {
    "label": "Andy Coggan (6)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.55
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.75
      },
      {
        "name": "Tempo",
        "high": 0.9
      },
      {
        "name": "Lactate Threshold",
        "high": 1.05
      },
      {
        "name": "VO2 Max",
        "high": 1.2
      },
      {
        "name": "Anaerobic Capacity",
        "high": 1.5
      },
      {
        "name": "Neuromuscular",
        "high": null
      }
    ]
  },
  "durata-training-8": {
    "label": "Durata Training (8)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.55
      },
      {
        "name": "Endurance",
        "high": 0.75
      },
      {
        "name": "Tempo",
        "high": 0.87
      },
      {
        "name": "Sub-Threshold",
        "high": 0.95
      },
      {
        "name": "Threshold",
        "high": 1.05
      },
      {
        "name": "VO2 Max",
        "high": 1.2
      },
      {
        "name": "Anaerobic Capacity",
        "high": 1.5
      },
      {
        "name": "Neuromuscular",
        "high": null
      }
    ]
  },
  "cts-6": {
    "label": "CTS (6)",
    "zones": [
      {
        "name": "Recovery Miles",
        "high": 0.44
      },
      {
        "name": "Foundation Miles",
        "high": 0.73
      },
      {
        "name": "Tempo",
        "high": 0.85
      },
      {
        "name": "Steady State",
        "high": 0.9
      },
      {
        "name": "Climbing Repeat",
        "high": 1
      },
      {
        "name": "Power Intervals",
        "high": null
      }
    ]
  },
  "usat-for-cycling-6": {
    "label": "USAT for Cycling (6)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.55
      },
      {
        "name": "Endurance",
        "high": 0.75
      },
      {
        "name": "Tempo",
        "high": 0.9
      },
      {
        "name": "Threshold",
        "high": 1.05
      },
      {
        "name": "VO2 Max",
        "high": 1.2
      },
      {
        "name": "Anaerobic+",
        "high": null
      }
    ]
  },
  "80-20-cycling-7": {
    "label": "80-20 Cycling (7)",
    "zones": [
      {
        "name": "Z1 - Easy",
        "high": 0.55
      },
      {
        "name": "ZX - Moderate Low",
        "high": 0.75
      },
      {
        "name": "Z2 - Moderate",
        "high": 0.9
      },
      {
        "name": "ZY - Threshold Low",
        "high": 1
      },
      {
        "name": "Z3 - Threshold",
        "high": 1.15
      },
      {
        "name": "Z4 - Supra-Thresh",
        "high": 1.5
      },
      {
        "name": "Z5 - Speed",
        "high": null
      }
    ]
  },
  "80-20-running-7": {
    "label": "80-20 Running (7)",
    "zones": [
      {
        "name": "Z1 - Easy",
        "high": 0.55
      },
      {
        "name": "ZX - Moderate Low",
        "high": 0.75
      },
      {
        "name": "Z2 - Moderate",
        "high": 0.9
      },
      {
        "name": "ZY - Threshold Low",
        "high": 1
      },
      {
        "name": "Z3 - Threshold",
        "high": 1.15
      },
      {
        "name": "Z4 - Supra-Thresh",
        "high": 1.5
      },
      {
        "name": "Z5 - Speed",
        "high": null
      }
    ]
  },
  "myprocoach-cycling-5": {
    "label": "MyProCoach Cycling (5)",
    "zones": [
      {
        "name": "Recovery",
        "high": 0.55
      },
      {
        "name": "Endurance",
        "high": 0.75
      },
      {
        "name": "Tempo",
        "high": 0.9
      },
      {
        "name": "Threshold",
        "high": 1.05
      },
      {
        "name": "VO2 Max+",
        "high": null
      }
    ]
  },
  "myprocoach-running-5": {
    "label": "MyProCoach Running (5)",
    "zones": [
      {
        "name": "Recovery",
        "high": 0.55
      },
      {
        "name": "Endurance",
        "high": 0.75
      },
      {
        "name": "Tempo",
        "high": 0.9
      },
      {
        "name": "Threshold",
        "high": 1.05
      },
      {
        "name": "VO2 Max+",
        "high": null
      }
    ]
  }
};

export const HR_METHOD_DATA: Record<string, MethodDef> = {
  "durata-training-10": {
    "label": "Durata Training (10)",
    "zones": [
      {
        "name": "Recovery",
        "high": 0.65
      },
      {
        "name": "Easy Aerobic",
        "high": 0.72
      },
      {
        "name": "Endurance",
        "high": 0.79
      },
      {
        "name": "Lower Tempo",
        "high": 0.84
      },
      {
        "name": "Tempo",
        "high": 0.89
      },
      {
        "name": "Sub-Threshold Low",
        "high": 0.93
      },
      {
        "name": "Sub-Threshold High",
        "high": 0.99
      },
      {
        "name": "Threshold",
        "high": 1.02
      },
      {
        "name": "VO2 Max",
        "high": 1.06
      },
      {
        "name": "Anaerobic+",
        "high": null
      }
    ]
  },
  "cts-cycling-6": {
    "label": "CTS Cycling (6)",
    "zones": [
      {
        "name": "Recovery Miles",
        "high": 0.68
      },
      {
        "name": "Foundation Miles",
        "high": 0.83
      },
      {
        "name": "Tempo",
        "high": 0.88
      },
      {
        "name": "Steady State",
        "high": 0.93
      },
      {
        "name": "Climbing Repeat",
        "high": 1
      },
      {
        "name": "Power Intervals",
        "high": null
      }
    ]
  },
  "cts-run-5": {
    "label": "CTS Run (5)",
    "zones": [
      {
        "name": "Recovery Run",
        "high": 0.75
      },
      {
        "name": "Foundation Run",
        "high": 0.85
      },
      {
        "name": "Endurance Run",
        "high": 0.92
      },
      {
        "name": "Threshold/Tempo",
        "high": 1
      },
      {
        "name": "Power Intervals",
        "high": null
      }
    ]
  },
  "80-20-running-7": {
    "label": "80/20 Running (7)",
    "zones": [
      {
        "name": "Z1 — Easy",
        "high": 0.8
      },
      {
        "name": "ZX — Moderate Low",
        "high": 0.89
      },
      {
        "name": "Z2 — Moderate",
        "high": 0.93
      },
      {
        "name": "ZY — Threshold Low",
        "high": 0.99
      },
      {
        "name": "Z3 — Threshold",
        "high": 1.02
      },
      {
        "name": "Z4 — High Intensity",
        "high": 1.06
      },
      {
        "name": "Z5 — Speed",
        "high": null
      }
    ]
  },
  "80-20-cycling-7": {
    "label": "80/20 Cycling (7)",
    "zones": [
      {
        "name": "Z1 — Easy",
        "high": 0.8
      },
      {
        "name": "ZX — Moderate Low",
        "high": 0.87
      },
      {
        "name": "Z2 — Moderate",
        "high": 0.93
      },
      {
        "name": "ZY — Threshold Low",
        "high": 0.99
      },
      {
        "name": "Z3 — Threshold",
        "high": 1.02
      },
      {
        "name": "Z4 — High Intensity",
        "high": 1.06
      },
      {
        "name": "Z5 — Speed",
        "high": null
      }
    ]
  },
  "myprocoach-5": {
    "label": "MyProCoach (5)",
    "zones": [
      {
        "name": "Easy",
        "high": 0.73
      },
      {
        "name": "Steady",
        "high": 0.8
      },
      {
        "name": "Mod. Hard",
        "high": 0.87
      },
      {
        "name": "Hard",
        "high": 0.93
      },
      {
        "name": "Very Hard",
        "high": 1
      }
    ]
  },
  "bcf-abcc-wcpp-revised-7": {
    "label": "BCF/ABCC/WCPP Revised (7)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.64
      },
      {
        "name": "Base Endurance",
        "high": 0.74
      },
      {
        "name": "Lower Aerobic",
        "high": 0.81
      },
      {
        "name": "Upper Aerobic",
        "high": 0.88
      },
      {
        "name": "Threshold",
        "high": 0.93
      },
      {
        "name": "Anaerobic",
        "high": 0.99
      },
      {
        "name": "Maximal",
        "high": null
      }
    ]
  },
  "peter-keen-4": {
    "label": "Peter Keen (4)",
    "zones": [
      {
        "name": "Level 1 — Recovery",
        "high": 0.74
      },
      {
        "name": "Low Level 2",
        "high": 0.77
      },
      {
        "name": "Level 2 — Endurance",
        "high": 0.87
      },
      {
        "name": "Level 3 — Threshold",
        "high": 0.93
      }
    ]
  },
  "ric-stern-7": {
    "label": "Ric Stern (7)",
    "zones": [
      {
        "name": "Recovery",
        "high": 0.64
      },
      {
        "name": "Endurance",
        "high": 0.74
      },
      {
        "name": "Lower Tempo",
        "high": 0.81
      },
      {
        "name": "Upper Tempo",
        "high": 0.87
      },
      {
        "name": "Sub-Threshold",
        "high": 0.93
      },
      {
        "name": "Threshold+",
        "high": 0.99
      },
      {
        "name": "Maximal",
        "high": null
      }
    ]
  },
  "sally-edwards-5": {
    "label": "Sally Edwards (5)",
    "zones": [
      {
        "name": "Healthy Heart",
        "high": 0.59
      },
      {
        "name": "Temperate",
        "high": 0.69
      },
      {
        "name": "Aerobic",
        "high": 0.79
      },
      {
        "name": "Threshold",
        "high": 0.89
      },
      {
        "name": "Redline",
        "high": 1
      }
    ]
  },
  "joe-friel-7": {
    "label": "Joe Friel (7)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.84
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.89
      },
      {
        "name": "Tempo",
        "high": 0.94
      },
      {
        "name": "Threshold",
        "high": 0.99
      },
      {
        "name": "Threshold+",
        "high": 1.02
      },
      {
        "name": "Aerobic Power",
        "high": 1.06
      },
      {
        "name": "Anaerobic",
        "high": null
      }
    ]
  },
  "joe-friel-for-running-7": {
    "label": "Joe Friel for Running (7)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.84
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.89
      },
      {
        "name": "Tempo",
        "high": 0.94
      },
      {
        "name": "Threshold",
        "high": 0.99
      },
      {
        "name": "Threshold+",
        "high": 1.02
      },
      {
        "name": "Aerobic Power",
        "high": 1.06
      },
      {
        "name": "Anaerobic",
        "high": null
      }
    ]
  },
  "joe-friel-for-cycling-7": {
    "label": "Joe Friel for Cycling (7)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.8
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.89
      },
      {
        "name": "Tempo",
        "high": 0.93
      },
      {
        "name": "Threshold",
        "high": 0.99
      },
      {
        "name": "Threshold+",
        "high": 1.02
      },
      {
        "name": "Aerobic Power",
        "high": 1.06
      },
      {
        "name": "Anaerobic",
        "high": null
      }
    ]
  },
  "andy-coggan-5": {
    "label": "Andy Coggan (5)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.68
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.83
      },
      {
        "name": "Tempo",
        "high": 0.94
      },
      {
        "name": "Threshold",
        "high": 1.05
      },
      {
        "name": "VO2 Max",
        "high": null
      }
    ]
  },
  "usac-5": {
    "label": "USAC (5)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.65
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.75
      },
      {
        "name": "Tempo",
        "high": 0.85
      },
      {
        "name": "Threshold",
        "high": 0.95
      },
      {
        "name": "VO2 Max+",
        "high": null
      }
    ]
  },
  "usat-for-cycling-6": {
    "label": "USAT for Cycling (6)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.8
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.89
      },
      {
        "name": "Tempo",
        "high": 0.93
      },
      {
        "name": "Threshold",
        "high": 0.99
      },
      {
        "name": "VO2 Max",
        "high": 1.02
      },
      {
        "name": "Anaerobic+",
        "high": null
      }
    ]
  },
  "usat-for-running-6": {
    "label": "USAT for Running (6)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.84
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.89
      },
      {
        "name": "Tempo",
        "high": 0.94
      },
      {
        "name": "Threshold",
        "high": 0.99
      },
      {
        "name": "VO2 Max",
        "high": 1.02
      },
      {
        "name": "Anaerobic+",
        "high": null
      }
    ]
  },
  "cyclesmart-5": {
    "label": "CycleSmart (5)",
    "zones": [
      {
        "name": "Active Recovery",
        "high": 0.8
      },
      {
        "name": "Aerobic Endurance",
        "high": 0.89
      },
      {
        "name": "Tempo",
        "high": 0.95
      },
      {
        "name": "Threshold",
        "high": 1.02
      },
      {
        "name": "VO2 Max+",
        "high": null
      }
    ]
  }
};
