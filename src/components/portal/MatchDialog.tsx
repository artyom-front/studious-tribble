"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Goal, TriangleAlert, OctagonX, Repeat, Star, MapPin, Flag, ClipboardPen, Info } from "lucide-react";
import { useFetch, fmtDate, apiPost } from "./hooks";
import type { MatchDTO, SessionUserDTO } from "./types";
import { EVENT_LABELS, STATUS_LABELS } from "./types";
import { ScoreBox, StatusBadge, matchScore, LoadingBlock } from "./ui-bits";

interface MatchDetail {
  match: MatchDTO & {
    events: { id: string; minute: number; type: string; person: { id: string; name: string }; assist: { id: string; name: string } | null; teamId: string }[];
    lineups: { id: string; teamId: string; person: { id: string; name: string; position: string | null }; isStarter: boolean; number: number | null }[];
    ratings: { id: string; rating: number; comment: string | null; authorRole: string }[];
    season: { id: string; name: string };
    referee: { id: string; name: string } | null;
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
  matchId: string | null;
  onClose: () => void;
  user: SessionUserDTO | null;
  onRated: () => void;
  onEditProtocol: (matchId: string) => void;
}

export default function MatchDialog({ matchId, onClose, user, onRated, onEditProtocol }: Props) {
  const [version, setVersion] = useState(0);
  const { data } = useFetch<MatchDetail>(matchId ? `/api/public/matches/${matchId}` : null, version);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const m = data?.match;
  const canEdit = m && user && ["REFEREE", "LEAGUE_ADMIN", "SUPER_ADMIN"].includes(user.role);
  const alreadyRated = m && user ? m.ratings.length > 0 && hasRated(m.ratings, user.id) : false;

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

  if (!matchId) return null;

  return (
    <Dialog open={!!matchId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {(!data || !m) && <LoadingBlock label="Загрузка матча..." />}
        {data && m && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg">
                  {m.round ? `${m.round}-й тур · ` : ""}{m.season.name}
                </DialogTitle>
                <StatusBadge status={m.status} />
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                <span>{fmtDate(m.kickoff)}</span>
                {m.stadium && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.stadium.name}</span>}
                <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{m.referee?.name ?? "судья не назначен"}</span>
              </p>
            </DialogHeader>

            {/* Счёт */}
            <div className="rounded-xl bg-zinc-900 p-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-right">
                  <p className="font-semibold">{m.homeTeam.name}</p>
                  <p className="text-xs text-zinc-400">хозяева</p>
                </div>
                <div className="text-center">
                  <div className="font-mono text-3xl font-bold">
                    <ScoreBox score={matchScore(m)} status={m.status} />
                  </div>
                  {m.status === "WALKOVER" && (
                    <p className="mt-1 text-[11px] text-amber-400">
                      {m.walkoverType === "HOME" && `неявка хозяев · регламент ${m.regulationScore}:0`}
                      {m.walkoverType === "AWAY" && `неявка гостей · регламент ${m.regulationScore}:0`}
                      {m.walkoverType === "BOTH" && "обе неявки · 0:0, обеим 0 очков"}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{m.awayTeam.name}</p>
                  <p className="text-xs text-zinc-400">гости</p>
                </div>
              </div>
              {m.note && <p className="mt-3 rounded-lg bg-zinc-800 p-2 text-center text-xs text-amber-300">{m.note}</p>}
            </div>

            {m.status === "WALKOVER" && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Матч не проводился. Голы и карточки WO-матчей не учитываются в индивидуальной статистике (инвариант Epic 2).</p>
              </div>
            )}

            {/* Кнопка редактирования протокола */}
            {canEdit && (m.status === "SCHEDULED" || m.status === "LIVE") && (
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => { onClose(); onEditProtocol(m.id); }}>
                <ClipboardPen className="mr-1 h-4 w-4" /> Ввод протокола матча
              </Button>
            )}

            {/* События */}
            {m.events.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Хронология событий</p>
                <div className="space-y-1">
                  {m.events.map((e) => (
                    <div key={e.id} className={`flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-sm ${e.teamId === m.homeTeam.id ? "" : "flex-row-reverse text-right"}`}>
                      <span className="w-9 shrink-0 font-mono text-xs text-zinc-400">{e.minute}&apos;</span>
                      {EVENT_ICONS[e.type] ?? <Goal className="h-4 w-4" />}
                      <span className="flex-1">
                        <span className="font-medium">{e.person.name}</span>
                        <span className="ml-2 text-xs text-zinc-400">{EVENT_LABELS[e.type] ?? e.type}</span>
                        {e.assist && <span className="ml-1 text-xs text-zinc-400">(ассист.: {e.assist.name})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Составы */}
            {m.lineups.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Заявленные составы</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[m.homeTeam, m.awayTeam].map((team) => (
                    <div key={team.id} className="rounded-xl border border-zinc-200 p-3">
                      <p className="mb-1.5 text-xs font-semibold text-zinc-500">{team.name}</p>
                      {m.lineups.filter((l) => l.teamId === team.id).map((l) => (
                        <p key={l.id} className="flex items-center gap-2 py-0.5">
                          <span className="w-6 text-center font-mono text-xs text-zinc-400">{l.number ?? "—"}</span>
                          <span className="truncate">{l.person.name}</span>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Оценка судьи */}
            {m.status === "COMPLETED" && m.referee && (
              <div className="rounded-xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold">Оценка судейства</p>
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

                {user && !alreadyRated && user.personId !== m.referee.id && (
                  <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button key={i} onClick={() => setRating(i)} className="transition-transform hover:scale-110">
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
                {!user && (
                  <p className="mt-2 text-xs text-zinc-400">Войдите в систему, чтобы оценить судью</p>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function hasRated(ratings: { authorRole: string }[], _userId: string): boolean {
  // авторство скрыто даже от самого автора в UI — проверка через попытку повторной оценки
  // сервер гарантирует уникальность; здесь показываем форму, ошибка 409 подскажет
  void ratings; void _userId;
  return false;
}
