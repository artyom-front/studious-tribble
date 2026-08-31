import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { seasonPlayerStats, refereeStats } from "@/lib/engine/stats";

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
      if (stats) statsBySeason.push({
        season: { id: season.id, name: season.name, league: season.league.name },
        team: { id: stats.teamId, name: stats.teamName },
        stats,
      });
    }

    const events = await db.matchEvent.findMany({
      where: { OR: [{ personId: id }, { assistPersonId: id }] },
      include: { match: { include: { homeTeam: true, awayTeam: true, stage: { include: { season: true } } } } },
      orderBy: { minute: "asc" },
      take: 50,
    });

    // Судейская карьера (PRD §4: человек может быть игроком И судьёй)
    let referee: { matches: number; yellowAvg: number; redAvg: number; penaltyAvg: number; avgRating: number | null; ratingsCount: number; debut: string | null; byLeague: { league: string; matches: number; yellowAvg: number; redAvg: number; avgRating: number | null }[]; matchList: { id: string; kickoff: string; home: string; away: string; status: string; league: string; homeScore: number | null; awayScore: number | null }[] } | null = null;
    if (person.isReferee) {
      const refRow = (await refereeStats()).find((r) => r.personId === id) ?? null;
      const refMatches = await db.match.findMany({
        where: { refereeId: id },
        include: { homeTeam: true, awayTeam: true, events: true, ratings: true, stage: { include: { season: { include: { league: true } } } } },
        orderBy: { kickoff: "desc" },
      });
      // разбивка по лигам: полная история, а не только последние 30
      const byLeagueMap = new Map<string, { league: string; matches: number; yellows: number; reds: number; ratings: number[] }>();
      for (const m of refMatches) {
        if (m.status !== "COMPLETED") continue;
        const key = m.stage.season.league.name;
        if (!byLeagueMap.has(key)) byLeagueMap.set(key, { league: key, matches: 0, yellows: 0, reds: 0, ratings: [] });
        const v = byLeagueMap.get(key)!;
        v.matches++;
        v.yellows += m.events.filter((e) => e.type === "YELLOW_CARD").length;
        v.reds += m.events.filter((e) => e.type === "RED_CARD").length;
        v.ratings.push(...m.ratings.map((r) => r.rating));
      }
      const debuts = refMatches.length ? refMatches[refMatches.length - 1].kickoff.toISOString() : null;
      referee = {
        matches: refRow?.matches ?? 0,
        yellowAvg: refRow?.yellowAvg ?? 0,
        redAvg: refRow?.redAvg ?? 0,
        penaltyAvg: refRow?.penaltyAvg ?? 0,
        avgRating: refRow?.avgRating ?? null,
        ratingsCount: refRow?.ratingsCount ?? 0,
        debut: debuts,
        byLeague: [...byLeagueMap.values()].map((v) => ({
          league: v.league,
          matches: v.matches,
          yellowAvg: v.matches ? +(v.yellows / v.matches).toFixed(1) : 0,
          redAvg: v.matches ? +(v.reds / v.matches).toFixed(2) : 0,
          avgRating: v.ratings.length ? +(v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length).toFixed(1) : null,
        })),
        matchList: refMatches.slice(0, 30).map((m) => ({
          id: m.id, kickoff: m.kickoff.toISOString(),
          home: m.homeTeam.name, away: m.awayTeam.name, status: m.status,
          league: m.stage.season.league.name,
          homeScore: m.homeScore, awayScore: m.awayScore,
        })),
      };
    }

    return Response.json({
      player: {
        id: person.id,
        name: `${person.lastName} ${person.firstName} ${person.middleName ?? ""}`.trim(),
        birthDate: person.birthDate?.toISOString() ?? null,
        position: person.position,
        isReferee: person.isReferee,
        referee,
        registrations: person.registrations.map((r) => ({
          team: { id: r.team.id, name: r.team.name, clubName: r.team.club?.name ?? null },
          season: { id: r.season.id, name: r.season.name, league: r.season.league.name },
          startDate: r.startDate.toISOString(),
          endDate: r.endDate?.toISOString() ?? null,
          number: r.number,
          role: r.role,
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
