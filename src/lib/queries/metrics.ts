import type { DB } from "../db/client.js";
import {
  latestMetrics,
  listMetricsByType,
  listRecentMetrics,
  type MetricRow,
} from "../db/repo.js";
import { addDays } from "../util/dates.js";

export interface MetricsData {
  latest: Record<string, { value: number; date: string }>;
  series: { date: string; value: number }[];
  recent: MetricRow[];
}

export function getMetricsData(
  db: DB,
  selectedType: string,
  today: string,
): MetricsData {
  const latest: Record<string, { value: number; date: string }> = {};
  for (const m of latestMetrics(db))
    latest[m.type] = { value: m.value, date: m.date };

  const series = listMetricsByType(db, selectedType, addDays(today, -365), today).map(
    (m) => ({ date: m.date, value: m.value }),
  );

  return { latest, series, recent: listRecentMetrics(db, 15) };
}
