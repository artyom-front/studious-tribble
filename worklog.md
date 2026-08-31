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

---
Task ID: 2
Agent: main (Super Z)
Task: Ответ на требования пользователя: (1) полный CRUD всех сущностей как в продакшене, (2) редизайн UI в livescore-стиле (референс-скрин) + выбор названия портала

Work Log:
- Схема: League.isPinned/shortName/priority (топ-лиги), Team.city, Stadium.capacity, Registration.role PLAYER|COACH (тренеры), новая модель Banner (TOP/RIGHT_TOP/RIGHT_BOTTOM).
- Seed v2: даты динамические от «сегодня» (туры 1–3 сыграны, 4-й сегодня), 4 лиги всех форматов (F11/F8/F6/FUTSAL, 26 команд, 288 персон, 73 матча), LIVE-матч 1:1 сегодня, тренер в каждой команде, города, вместимость стадионов, 3 демо-баннера, WO_HOME+WO_BOTH, трансфер, merge-дубль, 2 активных дисквалификации.
- Admin CRUD API (все с audit() и защитами): /api/admin/leagues(+/[id] PATCH/DELETE), seasons(+/[id]), clubs(+/[id]), teams(+/[id]), stadiums(+/[id]), persons/[id] (PATCH/DELETE, удаление блокируется если профиль привязан — Merge), matches POST/PATCH/DELETE (PATCH только для незавершённых; DELETE только без протокола), banners(+/[id]).
- Public API: /api/public/matches/day (livescore-лента по дате МСК+формату, группировка по лигам), /api/public/banners (активные слоты), /api/public/teams/[id] (профиль: составы+тренеры+матчи+позиция), /api/public/stadiums(+/[id]: статистика+матчи), players/[id] расширен судейской карьерой, overview + isPinned/shortName/priority.
- UI-редизайн (livescore): бренд ScoreBox (brand.ts — смена в 1 строке), hash-роутер #/match|team|player|stadium|league|admin, минималистичная белая шапка, тёмный бар табов видов футбола, фильтры даты (вчера/сегодня/завтра/календарь/все) и статуса (все/live/завершённые/предстоящие), 3-колоночная сетка: сайдбар топ-лиг (мини-таблицы топ-5, сворачиваемые) + центр + правая колонка (баннеры, «Прямо сейчас»/«Матч тура», «Самый результативный», топ игроков с переключателем лиги и табами Голы/Ассист/ЖК/КК).
- Новые страницы: MatchPage (хронология, составы, оценка судьи, вход в протокол), PlayerPage (заявки/трансферы, статистика, баны, судейская карьера), TeamPage (позиция, тренер, состав по позициям, матчи), StadiumPage (статистика, матчи), LeaguePage (6 вкладок: матчи/таблица/бомбардиры/дисциплины/команды/судьи). Удалены HomeView/MatchDialog/PlayerDialog.
- Админка: 12 разделов — Турниры (лиги+сезоны CRUD), Клубы и команды (CRUD), Люди (CRUD+поиск), Стадионы (CRUD), Матчи (создание/редактирование/удаление), Протоколы, КДК, Расписание, Заявки, Баннеры (CRUD), Merge, Аудит.
- Багфиксы: DeleteBtn не был экспортирован; перезапуск dev-сервера для нового Prisma-клиента (db.banner/priority); MatchesCrudPanel fetch использовал пустой seasonId вместо effectiveSeasonId (+version-проп для автообновления); клик по лиге в сайдбаре сворачивал вместо навигации (ряд→лига, шеврон→мини-таблица); SSR «window is not defined» в useRoute (guard typeof window); счёт LIVE в карточке «Прямо сейчас»; LeaguePage setState-in-effect → derived state.
- Тесты: test-api.ts обновлён (4 лиги, динамический поиск WO-команд) — 36/36 зелёных на свежем сиде; пересев после прогона.
- Браузерная верификация (agent-browser): главная (LIVE 1:1, лента лиг, виджеты), матч→игрок→команда→стадион→лига (все вкладки), логин-сессия, админка 12 вкладок, создание лиги/матча через UI, защита удаления (409), удаление через UI, ввод протокола со страницы матча, моб. 390px, SSR 200. Скриншоты scripts/shots/v2-*.png. lint: 0 ошибок.

Stage Summary:
- Полный продакшен-цикл: создание/редактирование/удаление лиг, сезонов, клубов, команд, персон, судей, стадионов, матчей, баннеров — с аудит-следом и доменными защитами (WO-дисквалификации-merge не сломать).
- UI соответствует референсу: шапка ScoreBox → табы видов футбола → фильтры → сайдбар топ-лиг + лента + правые виджеты; проваливание в матч/команду/игрока/тренера/судью/стадион; баннерные слоты (TOP 728×90, правые 300×250) управляются из админки, пустые — заглушки.
- Демо-вход: admin@ff21.ru/admin123, liga@ff21.ru/liga123, sudya@ff21.ru/sudya123, club@ff21.ru/club123.
- Дальше (вне скоупа): SEO/ISR/JSON-LD, WebSocket live-обновление счёта (сейчас refresh), S3-аватары, реальные картинки баннеров.

---
Task ID: 3
Agent: main (Super Z)
Task: Редизайн v3 «SCORES21»: новый визуал публичного сайта (тёмная «Ночь под прожекторами» + чувашское золото), Ozon-style админка с дашбордом, enrich-профили, глобальный поиск, избранное

Work Log:
- Бренд: ScoreBox → SCORES21 (scores21.ru, «scores» + код региона 21), brand.ts + метаданные layout.tsx.
- Дизайн-система globals.css: семантические токены (s0/s1/s2/sline/ink/ink2/ink3/gold/goldink/live/ok/warn) через @theme inline; .theme-dark (#0A0D13 графит + #FFD400 золото + #FF5157 LIVE) и светлые :root для админки; утилиты .stadium-glow (радиальная подсветка прожектора), .scrollbar-s21, .live-dot, .scrollbar-none.
- visuals.tsx: Crest (герб команды — детерминированный градиент из id, инициалы), Avatar (инициалы персоны), FormatChip (цветовая кодировка 11×11/8×8/6×6/футзал), Breadcrumbs, StatTile, BackButton, SectionHeader; lib/labels.ts — общие словари для API и UI (types.ts реэкспортирует).
- ui-bits.tsx: все примитивы переведены на семантические токены (работают в обеих темах), StatusBadge с пульсирующим LIVE, FormBadges.
- Новые API: /api/public/search (лиги/команды/персоны/стадионы, JS-фильтр для кириллицы), /api/admin/dashboard (KPI: матчи сегодня/LIVE/протоколы к вводу/без судьи ≤48ч/дисквалы + алерты + свежий аудит).
- SearchDialog (cmdk): глобальный поиск с хоткеем «/» и window-событием s21:search; открывается из шапки сайта и тулбара админки.
- Portal.tsx: тёмный шелл — логотип SCORES21 (золотой бейдж 21 с glow), поиск в шапке, меню видов футбола с золотым подчёркиванием, 3 колонки, тёмный футер; админ-роут → полноэкранный AdminShell; избранное лиг (localStorage s21-fav-leagues, загрузка post-hydration).
- Публичные страницы переписаны в тёмной теме: MatchDayView (звёзды избранного, избранные лиги сверху ленты), LeaguePage+все вкладки (Standings с гербами и зоной лидера, Calendar, Scorers с аватарами, Teams, Referees, Discipline), MatchPage (геро с гербами XL и золотым счётом 5xl, инфо-чипы, вкладки Хронология/Составы/Судейство, карточки-иконки ЖК/КК), PlayerPage (гери с аватаром, карьерные StatTile, вкладки Карьера/Статистика/Дисциплина, прогресс-бары отбытия банов), TeamPage (гери с чипом «N место · очки · форма», сводка В-Н-П, состав по позициям, матчи с индикатором В/Н/П), StadiumPage, LeaguesSidebar (блок «Избранное»), RightRail (золотые акценты), LoginView.
- AdminShell (Ozon-style, светлый): левый сайдбар 264px с группами (Обзор/Турниры/Справочники/Сайт/Система) и иконочными пунктами, карточка пользователя, кнопки «Сайт»/«Выйти»; тулбар: заголовок секции, поиск, колокол алертов с бейджем и dropdown, «На сайт»; контекст-бар лига/сезон; мобильная навигация через Sheet. Секции: Дашборд, Лиги и сезоны, Матчи, Расписание, Протоколы, КДК, Клубы и команды, Люди, Стадионы, Заявки, Баннеры, Merge, Аудит (роли как в AdminPanel v2, удалён — заменён AdminShell).
- AdminDashboard: 5 KPI-карточек (только администрирование), лента «Требуют внимания» (LIVE/незакрытые протоколы/матчи без судьи ≤48ч — клик открывает протокол), быстрые действия по ролям, свежие изменения из аудита.
- API teams/[id]: в standings добавлено form (для чипа формы в гери команды).
- Багфиксы: hydration mismatch hash-роутера (начальный роут HOME, синхронизация с hash после гидратации через setTimeout); ReferenceError version в AdminDashboard (не деструктурирован); react-hooks/static-components (AdminNav вынесен на уровень модуля); react-hooks/set-state-in-effect (favs через setTimeout); неиспользуемые импорты.
- Seed: промокод баннера SCOREBOX → SCORES21 (seed.ts + разовый scripts/update-banner.ts, БД обновлена).
- Верификация agent-browser: тёмная главная (LIVE-строка, лента, сайдбар, правые виджеты, футер sticky), матч (геро, вкладки, хронология) → игрок (вкладки, статистика) → команда → судья → лига/таблица (8 гербов, форма), deep-link #/match/…, глобальный поиск «Урн» → Урняк-КУ, избранное (localStorage), вход admin → AdminShell (KPI, 7 алертов в колоколе, разделы, редактор протокола, матчи, баннеры), мобайл 390px без горизонтального скролла. ERROR-счёт браузера: 0 на всех экранах. lint: 0 ошибок; dev.log: свежие запросы только 200.
- Скриншоты: scripts/shots/v3-*.png (home, match, player, team, league-table, search, admin-dash, admin-bell, admin-protocol, admin-editor, admin-matches, admin-banners, mobile).

Stage Summary:
- Публичный сайт — «SCORES21 · Ночь под прожекторами»: тёмный премиальный livescore с чувашским золотом, генерируемыми гербами/аватарами, интуитивным drill-down и максимумом информации в профилях (вкладки, StatTile, формы, прогресс-бары банов).
- Админка — Ozon-style: сайдбар с иконками по группам, дашборд только с админ-метриками и алертами, колокол уведомлений, быстрые действия; CRUD всех сущностей сохранён из v2 без регрессий.
- Новые UX-мелочи: глобальный поиск («/»), избранное лиг (localStorage), хлебные крошки, пустые состояния с иконками, пульс LIVE, мобильная навигация Sheet.
- Демо-входы прежние: admin@ff21.ru/admin123, liga@ff21.ru/liga123, sudya@ff21.ru/sudya123, club@ff21.ru/club123.
- Дальше (вне скоупа): WebSocket live-обновление счёта (сейчас ручной refresh), S3-аватары/логотипы, SEO slug-URL + JSON-LD, 152-ФЗ-страницы, PDF-печать протокола.

---
Task ID: 4
Agent: main (Super Z)
Task: Доработка UX/UX v4 по фидбеку пользователя: информативные иконки событий (мяч/карточки/VAR/замены), вкладки матча (Таблица с подсветкой обеих команд, H2H, «Пропускают»), LIVE-минута и время начала, профили с возрастом/ролями/статистикой по сезонам×командам, «эмоции турнира» (стрики 🔥/❄, важный матч, без бомбардира, новый тренер) + легенда обозначений, нейминг «Футбол» вместо 11×11, глобальный cursor:pointer + focus-visible

Work Log:
- Дизайн-система: globals.css — глобальный cursor:pointer (button/a/[role=button]/summary/tr[data-clickable]), focus-visible золотая обводка, утилиты .streak-hot/.streak-hot-glow (мерцание огня)/.streak-cold/.match-important/.badge-important/.row-hl.
- Нейминг: FORMAT_LABELS.F11 = «Футбол» (+tooltip чипа «11 игроков × 11»), меню Портала «Футбол»; EVENT_LABELS + VAR_GOAL_CONFIRM/VAR_GOAL_CANCEL/VAR_PENALTY; STREAK_LABELS; POSITION_LABELS.
- signals.ts (новый движок): computeStreak (полная история матчей, не только 5-матчевая форма), buildSignalsContext (топ-бомбардиры команд, активные дисквалификации, тренеры последних 30 дней), matchSignals (позиция/очки/игры/серия/бомбардир-out/новый тренер/важность с причиной/roundsLeft). Важность: 1-е vs 2-е место | близкие соперники при ≤3 турах до конца | призовые пары топ-4; защита от шума — minGames ≥3-4.
- Seed v4: forced score → гарантированные W3 (Урняк-КУ) и L3 (Энергия-НО); LIVE-матч kickoff = now−38мин; события VAR_GOAL_CONFIRM(25')/VAR_GOAL_CANCEL(31') + замена SUB_OUT/SUB_IN(30') с запасным в заявке; КДК-бан бомбардира лидера (Краснов, 2 матча); смена тренера в «холодной» команде (старый отзаявлен, новый 5 дней назад); сезон-2025 с H2H-историей пар текущего тура (81 матч, 289 персон).
- API: /matches/day — signals на каждый матч; /matches/[id] — standings сезона, H2H (список+сводка В-Н-П, регламентный WO-счёт той лиги), missing («кто пропускает»: активные баны + «в шаге от ЖК-лимита»), signals; /teams/[id] — streak/topScorer(+out)/newCoach/coaches с датами; /players/[id] — role в заявках, команда в statsBySeason, судейская byLeague (полная история) + debut.
- EventIcons.tsx (новый): BallIcon (SVG-мяч с пятиугольником и швами), CardIcon (ЖК/КК с окантовкой), VarIcon (монитор + ✓/✕/«П»), SubIcon (RefreshCw), EventIcon-диспетчер — единые для сайта и админки.
- MatchPage: геро с колонками команд (позиция/очки/серия/бомбардир/новый тренер), LiveClock («матч идёт · 39' · с 16:40», тик 15с), авто-refresh LIVE 30с, бейдж «Важный матч» + причина; вкладки Хронология (объединённые замены SUB_OUT+SUB_IN → «Замена: X → Y» с цветными стрелками, VAR-события, бегущий счёт после каждого гола) · Составы (старт/запас) · Таблица (row-hl обе команды) · Личные встречи (сводка 3 чипа + история с W/D/L) · Пропускают (баны + «на грани») · Судейство.
- MatchDayView: строка с LIVE-минутой и «с 16:40», сигналы у имён команд (StreakMark 🔥/❄, UserX без бомбардира, UserCog новый тренер), Trophy/фон .match-important, авто-refresh 30с при любом LIVE, сворачиваемая легенда «Условные обозначения» (8 пунктов).
- PlayerPage: возраст с правильным склонением, чипы ролей (игрок/тренер/судья), текущая команда + №, «в судействе с N», статистика таблицей (лига·сезон·команда×И,Г,П,А,ЖК,КК + дисклеймер Epic 2), судейская byLeague-таблица.
- TeamPage: серия в заголовке, чип бомбардира (красный + UserX при бане), тренерский штаб с бейджем «новый тренер» + строка «Ранее руководили», блок «Выступления по сезонам».
- ProtocolEditor: EVENT_TYPES + замены и 3 VAR-типа; иконки списка событий → EventIcons/BallIcon/CardIcon.
- Admin API: validTypes + VAR_GOAL_CONFIRM/VAR_GOAL_CANCEL/VAR_PENALTY.
- Багфиксы: TDZ «Cannot access ctx» в matches/[id] (локальный ctx затенял параметр роута → sigCtx); ternary-выражения в H2H-подсчёте → if/else; лишние lucide-импорты.
- Верификация: lint 0 ошибок; test-api 36/36; agent-browser — главная (LIVE 39' с 16:40, 🔥×2/❄×3/UserX×2/UserCog×2/1 важный, легенда), матч (геро, VAR×2, замена, бегущий счёт 1:0→1:1, таблица row-hl Урняк+Атал, H2H 2-0-0, Пропускают Краснов КДК), игрок (35 лет, роли, бан, таблица статов), команда (🔥, бомбардир, новый тренер, бывший тренер), судья (byLeague мини:3/премьер:6, дебют), админ-протокол (12 типов событий вкл. VAR), мобильный 390px без горизонтального скролла; 0 ошибок консоли; dev.log без 500. Скриншots scripts/shots/v4-*.png.

Stage Summary:
- Матч-центр стал полнофункциональным: 6 вкладок, VAR-протокол, объединённые замены, бегущий счёт, H2H с историей, подсветка обеих команд в таблице, «кто пропускает» (баны + на грани ЖК-лимита).
- Лента читается «за полсекунды»: LIVE-минута+время начала, огонь/снежинка серий, трофей важных матчей с причиной, значки пропусков и смены тренера, легенда обозначений.
- Профили дают ответ без кликов: возраст, позиция, роли, текущая команда+номер, статистика по лигам·сезонам·командам, судейская карьера по лигам, тренерская история команд.
- Демо-входы прежние: admin@ff21.ru/admin123, liga@ff21.ru/liga123, sudya@ff21.ru/sudya123, club@ff21.ru/club123.
- Вне скоупа (осознанно): травмы (нет доменной модели — нужен Injury + источник), WebSocket live-обновление вместо 30с-поллинга, печать/PDF протокола.
