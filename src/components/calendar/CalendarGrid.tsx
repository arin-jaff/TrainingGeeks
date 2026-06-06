"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Modality, Units } from "@/lib/db/types";
import type { CalItem, WeekSummary } from "@/lib/queries/calendar";
import { formatDistance, formatDuration } from "@/lib/util/format";
import { MODALITY_COLOR } from "@/lib/util/colors";
import SportIcon from "@/components/SportIcon";
import { rescheduleItem } from "@/app/(app)/calendar/actions";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Full discipline names like TrainingPeaks.
const SPORT_NAME: Record<Modality, string> = {
  run: "Running",
  bike: "Cycling",
  swim: "Swimming",
  lift: "Strength",
  core: "Core",
};

function WorkoutCard({ item, units }: { item: CalItem; units: Units }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${item.kind}:${item.id}`,
    data: { kind: item.kind, id: item.id },
  });
  const planned = item.kind === "planned";
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging && item.kind === "activity")
          router.push(`/activity/${item.id}`);
      }}
      style={{ borderLeftColor: MODALITY_COLOR[item.modality] }}
      className={[
        "cursor-grab rounded border border-line border-l-[3px] bg-surface-card px-2 py-1.5 shadow-sm",
        planned ? "opacity-80" : "",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5">
        <SportIcon modality={item.modality} size={15} />
        <span className="truncate text-[12px] font-semibold text-ink">
          {SPORT_NAME[item.modality]}
        </span>
        <span className="ml-auto text-ink-muted/60" aria-hidden>
          ⋮
        </span>
      </div>
      <div className="mt-1 space-y-0.5 text-[12px] leading-tight">
        {item.durationS != null && (
          <div className="font-semibold text-ink">
            {formatDuration(item.durationS)}
          </div>
        )}
        {item.distanceM != null && (
          <div className="text-ink">{formatDistance(item.distanceM, units)}</div>
        )}
        {item.stressValue != null && (
          <div className="text-ink-muted">
            {item.stressValue} {item.stressLabel}
          </div>
        )}
        {planned && <div className="italic text-ink-muted">planned</div>}
      </div>
    </div>
  );
}

function DayCell({
  date,
  items,
  inMonth,
  isToday,
  units,
}: {
  date: string;
  items: CalItem[];
  inMonth: boolean;
  isToday: boolean;
  units: Units;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayNum = Number(date.slice(8, 10));
  return (
    <div
      ref={setNodeRef}
      className={[
        "min-h-[150px] border-b border-r border-line p-1.5",
        inMonth ? "bg-surface-card" : "bg-surface",
        isOver ? "ring-2 ring-inset ring-accent" : "",
      ].join(" ")}
    >
      <div className="mb-1 flex justify-end">
        <span
          className={[
            "text-[12px]",
            isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white"
              : inMonth
                ? "text-ink-muted"
                : "text-ink-muted/40",
          ].join(" ")}
        >
          {dayNum}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <WorkoutCard key={`${it.kind}:${it.id}`} item={it} units={units} />
        ))}
      </div>
    </div>
  );
}

function FFFHeader({ s }: { s: WeekSummary }) {
  const cell = (
    label: string,
    value: number | null,
    unit: string,
    color: string,
  ) => (
    <div className="flex flex-col">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <span>
        <span className="text-[15px] font-semibold" style={{ color }}>
          {value == null ? "—" : Math.round(value)}
        </span>
        <span className="ml-1 text-[10px] text-ink-muted">{unit}</span>
      </span>
    </div>
  );
  return (
    <div className="flex justify-between">
      {cell("Fitness", s.ctl, "CTL", "#2f6fed")}
      {cell("Fatigue", s.atl, "ATL", "#e0457b")}
      {cell("Form", s.tsb, "TSB", "#f0a03f")}
    </div>
  );
}

function metricRows(s: WeekSummary, units: Units) {
  const km = units === "metric";
  return [
    ["Duration", formatDuration(s.durationS), "hms"],
    ["Distance", (s.distanceM / (km ? 1000 : 1609.34)).toFixed(1), km ? "km" : "mi"],
    ["TSS", String(Math.round(s.tss)), "TSS"],
    ["El. Gain", String(Math.round(s.elevationM * (km ? 1 : 3.28084))), km ? "m" : "ft"],
    ["Work", String(Math.round(s.workKj)), "kJ"],
  ] as const;
}

function SummaryCell({ s, units }: { s: WeekSummary | undefined; units: Units }) {
  return (
    <div className="min-h-[150px] border-b border-line bg-surface px-3 py-2">
      {s && (
        <>
          <FFFHeader s={s} />
          <dl className="mt-3 space-y-1 text-[12px]">
            {metricRows(s, units).map(([label, value, unit]) => (
              <div key={label} className="flex items-baseline justify-between">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="tabular-nums text-ink">
                  <span className="font-semibold">{value}</span>{" "}
                  <span className="text-[10px] text-ink-muted">{unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

export default function CalendarGrid({
  weeks,
  itemsByDate,
  weekSummaries,
  month,
  today,
  units,
}: {
  weeks: string[][];
  itemsByDate: Record<string, CalItem[]>;
  weekSummaries: Record<string, WeekSummary>;
  month: string;
  today: string;
  units: Units;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const over = e.over?.id;
    const data = e.active.data.current as
      | { kind: "activity" | "planned"; id: number }
      | undefined;
    if (!over || !data) return;
    const targetDate = String(over);
    startTransition(async () => {
      await rescheduleItem(data.kind, data.id, targetDate);
      router.refresh();
    });
  }

  const cols = "grid grid-cols-[repeat(7,1fr)_220px]";

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-hidden rounded border border-line">
        {/* Header */}
        <div
          className={`${cols} border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wide text-ink-muted`}
        >
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-r border-line px-2 py-1.5">
              {d}
            </div>
          ))}
          <div className="flex items-center gap-1 px-2 py-1.5">
            <span aria-hidden className="text-ink-muted/60">
              ›
            </span>
            Summary
          </div>
        </div>
        {/* Weeks */}
        {weeks.map((week) => (
          <div key={week[0]} className={cols}>
            {week.map((date) => (
              <DayCell
                key={date}
                date={date}
                items={itemsByDate[date] ?? []}
                inMonth={date.slice(0, 7) === month}
                isToday={date === today}
                units={units}
              />
            ))}
            <SummaryCell s={weekSummaries[week[0]]} units={units} />
          </div>
        ))}
      </div>
    </DndContext>
  );
}
