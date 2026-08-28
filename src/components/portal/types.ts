// Общие типы API-контрактов (аналог shared-пакета Monorepo из PRD, инвариант №2)

export interface LeagueDTO {
  id: string;
  name: string;
  format: string;
  yellowCardLimit: number;
  redCardBanMatches: number;
  walkoverScore: number;
  transferWindowEnd: string | null;
  seasons: { id: string; name: string; startDate: string; isCurrent: boolean }[];
}

export interface OverviewDTO {
  leagues: LeagueDTO[];
  stats: {
    persons: number; teams: number; matches: number; goals: number;
    events: number; activeSuspensions: number; clubs: number; referees: number;
  };
}

export interface StandingRowDTO {
  position: number;
  teamId: string;
  teamName: string;
  clubName: string | null;
  games: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; goalDiff: number;
  points: number; techLosses: number; techWins: number;
  fairPlay: number; yellowCards: number; redCards: number;
  form: string[];
}

export interface MatchDTO {
  id: string;
  round: number | null;
  kickoff: string;
  status: string;
  walkoverType: string | null;
  homeScore: number | null;
  awayScore: number | null;
  note: string | null;
  homeTeam: { id: string; name: string; clubName: string | null };
  awayTeam: { id: string; name: string; clubName: string | null };
  stadium: { id: string; name: string; city: string | null } | null;
  referee: { id: string; name: string } | null;
  regulationScore: number;
}

export interface PlayerStatRowDTO {
  personId: string;
  name: string;
  teamName: string;
  teamId: string;
  position: string | null;
  games: number;
  goals: number;
  penalties: number;
  ownGoals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
}

export interface ScorersDTO {
  scorers: PlayerStatRowDTO[];
  assisters: PlayerStatRowDTO[];
  goalkeepers: PlayerStatRowDTO[];
  fairPlay: PlayerStatRowDTO[];
}

export interface SuspensionDTO {
  id: string;
  person: { id: string; name: string };
  team: { id: string; name: string } | null;
  league: { name: string };
  source: string;
  reason: string | null;
  matchesTotal: number;
  matchesServed: number;
  isLifetime: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface TeamDTO {
  id: string;
  name: string;
  clubName: string | null;
  city: string | null;
  players: { id: string; name: string; position: string | null; number: number | null; endDate: string | null }[];
}

export interface RefereeStatDTO {
  personId: string;
  name: string;
  matches: number;
  yellowAvg: number;
  redAvg: number;
  penaltyAvg: number;
  avgRating: number | null;
  ratingsCount: number;
}

export interface SessionUserDTO {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "LEAGUE_ADMIN" | "CLUB_ADMIN" | "REFEREE" | "PLAYER";
  personId: string | null;
  clubId: string | null;
  personName: string | null;
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Супер-администратор",
  LEAGUE_ADMIN: "Администратор лиги",
  CLUB_ADMIN: "Администратор клуба",
  REFEREE: "Судья",
  PLAYER: "Игрок",
  GUEST: "Гость",
};

export const FORMAT_LABELS: Record<string, string> = {
  F11: "11×11",
  F8: "8×8",
  F6: "6×6",
  FUTSAL: "Мини-футбол",
};

export const SOURCE_LABELS: Record<string, string> = {
  AUTO_RED: "Красная карточка (авто)",
  AUTO_YELLOW: "Накопление ЖК (авто)",
  MANUAL: "Решение КДК",
};

export const EVENT_LABELS: Record<string, string> = {
  GOAL: "Гол",
  PENALTY: "Гол с пенальти",
  OWN_GOAL: "Автогол",
  YELLOW_CARD: "Жёлтая карточка",
  RED_CARD: "Красная карточка",
  SUB_OUT: "Замена (ушёл)",
  SUB_IN: "Замена (вышел)",
};

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Запланирован",
  LIVE: "Идёт",
  COMPLETED: "Завершён",
  WALKOVER: "Тех. поражение",
  POSTPONED: "Перенесён",
};
