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
import { rescheduleItem } from "@/app/(app)/calendar/actions";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BORDER: Record<Modality, string> = {
  run: "border-l-modality-run",
  bike: "border-l-modality-bike",
  swim: "border-l-modality-swim",
  lift: "border-l-modality-strength",
  core: "border-l-modality-core",
};

function WorkoutCard({ item, units }: { item: CalItem; units: Units }) {
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
      className={[
        "cursor-grab rounded-sm border border-line border-l-4 bg-surface-card px-2 py-1 text-[11px] leading-tight shadow-sm",
        BORDER[item.modality],
        planned ? "border-dashed opacity-80" : "",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold text-ink">{item.name}</span>
        {item.stressValue != null && (
          <span className="shrink-0 text-ink-muted">
            {item.stressValue} {item.stressLabel}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex gap-2 text-ink-muted">
        {item.durationS != null && <span>{formatDuration(item.durationS)}</span>}
        {item.distanceM != null && (
          <span>{formatDistance(item.distanceM, units)}</span>
        )}
        {planned && <span className="italic">planned</span>}
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
        "min-h-[120px] border-b border-r border-line p-1",
        inMonth ? "bg-surface-card" : "bg-surface",
        isOver ? "ring-2 ring-inset ring-accent" : "",
      ].join(" ")}
    >
      <div className="mb-1 flex justify-end">
        <span
          className={[
            "text-[11px]",
            isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white"
              : inMonth
                ? "text-ink-muted"
                : "text-ink-muted/50",
          ].join(" ")}
        >
          {dayNum}
        </span>
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <WorkoutCard key={`${it.kind}:${it.id}`} item={it} units={units} />
        ))}
      </div>
    </div>
  );
}

function MetricChip({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-sm font-semibold ${color}`}>
        {value == null ? "—" : Math.round(value)}
      </span>
      <span className="text-[9px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
    </div>
  );
}

function SummaryCell({ s, units }: { s: WeekSummary | undefined; units: Units }) {
  return (
    <div className="min-h-[120px] border-b border-line bg-surface p-2">
      {s && (
        <>
          <div className="mb-2 flex justify-around">
            <MetricChip label="Ftg" value={s.atl} color="text-fatigue" />
            <MetricChip label="Fit" value={s.ctl} color="text-ink" />
            <MetricChip label="Form" value={s.tsb} color="text-form" />
          </div>
          <dl className="space-y-0.5 text-[11px] text-ink-muted">
            <div className="flex justify-between">
              <dt>Duration</dt>
              <dd className="text-ink">{formatDuration(s.durationS)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Distance</dt>
              <dd className="text-ink">{formatDistance(s.distanceM, units)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>TSS</dt>
              <dd className="text-ink">{Math.round(s.tss)}</dd>
            </div>
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

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-hidden rounded border border-line">
        {/* Header */}
        <div className="grid grid-cols-[repeat(7,1fr)_180px] border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-r border-line px-2 py-1.5">
              {d}
            </div>
          ))}
          <div className="px-2 py-1.5">Summary</div>
        </div>
        {/* Weeks */}
        {weeks.map((week) => (
          <div
            key={week[0]}
            className="grid grid-cols-[repeat(7,1fr)_180px]"
          >
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
