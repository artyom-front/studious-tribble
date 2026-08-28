# Worklog — Спортивно-аналитический портал «Футбол Чувашии»

---
Task ID: 1
Agent: main (Super Z)
Task: Реализация портала по PRD v1.0 (Milestones 1–4 + частично 5) на Next.js 16 App Router + Prisma/SQLite (адаптация стека NestJS+PG под демо-среду с полным сохранением доменной логики)

Work Log:
- Инициализировал fullstack-окружение (Next.js 16 + Tailwind 4 + shadcn/ui + Prisma SQLite).
- M1 — Prisma-схема (15 моделей): Person/User/Club/Team/Stadium, League/Season/Stage/Match/MatchEvent, Registration/LineupEntry/Suspension/RefereeRating/AuditLog. Инвариант №1: жёсткое разделение Person/Team/Club.
- M1 — Auth: scrypt-хэши, HMAC-cookie сессии, RBAC (requireRole), HttpError-модуль; демо-аккаунты admin/liga/sudya/club @ff21.ru.
- M2 — Движки: generateRoundRobin (карусель Бергера, одиночный/двойной круг), computeStandings (очки, тай-брейки из JSON-конфига стадии: head_to_head, fair play и др., форма W/D/L/T/тВ).
- M3 Epic 1 — discipline.ts: авто-бан за КК (настраиваемое redCardBanMatches), накопление ЖК (yellowCardLimit), «отсиживание» банов по завершённым матчам команд, triggeredByMatchId (бан начинается со следующего матча), revert при reopen; assertNotSuspended — инвариант блокировки событий и составов.
- M3 Epic 2 — walkoverScore: HOME 0:N / AWAY N:0 / BOTH 0:0+0очков+ТП обеим; COALESCE-подстановка регламентного счёта лиги (3 футбол / 5 мини); фильтрация WO из PlayerStats и ЖК-накопления.
- M3 Epic 3 — Registration с датами: isRegisteredOn(person,team,season,date) при каждом событии; трансферное окно лиги.
- M3 — lifecycle.ts: validateEvent, computeScore (автогол — сопернику), completeMatch (обязательный судья — инвариант §4), assignWalkover (очистка событий/составов), resetMatch, audit().
- M5 (частично) — RefereeRating (анонимно, 1–5, уникальность автор×матч, судья не оценивает себя), refereeStats.
- Seed (prisma/seed.ts): 2 лиги (Премьер-лига F11 8 команд, мини-футбол FUTSAL 6 команд), 178 персон, 3 судьи, 43 матча, 7 туров (1–3 сыграны), WO_HOME в туре 3, WO_BOTH в мини-футболе, красная карточка → активный бан, накопление 3 ЖК → активный бан, трансфер Волга→Динамо, дубликат профиля для Merge, оценки судей.
- API: auth (login/logout/me), public (overview/standings/matches/matches[id]/scorers/suspensions/teams/players[id]/referees), admin (matches[id] с действиями event/deleteEvent/lineup/referee/complete/walkover/reset, matches, suspensions КДК create/update/delete, schedule round-robin, registrations c окном, merge, persons, audit, ratings).
- UI (одна страница `/`, SPA): Portal (header/nav/footer, селектор лиги+сезона), HomeView, StandingsView (полная таблица с формой/ЖК-КК/ТП), CalendarView (туры, фильтры), ScorersView (4 таба), TeamsView+диалог состава, RefereesView, DisciplineView, MatchDialog (хронология, составы, оценка судьи звёздами), PlayerDialog (трансферы, статистика по сезонам, баны), LoginView (демо-аккаунты), AdminPanel (6 табов по ролям) + ProtocolEditor (составы с маркировкой дисквалифицированных, события с выбором «на поле», завершение, WO, reset) + AdminPanels (КДК, расписание, заявки, Merge, аудит).
- Багфиксы: stadiumId-объект в seed, matchId в событиях seed, MSK-конвертация дат (Date.UTC-арифметика), дубликат Registration unique, HttpError вынесен из auth (next/headers), отсутствие createdAt у Stage, лишний `void toMatchDTO`, form.push на away вместо home в ветке поражения хозяев (найден байтовым дампом), stage не подключался в assertMatchAccess (lineup 500), regulationScore в detail-API, таймзона Europe/Moscow во всех fmt*.
- Тесты: scripts/test-api.ts — 37 проверок всех инвариантов PRD, все зелёные (после пересева).
- Браузерная верификация (agent-browser): главная, WO-диалог («регламент 3:0», время МСК), вход admin, панель управления, редактор протокола (тост «У игрока Николаев Кирилл активная дисквалификация!»), судьи, дисциплины, скриншоты в scripts/shots/.
- lint: 0 ошибок; dev.log: только 200-е ответы после фиксов.

Stage Summary:
- Готов работающий MVP портала, покрывающий Milestones 1–4 и частично 5 PRD: все 4 Epic доменной логики (дисквалификации, техпоражения, мульти-лиги/трансферы, merge профилей) + RBAC-матрица + аудит + оценки судей.
- Демо-данные: seeded лиги Чувашии; войти: admin@ff21.ru/admin123 (супер-админ), liga@ff21.ru/liga123, sudya@ff21.ru/sudya123, club@ff21.ru/club123.
- Ключевые артефакты: prisma/schema.prisma, src/lib/engine/* (schedule/standings/discipline/lifecycle/stats), src/lib/{auth,http,queries}.ts, src/app/api/**, src/components/portal/*, prisma/seed.ts, scripts/test-api.ts.
- Что дальше (из PRD, вне скоупа демо): ISR + SEO-метаданные/JSON-LD, рекламные слоты, WebSocket live-счёт (M5), push-уведомления, S3-аватары, BullMQ-очереди (сейчас пересчёт ленивый), стресс-тестирование.
