import { db } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { seasonStandings } from "@/lib/queries";
import { seasonPlayerStats } from "@/lib/engine/stats";
import { buildSignalsContext, matchSignals } from "@/lib/engine/signals";

/** Детальная карточка матча: события, составы, судья, оценки,
 *  таблица сезона, личные встречи (H2H), кто пропускает матч. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const match = await db.match.findUnique({
      where: { id },
      include: {
        homeTeam: { include: { club: true } },
        awayTeam: { include: { club: true } },
        stadium: true,
        referee: true,
        stage: { include: { season: { include: { league: true } } } },
        events: {
          include: { person: true, assistPerson: true, team: true },
          orderBy: { minute: "asc" },
        },
        lineups: { include: { person: true, team: true } },
        ratings: { include: { author: true } },
      },
    });
    if (!match) throw new HttpError(404, "Матч не найден");

    const seasonId = match.stage.seasonId;
    const league = match.stage.season.league;

    // ---------- Таблица сезона (обе команды подсвечиваются на клиенте) ----------
    const standings = await seasonStandings(seasonId);

    // ---------- Личные встречи (H2H) по всем сезонам этих команд ----------
    const h2hMatches = await db.match.findMany({
      where: {
        status: { in: ["COMPLETED", "WALKOVER"] },
        kickoff: { lt: new Date() },
        OR: [
          { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
          { homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId },
        ],
      },
      include: {
        homeTeam: true, awayTeam: true,
        stage: { include: { season: { include: { league: true } } } },
      },
      orderBy: { kickoff: "desc" },
      take: 10,
    });
    let h2hHomeWins = 0, h2hDraws = 0, h2hAwayWins = 0;
    for (const m of h2hMatches) {
      const homeIsCurrentHome = m.homeTeamId === match.homeTeamId;
      const reg = m.status === "WALKOVER" && m.walkoverType
        ? m.walkoverType === "BOTH"
          ? { h: 0, a: 0 }
          : m.walkoverType === "HOME"
            ? { h: 0, a: m.stage.season.league.walkoverScore }
            : { h: m.stage.season.league.walkoverScore, a: 0 }
        : { h: m.homeScore ?? 0, a: m.awayScore ?? 0 };
      if (reg.h > reg.a) {
        if (homeIsCurrentHome) h2hHomeWins++;
        else h2hAwayWins++;
      } else if (reg.h < reg.a) {
        if (homeIsCurrentHome) h2hAwayWins++;
        else h2hHomeWins++;
      } else h2hDraws++;
    }

    // ---------- Кто пропускает матч (актуально до и во время игры) ----------
    const missing: {
      teamId: string;
      entries: { personId: string; name: string; kind: "SUSPENSION" | "AT_RISK"; detail: string }[];
    }[] = [];
    if (match.status === "SCHEDULED" || match.status === "POSTPONED" || match.status === "LIVE") {
      const teams = [
        { id: match.homeTeamId, name: match.homeTeam.name },
        { id: match.awayTeamId, name: match.awayTeam.name },
      ];
      // активные дисквалификации заявленных игроков
      const suspensions = await db.suspension.findMany({
        where: {
          seasonId,
          isActive: true,
          person: { registrations: { some: { seasonId, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] } } },
        },
        include: { person: true },
      });
      // игрок «в шаге» от дисквалификации по ЖК
      const statRows = await seasonPlayerStats(seasonId);
      for (const t of teams) {
        const entries: { personId: string; name: string; kind: "SUSPENSION" | "AT_RISK"; detail: string }[] = [];
        for (const s of suspensions) {
          const reg = await db.registration.findFirst({
            where: { personId: s.personId, teamId: t.id, seasonId },
          });
          if (!reg) continue;
          const left = s.isLifetime ? "бессрочно" : `${s.matchesTotal - s.matchesServed} матч(ей)`;
          entries.push({
            personId: s.personId,
            name: `${s.person.lastName} ${s.person.firstName}`,
            kind: "SUSPENSION",
            detail: s.source === "MANUAL" ? `дисквалификация КДК · пропустит ${left}` : s.source === "AUTO_RED" ? `красная карточка · пропустит ${left}` : `накопление ЖК · пропустит ${left}`,
          });
        }
        for (const row of statRows) {
          if (row.teamId !== t.id) continue;
          if (row.yellowCards === league.yellowCardLimit - 1 && row.yellowCards > 0) {
            entries.push({
              personId: row.personId,
              name: row.name,
              kind: "AT_RISK",
              detail: `${row.yellowCards} ЖК — ещё одна жёлтая, и игрок пропустит следующий матч`,
            });
          }
        }
        if (entries.length) missing.push({ teamId: t.id, entries });
      }
    }

    // ---------- Сигналы и сводка по командам (форма, серия, бомбардир) ----------
    const sigCtx = await buildSignalsContext(seasonId);
    const signals = matchSignals(
      { id: match.id, round: match.round, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
      sigCtx,
      standings
    );

    return Response.json({
      match: {
        id: match.id,
        round: match.round,
        kickoff: match.kickoff.toISOString(),
        status: match.status,
        walkoverType: match.walkoverType,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        note: match.note,
        regulationScore: league.walkoverScore,
        homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name, clubName: match.homeTeam.club?.name ?? null },
        awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name, clubName: match.awayTeam.club?.name ?? null },
        stadium: match.stadium ? { id: match.stadium.id, name: match.stadium.name, city: match.stadium.city } : null,
        referee: match.referee ? { id: match.referee.id, name: `${match.referee.lastName} ${match.referee.firstName} ${match.referee.middleName ?? ""}`.trim() } : null,
        season: { id: match.stage.season.id, name: match.stage.season.name },
        league: { id: league.id, name: league.name, walkoverScore: league.walkoverScore, yellowCardLimit: league.yellowCardLimit },
        events: match.events.map((e) => ({
          id: e.id,
          minute: e.minute,
          type: e.type,
          person: { id: e.person.id, name: `${e.person.lastName} ${e.person.firstName}` },
          assist: e.assistPerson ? { id: e.assistPerson.id, name: `${e.assistPerson.lastName} ${e.assistPerson.firstName}` } : null,
          teamId: e.teamId,
        })),
        lineups: match.lineups.map((l) => ({
          id: l.id,
          teamId: l.teamId,
          person: { id: l.person.id, name: `${l.person.lastName} ${l.person.firstName}`, position: l.person.position },
          isStarter: l.isStarter,
          number: l.number,
        })),
        ratings: match.ratings.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          // анонимность автора (PRD §4)
          authorRole: r.author.role,
        })),
      },
      standings,
      h2h: {
        list: h2hMatches.map((m) => ({
          id: m.id,
          kickoff: m.kickoff.toISOString(),
          status: m.status,
          walkoverType: m.walkoverType,
          homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name },
          awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name },
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          regulationScore: m.stage.season.league.walkoverScore,
          season: { name: m.stage.season.name, league: m.stage.season.league.name },
        })),
        summary: { homeWins: h2hHomeWins, draws: h2hDraws, awayWins: h2hAwayWins },
      },
      missing,
      signals,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
