// Профиль стадиона: характеристики, сыгранные и предстоящие матчи, статистика.

import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { toMatchDTO } from "@/lib/queries";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const stadium = await db.stadium.findUnique({ where: { id } });
    if (!stadium) throw new HttpError(404, "Стадион не найден");

    const matches = await db.match.findMany({
      where: { stadiumId: id },
      include: {
        homeTeam: { include: { club: true } },
        awayTeam: { include: { club: true } },
        stadium: true,
        referee: true,
        stage: { include: { season: { include: { league: true } } } },
      },
      orderBy: { kickoff: "desc" },
      take: 60,
    });

    const played = matches.filter((m) => m.status === "COMPLETED" || m.status === "WALKOVER");
    const goals = played.reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);

    return Response.json({
      stadium: { id: stadium.id, name: stadium.name, city: stadium.city, address: stadium.address, capacity: stadium.capacity },
      stats: { hosted: played.length, goals, avgGoals: played.length ? +(goals / played.length).toFixed(1) : 0 },
      matches: matches.map((m) => ({
        ...toMatchDTO(m, m.stage.season.league.walkoverScore),
        league: { id: m.stage.season.league.id, name: m.stage.season.league.name, format: m.stage.season.league.format },
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
