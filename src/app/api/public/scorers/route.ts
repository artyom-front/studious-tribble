import { errorResponse } from "@/lib/http";
import { seasonPlayerStats } from "@/lib/engine/stats";

/** Топы бомбардиров / ассистентов / вратарей — WO-матчи исключены (Epic 2) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) return Response.json({ error: "Укажите seasonId" }, { status: 422 });

    const stats = await seasonPlayerStats(seasonId);
    const scorers = [...stats].sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name, "ru")).filter((s) => s.goals > 0);
    const assisters = [...stats].sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.name.localeCompare(b.name, "ru")).filter((s) => s.assists > 0);
    const goalkeepers = [...stats].filter((s) => s.position === "GK").sort((a, b) => b.cleanSheets - a.cleanSheets || a.name.localeCompare(b.name, "ru"));
    const fairPlay = [...stats].sort((a, b) => b.yellowCards - a.yellowCards || b.redCards - a.redCards || a.name.localeCompare(b.name, "ru")).filter((s) => s.yellowCards > 0 || s.redCards > 0);

    return Response.json({ scorers: scorers.slice(0, 30), assisters: assisters.slice(0, 30), goalkeepers, fairPlay: fairPlay.slice(0, 30) });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
