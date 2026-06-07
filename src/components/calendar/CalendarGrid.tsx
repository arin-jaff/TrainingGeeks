"use client";

import { useState, useTransition } from "react";
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
import type { EquipmentRow, InjuryRow } from "@/lib/db/repo";
import type { CalItem, WeekSummary } from "@/lib/queries/calendar";
import { formatDistance, formatDuration } from "@/lib/util/format";
import {
  DISCIPLINE_BAR,
  FATIGUE_COLOR,
  FITNESS_COLOR,
  FORM_COLOR,
  STATUS_COMPLETE,
  STATUS_COMPLETE_BG,
  STATUS_PASTDUE,
  STATUS_PASTDUE_BG,
} from "@/lib/util/colors";
import SportImage from "@/components/SportImage";
import { rescheduleItem } from "@/app/(app)/calendar/actions";
import { getWorkoutForEdit, type WorkoutEditData } from "@/app/actions/workout";
import AddMenuModal from "./AddMenuModal";
import WorkoutModal from "./WorkoutModal";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const SPORT_NAME: Record<Modality, string> = {
  run: "Running",
  bike: "Cycling",
  swim: "Swimming",
  lift: "Strength",
  core: "Core",
};

const CARD_SHADOW = "0 2px 4px rgba(26,32,46,0.3)";

type CardStatus = "complete" | "pastdue" | "planned";

function statusOf(item: CalItem, date: string, today: string): CardStatus {
  if (item.kind === "activity") return "complete";
  return date < today ? "pastdue" : "planned";
}

function WorkoutCard({
  item,
  date,
  today,
  units,
  onEdit,
}: {
  item: CalItem;
  date: string;
  today: string;
  units: Units;
  onEdit: (kind: "activity" | "planned", id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${item.kind}:${item.id}`,
    data: { kind: item.kind, id: item.id },
  });
  const planned = item.kind === "planned";
  const status = statusOf(item, date, today);
  const bannerColor =
    status === "complete" ? STATUS_COMPLETE : status === "pastdue" ? STATUS_PASTDUE : null;
  const bodyBg =
    status === "complete" ? STATUS_COMPLETE_BG : status === "pastdue" ? STATUS_PASTDUE_BG : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) onEdit(item.kind, item.id);
      }}
      style={{ boxShadow: CARD_SHADOW, backgroundColor: bodyBg }}
      className={[
        "cursor-grab overflow-hidden rounded-[4px]",
        bannerColor ? "" : "bg-surface-card",
        planned && status === "planned" ? "opacity-90 ring-1 ring-dashed ring-line" : "",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      {bannerColor && <div style={{ backgroundColor: bannerColor, height: 4 }} />}
      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <SportImage modality={item.modality} size={18} className="rounded-sm" />
          <span className="truncate text-[12px] font-semibold text-ink">
            {item.name || SPORT_NAME[item.modality]}
          </span>
          <span className="ml-auto text-ink-muted/50" aria-hidden>
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
            <div className="font-semibold text-ink">
              {item.stressValue} {item.stressLabel}
            </div>
          )}
          {planned && (
            <div className={status === "pastdue" ? "italic text-fatigue" : "italic text-ink-muted"}>
              {status === "pastdue" ? "past due" : "planned"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  date,
  items,
  inMonth,
  isToday,
  today,
  injured,
  units,
  onAdd,
  onEdit,
}: {
  date: string;
  items: CalItem[];
  inMonth: boolean;
  isToday: boolean;
  today: string;
  injured: boolean;
  units: Units;
  onAdd: (date: string) => void;
  onEdit: (kind: "activity" | "planned", id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayNum = Number(date.slice(8, 10));
  const label =
    dayNum === 1
      ? new Date(`${date}T00:00:00Z`).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : String(dayNum);

  return (
    <div
      ref={setNodeRef}
      className={[
        "group relative flex min-h-[150px] flex-col border-b border-r border-line",
        injured ? "bg-fatigue/5" : inMonth ? "bg-surface-card" : "bg-surface",
        isOver ? "ring-2 ring-inset ring-accent" : "",
      ].join(" ")}
    >
      {isToday ? (
        <div className="mb-1 flex items-center justify-between bg-[#2f6fed] px-1.5 py-0.5 text-[11px] font-medium text-white">
          <span>Today {dayNum}</span>
          {injured && (
            <span
              className="h-2 w-2 rounded-full bg-white/90"
              title="Injured"
              aria-label="Injured"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-1.5 pt-1">
          <span
            className={`text-[11px] ${inMonth ? "text-ink" : "text-ink-muted/40"}`}
          >
            {label}
          </span>
          {injured && (
            <span
              className="h-2 w-2 rounded-full bg-fatigue"
              title="Injured"
              aria-label="Injured"
            />
          )}
        </div>
      )}
      <div className="space-y-1.5 px-1.5 pb-1.5 pt-1">
        {items.map((it) => (
          <WorkoutCard
            key={`${it.kind}:${it.id}`}
            item={it}
            date={date}
            today={today}
            units={units}
            onEdit={onEdit}
          />
        ))}
      </div>
      {/* Hover "+" to add a workout/metric/injury on this date. */}
      <button
        type="button"
        onClick={() => onAdd(date)}
        aria-label={`Add to ${date}`}
        className="mx-1.5 mb-1.5 mt-auto flex h-7 items-center justify-center rounded border border-dashed border-line text-ink-muted opacity-0 transition-opacity hover:border-accent hover:text-accent group-hover:opacity-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

function FFFHeader({ s }: { s: WeekSummary }) {
  const cell = (label: string, value: number | null, unit: string, color: string) => (
    <div className="flex flex-col">
      <span className="text-[11px]" style={{ color }}>
        {label}
      </span>
      <span>
        <span className="text-[15px]" style={{ color }}>
          {value == null ? "—" : Math.round(value)}
        </span>
        <span className="ml-1 text-[10px] text-ink-muted">{unit}</span>
      </span>
    </div>
  );
  return (
    <div className="flex justify-between">
      {cell("Fitness", s.ctl, "CTL", FITNESS_COLOR)}
      {cell("Fatigue", s.atl, "ATL", FATIGUE_COLOR)}
      {cell("Form", s.tsb, "TSB", FORM_COLOR)}
    </div>
  );
}

const DISC_ORDER: [string, string][] = [
  ["run", "Run"],
  ["bike", "Bike"],
  ["swim", "Swim"],
  ["strength", "Strength"],
  ["other", "Other"],
];

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
  if (!s) return <div className="min-h-[150px] border-b border-line bg-surface" />;
  const disciplines = DISC_ORDER.filter(([k]) => (s.disc[k] ?? 0) > 0);
  return (
    <div className="min-h-[150px] border-b border-line bg-surface px-3 py-2">
      <FFFHeader s={s} />

      {disciplines.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {disciplines.map(([k, label]) => (
            <div key={k}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-ink">{label} Duration</span>
                <span className="font-medium tabular-nums text-ink">
                  {formatDuration(s.disc[k])}
                </span>
              </div>
              <div
                className="mt-0.5 h-[3px] rounded-full"
                style={{ backgroundColor: DISCIPLINE_BAR[k] }}
              />
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}

export default function CalendarGrid({
  weeks,
  itemsByDate,
  weekSummaries,
  injuredDates,
  openInjuries,
  equipment,
  month,
  today,
  units,
}: {
  weeks: string[][];
  itemsByDate: Record<string, CalItem[]>;
  weekSummaries: Record<string, WeekSummary>;
  injuredDates: string[];
  openInjuries: InjuryRow[];
  equipment: EquipmentRow[];
  month: string;
  today: string;
  units: Units;
}) {
  const router = useRouter();
  const injured = new Set(injuredDates);
  const [, startTransition] = useTransition();
  const [addDate, setAddDate] = useState<string | null>(null);
  const [editData, setEditData] = useState<WorkoutEditData | null>(null);
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

  function openEdit(kind: "activity" | "planned", id: number) {
    startTransition(async () => {
      const data = await getWorkoutForEdit(kind, id);
      if (data) setEditData(data);
    });
  }

  const cols = "grid grid-cols-[repeat(7,1fr)_220px]";

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-hidden rounded border border-line">
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
        {weeks.map((week) => (
          <div key={week[0]} className={cols}>
            {week.map((date) => (
              <DayCell
                key={date}
                date={date}
                items={itemsByDate[date] ?? []}
                inMonth={date.slice(0, 7) === month}
                isToday={date === today}
                today={today}
                injured={injured.has(date)}
                units={units}
                onAdd={setAddDate}
                onEdit={openEdit}
              />
            ))}
            <SummaryCell s={weekSummaries[week[0]]} units={units} />
          </div>
        ))}
      </div>

      {addDate && (
        <AddMenuModal
          date={addDate}
          units={units}
          today={today}
          equipment={equipment}
          openInjuries={openInjuries}
          onClose={() => setAddDate(null)}
        />
      )}
      {editData && (
        <WorkoutModal
          date={editData.date}
          modality={editData.modality as Modality}
          units={units}
          today={today}
          equipment={equipment}
          initial={editData}
          onClose={() => setEditData(null)}
        />
      )}
    </DndContext>
  );
}
