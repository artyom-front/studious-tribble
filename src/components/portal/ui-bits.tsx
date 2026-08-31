"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/** Отображаемый счёт матча с учётом регламентного WO-счёта (COALESCE-логика PRD Epic 2) */
export function matchScore(m: {
  status: string;
  walkoverType: string | null;
  homeScore: number | null;
  awayScore: number | null;
  regulationScore: number;
}): { home: number; away: number } | null {
  if (m.status === "COMPLETED") return { home: m.homeScore ?? 0, away: m.awayScore ?? 0 };
  if (m.status === "LIVE" && m.homeScore !== null) return { home: m.homeScore, away: m.awayScore ?? 0 };
  if (m.status === "WALKOVER" && m.walkoverType) {
    if (m.walkoverType === "HOME") return { home: 0, away: m.regulationScore };
    if (m.walkoverType === "AWAY") return { home: m.regulationScore, away: 0 };
    return { home: 0, away: 0 };
  }
  return null;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SCHEDULED: { label: "Запланирован", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    LIVE: { label: "Идёт сейчас", cls: "bg-red-50 text-red-600 border-red-200 animate-pulse" },
    COMPLETED: { label: "Завершён", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    WALKOVER: { label: "Тех. поражение", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    POSTPONED: { label: "Перенесён", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  };
  const v = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600 border-zinc-200" };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", v.cls)}>{v.label}</span>;
}

export function FormBadges({ form }: { form: string[] }) {
  const map: Record<string, { label: string; cls: string; title: string }> = {
    W: { label: "В", cls: "bg-emerald-600 text-white", title: "Победа" },
    D: { label: "Н", cls: "bg-zinc-300 text-zinc-700", title: "Ничья" },
    L: { label: "П", cls: "bg-red-500 text-white", title: "Поражение" },
    T: { label: "Т", cls: "bg-amber-500 text-white", title: "Техническое поражение" },
    w: { label: "тВ", cls: "bg-emerald-200 text-emerald-800", title: "Техническая победа" },
  };
  if (form.length === 0) return <span className="text-zinc-300">—</span>;
  return (
    <div className="flex items-center gap-1">
      {form.map((f, i) => {
        const v = map[f] ?? { label: f, cls: "bg-zinc-200 text-zinc-600", title: f };
        return (
          <span key={i} title={v.title} className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", v.cls)}>
            {v.label}
          </span>
        );
      })}
    </div>
  );
}

export function PositionBadge({ position }: { position: string | null }) {
  const map: Record<string, string> = { GK: "ВРТ", DF: "ЗАЩ", MF: "ПЗ", FW: "НАП" };
  if (!position || !map[position]) return null;
  return <span className="text-xs text-zinc-400 font-medium">{map[position]}</span>;
}

export function ScoreBox({ score, status }: { score: { home: number; away: number } | null; status?: string }) {
  if (!score) return <span className="text-zinc-300 font-mono">— : —</span>;
  return (
    <span className={cn("font-mono font-bold tabular-nums", status === "WALKOVER" ? "text-amber-600" : "text-zinc-800")}>
      {score.home} : {score.away}
    </span>
  );
}

export function LoadingBlock({ label = "Загрузка..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
      <p className="font-medium">Ошибка загрузки</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-12 text-zinc-400">
      {icon}
      <p className="font-medium text-zinc-500">{title}</p>
      {hint && <p className="text-sm">{hint}</p>}
    </div>
  );
}
