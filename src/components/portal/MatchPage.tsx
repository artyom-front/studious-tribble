"use client";

// Страница матча «Ночь под прожекторами»: геро с гербами и золотым счётом,
// инфо-чипы (дата/стадион/судья/тур), вкладки Хронология · Составы · Судейство.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Goal, Repeat, Star, MapPin, Flag, ClipboardPen, Info, CalendarDays, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch, fmtDate, apiPost } from "./hooks";
import { navigate } from "./router";
import type { MatchDTO, SessionUserDTO } from "./types";
import { EVENT_LABELS } from "@/lib/labels";
import { StatusBadge, matchScore, LoadingBlock, EmptyState } from "./ui-bits";
import { Breadcrumbs, Crest, Avatar } from "./visuals";

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

/** Иконка события протокола */
function EventIcon({ type }: { type: string }) {
  if (type === "GOAL" || type === "PENALTY") return <Goal className="h-4 w-4 text-gold" />;
  if (type === "OWN_GOAL") return <Goal className="h-4 w-4 text-live" />;
  if (type === "YELLOW_CARD") return <span className="inline-block h-4 w-3 rounded-[2px] bg-amber-400" />;
  if (type === "RED_CARD") return <span className="inline-block h-4 w-3 rounded-[2px] bg-live" />;
  return <Repeat className="h-4 w-4 text-ink3" />;
}

interface Props {
  matchId: string;
  user: SessionUserDTO | null;
  onRated: () => void;
}

type Tab = "timeline" | "lineups" | "referee";

export default function MatchPage({ matchId, user, onRated }: Props) {
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<Tab>("timeline");
  const { data, error } = useFetch<MatchDetail>(`/api/public/matches/${matchId}`, version);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const m = data?.match;
  const canEdit = m && user && ["REFEREE", "LEAGUE_ADMIN", "SUPER_ADMIN"].includes(user.role);
  const hasLineups = m && m.lineups.length > 0;

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

  const score = matchScore(m);
  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "timeline", label: `Хронология${m.events.length ? ` · ${m.events.length}` : ""}` },
    { id: "lineups", label: "Составы", hidden: !hasLineups },
    { id: "referee", label: "Судейство", hidden: !m.referee },
  ];
  const avgRating = m.ratings.length > 0 ? m.ratings.reduce((a, r) => a + r.rating, 0) / m.ratings.length : null;

  return (
    <div className="space-y-3">
      <Breadcrumbs
        items={[
          { label: "Главная", onClick: () => navigate("/") },
          { label: m.league.name, onClick: () => navigate(`/league/${m.league.id}`) },
          { label: `${m.homeTeam.name} — ${m.awayTeam.name}` },
        ]}
        className="px-1"
      />

      {/* ---------- Геро матча ---------- */}
      <div className="overflow-hidden rounded-2xl border border-sline bg-s1">
        <div className="stadium-glow px-4 py-6 sm:px-8">
          <div className="flex items-center justify-center gap-3">
            <button className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center" onClick={() => navigate(`/team/${m.homeTeam.id}`)}>
              <Crest name={m.homeTeam.name} id={m.homeTeam.id} size="xl" className="ring-1 ring-white/10" />
              <span className="min-w-0">
                <span className="block truncate text-base font-bold text-ink hover:text-gold">{m.homeTeam.name}</span>
                <span className="text-xs text-ink3">хозяева</span>
              </span>
            </button>

            <div className="shrink-0 px-2 text-center">
              <div className="font-mono text-4xl font-black tabular sm:text-5xl">
                {score ? (
                  <span className={m.status === "LIVE" ? "text-live" : "text-gold"}>
                    {score.home}<span className="mx-1.5 text-ink3">:</span>{score.away}
                  </span>
                ) : (
                  <span className="text-ink3">— : —</span>
                )}
              </div>
              {m.status === "LIVE" && (
                <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-live">
                  <span className="h-1.5 w-1.5 rounded-full bg-live live-dot" />матч идёт
                </p>
              )}
              {m.status === "WALKOVER" && (
                <p className="mt-1.5 text-[11px] text-amber-400">
                  {m.walkoverType === "HOME" && `неявка хозяев · регламент ${m.regulationScore}:0`}
                  {m.walkoverType === "AWAY" && `неявка гостей · регламент ${m.regulationScore}:0`}
                  {m.walkoverType === "BOTH" && "обе неявки · 0:0, обеим 0 очков"}
                </p>
              )}
              {m.status === "POSTPONED" && <p className="mt-1.5 text-[11px] text-ink3">перенесён</p>}
            </div>

            <button className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center" onClick={() => navigate(`/team/${m.awayTeam.id}`)}>
              <Crest name={m.awayTeam.name} id={m.awayTeam.id} size="xl" className="ring-1 ring-white/10" />
              <span className="min-w-0">
                <span className="block truncate text-base font-bold text-ink hover:text-gold">{m.awayTeam.name}</span>
                <span className="text-xs text-ink3">гости</span>
              </span>
            </button>
          </div>
        </div>

        {/* Инфо-чипы */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sline/60 px-4 py-3 text-xs text-ink2">
          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-ink3" />{fmtDate(m.kickoff)}</span>
          {m.round && <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-ink3" />{m.round}-й тур · {m.season.name}</span>}
          {m.stadium && (
            <button className="flex items-center gap-1.5 hover:text-gold" onClick={() => navigate(`/stadium/${m.stadium!.id}`)}>
              <MapPin className="h-3.5 w-3.5 text-ink3" />{m.stadium.name}
            </button>
          )}
          <span className="flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 text-ink3" />
            {m.referee ? (
              <button className="hover:text-gold" onClick={() => navigate(`/player/${m.referee!.id}`)}>судья: {m.referee.name}</button>
            ) : (
              "судья не назначен"
            )}
          </span>
          <span className="ml-auto"><StatusBadge status={m.status} /></span>
        </div>

        {m.note && <p className="border-t border-sline/60 bg-amber-400/10 px-4 py-2.5 text-center text-xs text-amber-300">{m.note}</p>}

        {canEdit && (m.status === "SCHEDULED" || m.status === "LIVE") && (
          <div className="border-t border-sline/60 p-3">
            <Button className="w-full bg-gold text-goldink hover:bg-gold/85" onClick={() => navigate(`/admin/${m.id}`)}>
              <ClipboardPen className="mr-1 h-4 w-4" /> Ввод протокола матча
            </Button>
          </div>
        )}

        {m.status === "WALKOVER" && (
          <div className="flex items-start gap-2 border-t border-sline/60 bg-s2/50 p-3 text-xs text-ink2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>Матч не проводился. Голы и карточки WO-матчей не учитываются в индивидуальной статистике (инвариант Epic 2).</p>
          </div>
        )}
      </div>

      {/* ---------- Вкладки ---------- */}
      <div className="overflow-hidden rounded-xl border border-sline bg-s1">
        <div className="flex gap-1 overflow-x-auto border-b border-sline/60 px-2 scrollbar-none">
          {tabs.filter((t) => !t.hidden).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative shrink-0 px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === t.id ? "text-gold" : "text-ink2 hover:text-ink"
              )}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold" />}
            </button>
          ))}
        </div>

        {/* ---- Хронология ---- */}
        {tab === "timeline" && (
          <div className="p-3">
            {m.events.length === 0 && (
              <EmptyState
                icon={<Goal className="h-6 w-6 opacity-50" />}
                title="Событий пока нет"
                hint={m.status === "SCHEDULED" ? "Матч ещё не начался — события появятся во время игры" : "Протокол пуст"}
              />
            )}
            <div className="space-y-1">
              {m.events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => navigate(`/player/${e.person.id}`)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-sline/50 bg-s2/30 px-3 py-2 text-left text-sm transition-colors hover:border-gold/40 hover:bg-s2/70",
                    e.teamId === m.homeTeam.id ? "" : "flex-row-reverse text-right"
                  )}
                >
                  <span className="flex w-11 shrink-0 items-center justify-center rounded-md bg-s2 py-0.5 font-mono text-xs text-ink2">
                    {e.minute}&apos;
                  </span>
                  <span className="flex shrink-0 items-center justify-center"><EventIcon type={e.type} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{e.person.name}</span>
                    <span className="ml-2 text-xs text-ink3">{EVENT_LABELS[e.type] ?? e.type}</span>
                    {e.assist && (
                      <span className="ml-1 text-xs text-ink3">
                        (ассист.: <span className="hover:text-gold">{e.assist.name}</span>)
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Составы ---- */}
        {tab === "lineups" && hasLineups && (
          <div className="grid grid-cols-1 gap-3 p-3 text-sm sm:grid-cols-2">
            {[m.homeTeam, m.awayTeam].map((team) => (
              <div key={team.id} className="rounded-xl border border-sline/50 p-3">
                <button
                  className="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:text-gold"
                  onClick={() => navigate(`/team/${team.id}`)}
                >
                  <Crest name={team.name} id={team.id} size="sm" />
                  <span className="text-xs font-bold text-ink2">{team.name}</span>
                </button>
                {m.lineups.filter((l) => l.teamId === team.id).map((l) => (
                  <button key={l.id} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-ink2 hover:text-ink" onClick={() => navigate(`/player/${l.person.id}`)}>
                    <span className="w-6 text-center font-mono text-xs text-ink3">{l.number ?? "—"}</span>
                    <Avatar name={l.person.name} id={l.person.id} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{l.person.name}</span>
                    {!l.isStarter && <span className="text-[10px] text-ink3">запас</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ---- Судейство ---- */}
        {tab === "referee" && m.referee && (
          <div className="p-4">
            <button
              onClick={() => navigate(`/player/${m.referee!.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-sline/50 bg-s2/30 p-3 text-left transition-colors hover:border-gold/40"
            >
              <Avatar name={m.referee.name} id={m.referee.id} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">{m.referee.name}</span>
                <span className="text-xs text-ink3">главный судья матча · профиль →</span>
              </span>
              <Flag className="h-4 w-4 shrink-0 text-gold" />
            </button>

            <div className="mt-4">
              <p className="text-sm font-bold text-ink">Оценка судейства</p>
              {m.ratings.length > 0 ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={cn("h-4 w-4", i <= Math.round(avgRating!) ? "fill-gold text-gold" : "text-ink3")} />
                    ))}
                  </div>
                  <span className="font-mono text-sm font-bold text-gold">{avgRating!.toFixed(1)}</span>
                  <span className="text-xs text-ink3">({m.ratings.length} оценок, авторы скрыты)</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-ink3">Оценок пока нет</p>
              )}

              {user && user.personId !== m.referee.id && m.status === "COMPLETED" && (
                <div className="mt-3 space-y-2 border-t border-sline/60 pt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} onClick={() => setRating(i)} className="transition-transform hover:scale-110" aria-label={`Оценка ${i}`}>
                        <Star className={cn("h-6 w-6", i <= rating ? "fill-gold text-gold" : "text-ink3")} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Комментарий (необязательно, анонимно)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="border-sline bg-s1 text-ink placeholder:text-ink3"
                  />
                  <Button size="sm" disabled={!rating || submitting} onClick={submitRating} className="bg-gold text-goldink hover:bg-gold/85">
                    Отправить оценку
                  </Button>
                </div>
              )}
              {!user && <p className="mt-2 text-xs text-ink3">Войдите в систему, чтобы оценить судью</p>}
              {user && user.personId === m.referee.id && <p className="mt-2 text-xs text-ink3">Судья не может оценивать сам себя</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
