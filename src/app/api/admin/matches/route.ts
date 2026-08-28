// Список матчей для админ-панели/судьи: REFEREE видит только свои назначения.

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const user = await requireRole("REFEREE", "CLUB_ADMIN", "LEAGUE_ADMIN", "SUPER_ADMIN");
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) return Response.json({ error: "Укажите seasonId" }, { status: 422 });

    const matches = await db.match.findMany({
      where: {
        stage: { seasonId },
        ...(user.role === "REFEREE" ? { refereeId: user.personId ?? "__none__" } : {}),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
        stage: { include: { season: { include: { league: true } } } },
      },
      orderBy: [{ round: "asc" }, { kickoff: "asc" }],
    });

    return Response.json({
      matches: matches.map((m) => ({
        id: m.id,
        round: m.round,
        kickoff: m.kickoff.toISOString(),
        status: m.status,
        walkoverType: m.walkoverType,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name },
        awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name },
        referee: m.referee ? { id: m.referee.id, name: `${m.referee.lastName} ${m.referee.firstName}` } : null,
        eventsCount: 0,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
