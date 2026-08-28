import { errorResponse } from "@/lib/http";
import { refereeStats } from "@/lib/engine/stats";

/** Судейский корпус: статистика и рейтинги */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId") ?? undefined;
    const referees = await refereeStats(seasonId);
    return Response.json({ referees });
  } catch (e) {
    return errorResponse(e);
  }
}

export const dynamic = "force-dynamic";
