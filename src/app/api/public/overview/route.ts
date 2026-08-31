import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";

/** Обзор портала: лиги, сезоны, агрегированная статистика */
export async function GET() {
  try {
    const leagues = await db.league.findMany({
      include: { seasons: { orderBy: { startDate: "desc" } } },
      orderBy: { createdAt: "asc" },
    });

    const [persons, teams, matches, goals, events, activeSuspensions, clubs, referees] = await Promise.all([
      db.person.count(),
      db.team.count(),
      db.match.count(),
      db.matchEvent.count({ where: { type: { in: ["GOAL", "PENALTY"] } } }),
      db.matchEvent.count(),
      db.suspension.count({ where: { isActive: true } }),
      db.club.count(),
      db.person.count({ where: { isReferee: true } }),
    ]);

    return Response.json({
      leagues: leagues.map((l) => ({
        id: l.id,
        name: l.name,
        shortName: l.shortName,
        format: l.format,
        isPinned: l.isPinned,
        priority: l.priority,
        yellowCardLimit: l.yellowCardLimit,
        redCardBanMatches: l.redCardBanMatches,
        walkoverScore: l.walkoverScore,
        transferWindowEnd: l.transferWindowEnd?.toISOString() ?? null,
        seasons: l.seasons.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate.toISOString(),
          isCurrent: s.isCurrent,
        })),
      })),
      stats: { persons, teams, matches, goals, events, activeSuspensions, clubs, referees },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
