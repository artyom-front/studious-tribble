import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { seasonPlayerStats } from "@/lib/engine/stats";

/** Профиль игрока: статистика по сезонам, события, дисквалификации */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const person = await db.person.findUnique({
      where: { id },
      include: {
        registrations: { include: { team: { include: { club: true } }, season: { include: { league: true } } }, orderBy: { startDate: "desc" } },
        suspensions: { include: { season: { include: { league: true } } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!person) throw new HttpError(404, "Игрок не найден");

    const seasonIds = [...new Set(person.registrations.map((r) => r.seasonId))];
    const statsBySeason = [];
    for (const seasonId of seasonIds) {
      const stats = (await seasonPlayerStats(seasonId)).find((s) => s.personId === id);
      const season = person.registrations.find((r) => r.seasonId === seasonId)!.season;
      if (stats) statsBySeason.push({ season: { id: season.id, name: season.name, league: season.league.name }, stats });
    }

    const events = await db.matchEvent.findMany({
      where: { OR: [{ personId: id }, { assistPersonId: id }] },
      include: { match: { include: { homeTeam: true, awayTeam: true, stage: { include: { season: true } } } } },
      orderBy: { minute: "asc" },
      take: 50,
    });

    return Response.json({
      player: {
        id: person.id,
        name: `${person.lastName} ${person.firstName} ${person.middleName ?? ""}`.trim(),
        birthDate: person.birthDate?.toISOString() ?? null,
        position: person.position,
        isReferee: person.isReferee,
        registrations: person.registrations.map((r) => ({
          team: { id: r.team.id, name: r.team.name, clubName: r.team.club?.name ?? null },
          season: { id: r.season.id, name: r.season.name, league: r.season.league.name },
          startDate: r.startDate.toISOString(),
          endDate: r.endDate?.toISOString() ?? null,
          number: r.number,
        })),
        suspensions: person.suspensions.map((s) => ({
          league: s.season.league.name,
          source: s.source,
          reason: s.reason,
          matchesTotal: s.matchesTotal,
          matchesServed: s.matchesServed,
          isLifetime: s.isLifetime,
          isActive: s.isActive,
          createdAt: s.createdAt.toISOString(),
        })),
        statsBySeason,
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          minute: e.minute,
          isAssist: e.assistPersonId === id,
          match: {
            id: e.match.id,
            home: e.match.homeTeam.name,
            away: e.match.awayTeam.name,
            status: e.match.status,
            kickoff: e.match.kickoff.toISOString(),
          },
        })),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
