import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";

/** Публичный список дисквалификаций сезона */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) return Response.json({ error: "Укажите seasonId" }, { status: 422 });

    const suspensions = await db.suspension.findMany({
      where: { seasonId },
      include: {
        person: { include: { registrations: { where: { seasonId }, include: { team: true } } } },
        season: { include: { league: true } },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    return Response.json({
      suspensions: suspensions.map((s) => {
        const reg = s.person.registrations[0];
        return {
          id: s.id,
          person: { id: s.person.id, name: `${s.person.lastName} ${s.person.firstName}` },
          team: reg ? { id: reg.team.id, name: reg.team.name } : null,
          league: { name: s.season.league.name },
          source: s.source,
          reason: s.reason,
          matchesTotal: s.matchesTotal,
          matchesServed: s.matchesServed,
          isLifetime: s.isLifetime,
          isActive: s.isActive,
          createdAt: s.createdAt.toISOString(),
        };
      }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
