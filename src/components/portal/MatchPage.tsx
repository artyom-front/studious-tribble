"use client";

// Страница матча: счёт, WO-регламент, хронология, составы, судья (кликабелен),
// стадион, оценка судейства, вход в редактор протокола для роли.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Goal, TriangleAlert, OctagonX, Repeat, Star, MapPin, Flag, ClipboardPen, Info, ChevronLeft } from "lucide-react";
import { useFetch, fmtDate, apiPost } from "./hooks";
import { navigate } from "./router";
import type { MatchDTO, SessionUserDTO } from "./types";
import { EVENT_LABELS } from "./types";
import { ScoreBox, StatusBadge, matchScore, LoadingBlock, EmptyState } from "./ui-bits";

interface MatchDetail {
  match: MatchDTO & {
    events: { id: string; minute: number; type: string; person: { id: string; name: string }; assist: { id: string; name: string } | null; teamId: string }[];
    lineups: { id: string; teamId: string; person: { id: string; name: string; position: string | null }; isStarter: boolean; number: number | null }[];
    ratings: { id: string; rating: number; comment: string | null; authorRole: string }[];
    season: { id: string; name: string };
    referee: { id: string; name: string } | null;
    league: { id: string; name: string; walkoverScore: number };
  };
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  GOAL: <Goal className="h-4 w-4 text-emerald-600" />,
  PENALTY: <Goal className="h-4 w-4 text-emerald-600" />,
  OWN_GOAL: <Goal className="h-4 w-4 text-red-500" />,
  YELLOW_CARD: <TriangleAlert className="h-4 w-4 text-yellow-500" />,
  RED_CARD: <OctagonX className="h-4 w-4 text-red-600" />,
  SUB_OUT: <Repeat className="h-4 w-4 text-zinc-400" />,
  SUB_IN: <Repeat className="h-4 w-4 text-zinc-600" />,
};

interface Props {
  matchId: string;
  user: SessionUserDTO | null;
  onRated: () => void;
}

export default function MatchPage({ matchId, user, onRated }: Props) {
  const [version, setVersion] = useState(0);
  const { data, error } = useFetch<MatchDetail>(`/api/public/matches/${matchId}`, version);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const m = data?.match;
  const canEdit = m && user && ["REFEREE", "LEAGUE_ADMIN", "SUPER_ADMIN"].includes(user.role);

  async function submitRating() {
    if (!m || !rating) return;
    setSubmitting(true);
    const res = await apiPost("/api/admin/ratings", { matchId: m.id, rating, comment });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Оценка судьи сохранена");
    setVersion((v) => v + 1);
    setRating(0);
    setComment("");
    onRated();
  }

  if (error) return <EmptyState title="Матч не найден" hint={error} />;
  if (!data || !m) return <LoadingBlock label="Загрузка матча..." />;

  return (
    <div className="space-y-3">
      {/* ---------- Шапка ---------- */}
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => history.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
            aria-label="Назад"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/league/${m.league.id}`)}
              className="text-sm font-bold text-zinc-800 hover:text-emerald-700"
            >
              {m.league.name}
            </button>
            <p className="text-xs text-zinc-400">{m.round ? `${m.round}-й тур · ` : ""}{m.season.name}</p>
          </div>
          <div className="ml-auto"><StatusBadge status={m.status} /></div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-400">
          <span>{fmtDate(m.kickoff)}</span>
          {m.stadium && (
            <button className="flex items-center gap-1 hover:text-emerald-600" onClick={() => navigate(`/stadium/${m.stadium!.id}`)}>
              <MapPin className="h-3 w-3" /> {m.stadium.name}
            </button>
          )}
          <span className="flex items-center gap-1">
            <Flag className="h-3 w-3" />
            {m.referee ? (
              <button className="hover:text-emerald-600" onClick={() => navigate(`/player/${m.referee!.id}`)}>{m.referee.name}</button>
            ) : "судья не назначен"}
          </span>
        </div>
      </div>

      {/* ---------- Счёт ---------- */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="bg-zinc-900 p-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <button className="min-w-0 flex-1 text-right" onClick={() => navigate(`/team/${m.homeTeam.id}`)}>
              <p className="truncate text-base font-bold hover:text-emerald-300">{m.homeTeam.name}</p>
              <p className="text-xs text-zinc-400">хозяева{m.homeTeam.clubName ? ` · ${m.homeTeam.clubName}` : ""}</p>
            </button>
            <div className="shrink-0 text-center">
              <div className="font-mono text-3xl font-extrabold tabular-nums">
                <ScoreBox score={matchScore(m)} status={m.status} />
              </div>
              {m.status === "LIVE" && <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-red-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />матч идёт</p>}
              {m.status === "WALKOVER" && (
                <p className="mt-1 text-[11px] text-amber-400">
                  {m.walkoverType === "HOME" && `неявка хозяев · регламент ${m.regulationScore}:0`}
                  {m.walkoverType === "AWAY" && `неявка гостей · регламент ${m.regulationScore}:0`}
                  {m.walkoverType === "BOTH" && "обе неявки · 0:0, обеим 0 очков"}
                </p>
              )}
            </div>
            <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/team/${m.awayTeam.id}`)}>
              <p className="truncate text-base font-bold hover:text-emerald-300">{m.awayTeam.name}</p>
              <p className="text-xs text-zinc-400">гости{m.awayTeam.clubName ? ` · ${m.awayTeam.clubName}` : ""}</p>
            </button>
          </div>
          {m.note && <p className="mt-4 rounded-lg bg-zinc-800 p-2.5 text-center text-xs text-amber-300">{m.note}</p>}
        </div>

        {canEdit && (m.status === "SCHEDULED" || m.status === "LIVE") && (
          <div className="p-3">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate(`/admin/${m.id}`)}>
              <ClipboardPen className="mr-1 h-4 w-4" /> Ввод протокола матча
            </Button>
          </div>
        )}

        {m.status === "WALKOVER" && (
          <div className="flex items-start gap-2 border-t border-zinc-100 bg-amber-50 p-3 text-xs text-amber-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Матч не проводился. Голы и карточки WO-матчей не учитываются в индивидуальной статистике (инвариант Epic 2).</p>
          </div>
        )}
      </div>

      {/* ---------- Хронология ---------- */}
      {m.events.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-bold">Хронология событий</p>
          <div className="space-y-1">
            {m.events.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/player/${e.person.id}`)}
                className={`flex w-full items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-left text-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/30 ${e.teamId === m.homeTeam.id ? "" : "flex-row-reverse text-right"}`}
              >
                <span className="w-9 shrink-0 font-mono text-xs text-zinc-400">{e.minute}&apos;</span>
                {EVENT_ICONS[e.type] ?? <Goal className="h-4 w-4" />}
                <span className="flex-1">
                  <span className="font-medium">{e.person.name}</span>
                  <span className="ml-2 text-xs text-zinc-400">{EVENT_LABELS[e.type] ?? e.type}</span>
                  {e.assist && (
                    <span className="ml-1 text-xs text-zinc-400">
                      (ассист.: <span className="hover:text-emerald-600">{e.assist.name}</span>)
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Составы ---------- */}
      {m.lineups.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-bold">Заявленные составы</p>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[m.homeTeam, m.awayTeam].map((team) => (
              <div key={team.id} className="rounded-xl border border-zinc-200 p-3">
                <button className="mb-1.5 text-xs font-bold text-zinc-600 hover:text-emerald-700" onClick={() => navigate(`/team/${team.id}`)}>
                  {team.name}
                </button>
                {m.lineups.filter((l) => l.teamId === team.id).map((l) => (
                  <button key={l.id} className="flex w-full items-center gap-2 py-0.5 text-left hover:text-emerald-700" onClick={() => navigate(`/player/${l.person.id}`)}>
                    <span className="w-6 text-center font-mono text-xs text-zinc-400">{l.number ?? "—"}</span>
                    <span className="truncate">{l.person.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Оценка судейства ---------- */}
      {m.status === "COMPLETED" && m.referee && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-bold">Оценка судейства</p>
          {m.ratings.length > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-4 w-4 ${i <= Math.round(m.ratings.reduce((a, r) => a + r.rating, 0) / m.ratings.length) ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`} />
                ))}
              </div>
              <span className="font-mono text-sm font-bold">{(m.ratings.reduce((a, r) => a + r.rating, 0) / m.ratings.length).toFixed(1)}</span>
              <span className="text-xs text-zinc-400">({m.ratings.length} оценок, авторы скрыты)</span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">Оценок пока нет</p>
          )}

          {user && user.personId !== m.referee.id && (
            <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} onClick={() => setRating(i)} className="transition-transform hover:scale-110" aria-label={`Оценка ${i}`}>
                    <Star className={`h-6 w-6 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Комментарий (необязательно, анонимно)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
              <Button size="sm" disabled={!rating || submitting} onClick={submitRating} className="bg-emerald-600 hover:bg-emerald-700">
                Отправить оценку
              </Button>
            </div>
          )}
          {!user && <p className="mt-2 text-xs text-zinc-400">Войдите в систему, чтобы оценить судью</p>}
        </div>
      )}
    </div>
  );
}
