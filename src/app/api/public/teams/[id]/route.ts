// Профиль команды: клуб, город, составы по сезонам (игроки + тренеры), матчи, позиция в таблице.

import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { toMatchDTO, seasonStandings } from "@/lib/queries";

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

    const seasonsMap = new Map<string, { season: { id: string; name: string; league: { id: string; name: string; format: string } }; players: { id: string; name: string; position: string | null; number: number | null; endDate: string | null }[]; coaches: { id: string; name: string; endDate: string | null }[] }>();
    for (const r of regs) {
      if (!seasonsMap.has(r.seasonId)) {
        seasonsMap.set(r.seasonId, {
          season: { id: r.season.id, name: r.season.name, league: { id: r.season.league.id, name: r.season.league.name, format: r.season.league.format } },
          players: [], coaches: [],
        });
      }
      const entry = seasonsMap.get(r.seasonId)!;
      const name = `${r.person.lastName} ${r.person.firstName}`;
      if (r.role === "COACH") entry.coaches.push({ id: r.personId, name, endDate: r.endDate?.toISOString() ?? null });
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

    // позиция в таблице текущего сезона каждой лиги
    const standings = [];
    for (const [seasonId, entry] of seasonsMap) {
      if (!entry.season) continue;
      const rows = await seasonStandings(seasonId);
      const row = rows.find((r) => r.teamId === id);
      if (row) standings.push({ season: entry.season, position: row.position, points: row.points, games: row.games, wins: row.wins, draws: row.draws, losses: row.losses, goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst });
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
