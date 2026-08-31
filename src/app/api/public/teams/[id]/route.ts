// Профиль команды: клуб, город, составы по сезонам (игроки + тренеры), матчи, позиция в таблице,
// + сигналы: серия результатов, лучший бомбардир, смена тренера.

import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { toMatchDTO, seasonStandings } from "@/lib/queries";
import { buildSignalsContext, computeStreak } from "@/lib/engine/signals";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const team = await db.team.findUnique({ where: { id }, include: { club: true } });
    if (!team) throw new HttpError(404, "Команда не найдена");

    // все заявки команды (по всем сезонам), свежие сезоны первыми
    const regs = await db.registration.findMany({
      where: { teamId: id },
      include: { person: true, season: { include: { league: true } } },
      orderBy: { startDate: "desc" },
    });

    const seasonsMap = new Map<string, { season: { id: string; name: string; league: { id: string; name: string; format: string } }; players: { id: string; name: string; position: string | null; number: number | null; endDate: string | null }[]; coaches: { id: string; name: string; endDate: string | null; startDate: string }[] }>();
    for (const r of regs) {
      if (!seasonsMap.has(r.seasonId)) {
        seasonsMap.set(r.seasonId, {
          season: { id: r.season.id, name: r.season.name, league: { id: r.season.league.id, name: r.season.league.name, format: r.season.league.format } },
          players: [], coaches: [],
        });
      }
      const entry = seasonsMap.get(r.seasonId)!;
      const name = `${r.person.lastName} ${r.person.firstName}`;
      if (r.role === "COACH") entry.coaches.push({ id: r.personId, name, endDate: r.endDate?.toISOString() ?? null, startDate: r.startDate.toISOString() });
      else entry.players.push({ id: r.personId, name, position: r.person.position, number: r.number, endDate: r.endDate?.toISOString() ?? null });
    }
    for (const entry of seasonsMap.values()) {
      entry.players.sort((a, b) => (a.number ?? 99) - (b.number ?? 99) || a.name.localeCompare(b.name, "ru"));
    }

    // матчи команды по всем текущим сезонам
    const teamMatches = await db.match.findMany({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }], stage: { season: { isCurrent: true } } },
      include: {
        homeTeam: { include: { club: true } },
        awayTeam: { include: { club: true } },
        stadium: true,
        referee: true,
        stage: { include: { season: { include: { league: true } } } },
      },
      orderBy: { kickoff: "desc" },
    });

    // позиция в таблице текущего сезона каждой лиги + сигналы сезона
    const standings = [];
    const monthAgo = new Date(Date.now() - 30 * 86400000);
    for (const [seasonId, entry] of seasonsMap) {
      if (!entry.season) continue;
      const rows = await seasonStandings(seasonId);
      const row = rows.find((r) => r.teamId === id);
      if (!row) continue;

      const ctx = await buildSignalsContext(seasonId);
      const streak = computeStreak(ctx.matches, id);
      const topScorer = ctx.topScorers.get(id) ?? null;
      const topScorerOut = !!topScorer && ctx.suspended.has(topScorer.personId);
      const currentCoach = entry.coaches.find((c) => !c.endDate) ?? null;
      const coachChanged = currentCoach ? new Date(currentCoach.startDate) >= monthAgo : false;
      const newCoachName = coachChanged ? currentCoach!.name : null;

      standings.push({
        season: entry.season,
        position: row.position, points: row.points, games: row.games,
        wins: row.wins, draws: row.draws, losses: row.losses,
        goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, form: row.form ?? [],
        streak, topScorer: topScorerOut ? { ...topScorer!, out: true } : topScorer,
        newCoach: newCoachName ? { name: newCoachName } : null,
      });
    }

    return Response.json({
      team: {
        id: team.id, name: team.name, city: team.city, logoUrl: team.logoUrl,
        club: team.club ? { id: team.club.id, name: team.club.name, city: team.club.city, description: team.club.description } : null,
      },
      seasons: [...seasonsMap.values()],
      standings,
      matches: teamMatches.map((m) => ({
        ...toMatchDTO(m, m.stage.season.league.walkoverScore),
        league: { id: m.stage.season.league.id, name: m.stage.season.league.name, format: m.stage.season.league.format },
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
