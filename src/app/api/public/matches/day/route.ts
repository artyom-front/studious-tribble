// Livescore-лента: матчи по дате (МСК) и формату, сгруппированные по лигам (текущие сезоны).
// Каждый матч обогащается сигналами турнира: серии команд, важность,
// «без бомбардира», «новый тренер» — чтобы зритель сразу видел, на что смотреть.

import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { toMatchDTO, seasonStandings } from "@/lib/queries";
import { buildSignalsContext, matchSignals } from "@/lib/engine/signals";

const FORMATS = ["F11", "F8", "F6", "FUTSAL"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? "today"; // YYYY-MM-DD | today | all
    const format = searchParams.get("format") ?? "all";

    const leagues = await db.league.findMany({
      where: FORMATS.includes(format) ? { format } : {},
      include: { seasons: { where: { isCurrent: true }, take: 1 } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    // границы МСК-дня в UTC
    let start: Date | null = null;
    let end: Date | null = null;
    if (date !== "all") {
      const day = date === "today" ? new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10) : date;
      const [y, mo, d] = day.split("-").map(Number);
      start = new Date(Date.UTC(y, mo - 1, d) - 3 * 3600 * 1000);
      end = new Date(Date.UTC(y, mo - 1, d + 1) - 3 * 3600 * 1000);
    }

    const result = [];
    for (const league of leagues) {
      const season = league.seasons[0];
      if (!season) continue;
      const matches = await db.match.findMany({
        where: {
          stage: { seasonId: season.id },
          ...(start && end ? { kickoff: { gte: start, lt: end } } : {}),
        },
        include: {
          homeTeam: { include: { club: true } },
          awayTeam: { include: { club: true } },
          stadium: true,
          referee: true,
        },
        orderBy: { kickoff: "asc" },
      });
      if (matches.length === 0) continue;

      // сигналы турнира: считаются по всему сезону (стрики — полная история)
      const standings = await seasonStandings(season.id);
      const ctx = await buildSignalsContext(season.id);

      result.push({
        league: {
          id: league.id, name: league.name, shortName: league.shortName, format: league.format,
          isPinned: league.isPinned, walkoverScore: league.walkoverScore,
        },
        season: { id: season.id, name: season.name },
        matches: matches.map((m) => ({
          ...toMatchDTO(m, league.walkoverScore),
          signals: matchSignals(
            { id: m.id, round: m.round, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId },
            ctx,
            standings
          ),
        })),
      });
    }

    return Response.json({ date: date === "all" ? null : (start ? start.toISOString() : null), leagues: result });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
