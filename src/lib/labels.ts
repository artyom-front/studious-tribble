// Общие словари отображения — используются и API (сервер), и UI (клиент).

export const FORMAT_LABELS: Record<string, string> = {
  F11: "11×11",
  F8: "8×8",
  F6: "6×6",
  FUTSAL: "Мини-футбол",
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Супер-администратор",
  LEAGUE_ADMIN: "Администратор лиги",
  CLUB_ADMIN: "Администратор клуба",
  REFEREE: "Судья",
  PLAYER: "Игрок",
  GUEST: "Гость",
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

export const SOURCE_LABELS: Record<string, string> = {
  AUTO_RED: "Красная карточка (авто)",
  AUTO_YELLOW: "Накопление ЖК (авто)",
  MANUAL: "Решение КДК",
};

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Запланирован",
  LIVE: "Идёт",
  COMPLETED: "Завершён",
  WALKOVER: "Тех. поражение",
  POSTPONED: "Перенесён",
};
