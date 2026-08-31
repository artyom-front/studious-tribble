# SCORES21 — деплой в продакшен

Пошаговая инструкция вывода портала «Футбол Чувашии» на боевой сервер.
Стек: **Next.js 16 (App Router, standalone-сборка) + Prisma + SQLite/PostgreSQL + nginx**.
Публичный сайт (livescore) и админка (Ozon-style) работают из одного приложения; RBAC-сессии — подписанные HMAC-cookie.

---

## 1. Требования к серверу

| Параметр | Минимум | Рекомендация |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 ГБ | 2 ГБ |
| Диск | 10 ГБ | 20 ГБ SSD (база + бэкапы + логи) |
| ОС | Ubuntu 22.04+ / Debian 12 | — |
| ПО | Bun 1.1+ (или Node 20+), nginx, certbot | — |
| Домен | — | `scores21.ru` + A-запись на IP сервера |

Установка Bun: `curl -fsSL https://bun.sh/install | bash`

---

## 2. Раскладка на сервере

```
/home/scores21/           — код приложения (клон репозитория)
  ├─ .next/standalone/    — прод-сборка (server.js)
  ├─ prisma/              — схема БД
  ├─ db/custom.db         — SQLite-база (не в git!)
  ├─ backups/             — бэкапы (scripts/backup-db.sh)
  └─ .env                 — переменные окружения (не в git!)
```

---

## 3. Переменные окружения

Скопируйте шаблон и заполните:

```bash
cp .env.example .env
nano .env
```

Обязательные для прода:

| Переменная | Значение | Зачем |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -hex 32` | подпись cookie-сессий. **Не задали = сессии подписаны публичным демо-ключом** |
| `DATABASE_URL` | `file:/home/scores21/db/custom.db` или `postgresql://…` | БД |
| `SHOW_DEMO_ACCOUNTS` | `0` | прячет демо-входы с экрана логина |
| `SITE_URL` | `https://scores21.ru` | sitemap/robots/OG |
| `NODE_ENV` | `production` | включает Secure-cookie, оптимизации |

`APP_VERSION`, `PORT` (по умолчанию 3000), `DEV_INSECURE_COOKIE` (только для локального HTTP-теста!) — опциональны.

---

## 4. Сборка и запуск (VPS, без Docker)

```bash
cd /home/scores21
bun install
bunx prisma generate
bunx prisma db push          # создать/обновить схему БД
bun run db:seed               # ОПЦИОНАЛЬНО: только для демо-стенда!
bun run build                 # next build + standalone
bun run start:prod            # проверка: NODE_ENV=production PORT=3000
```

Открыть `http://127.0.0.1:3000/api/health` — должно вернуть `{"ok":true,"db":"up",…}`.

> Важно: `db:seed` создаёт демо-данные и демо-аккаунты (`admin@ff21.ru/admin123` и т.д.).
> На боевом сервере **не выполняйте** его; первого супер-админа заведите вручную:
> ```bash
> bun -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
>   const{randomBytes,scryptSync}=require('crypto');
>   const salt=randomBytes(16).toString('hex');
>   db.user.create({data:{email:'ВАШ_EMAIL',role:'SUPER_ADMIN',
>     passwordHash:salt+':'+scryptSync('ВАШ_ПАРОЛЬ',salt,64).toString('hex')}})
>   .then(()=>{console.log('ok');return db.\$disconnect()})"
> ```

### 4.1. Постоянный запуск — systemd

`/etc/systemd/system/scores21.service`:

```ini
[Unit]
Description=SCORES21 — футбольный портал Чувашии
After=network.target

[Service]
Type=simple
User=scores21
WorkingDirectory=/home/scores21
EnvironmentFile=/home/scores21/.env
ExecStart=/usr/local/bin/bun /home/scores21/.next/standalone/server.js
Restart=always
RestartSec=5
# защита
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=/home/scores21/db /home/scores21/backups

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now scores21
sudo systemctl status scores21
journalctl -u scores21 -f          # живые логи
```

---

## 5. Reverse-proxy nginx + TLS

`/etc/nginx/sites-available/scores21` (см. готовый вариант в `deploy/nginx.conf`):

```nginx
upstream scores21_app { server 127.0.0.1:3000; keepalive 32; }

server {
    listen 80;
    server_name scores21.ru www.scores21.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name scores21.ru;

    ssl_certificate     /etc/letsencrypt/live/scores21.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scores21.ru/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    gzip on;
    gzip_types text/css application/json application/javascript image/svg+xml;

    location /_next/static/ {
        proxy_pass http://scores21_app;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location / {
        proxy_pass http://scores21_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;      # задел под WebSocket (M5)
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/scores21 /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d scores21.ru -d www.scores21.ru
sudo systemctl reload nginx     # подхватить сертификаты
sudo certbot renew --dry-run    # проверка автопродления
```

После включения HTTPS куки автоматически становятся `Secure` (см. `src/lib/auth.ts`).

---

## 6. Docker-путь (альтернатива)

```bash
cp .env.example .env && nano .env
docker compose up -d --build
docker compose logs -f app
```

`docker-compose.yml` поднимает приложение + nginx (конфиг `deploy/nginx.conf`, сертификаты в `deploy/certs/`).
База живёт в volume `scores21-data`. Healthcheck встроен в образ (curl `/api/health`).

---

## 7. Бэкапы базы

`scripts/backup-db.sh` — безопасный online-backup SQLite + gzip + ротация 30 дней.

В cron (`crontab -e` от пользователя scores21):

```
15 3 * * *  /home/scores21/scripts/backup-db.sh >> /home/scores21/backups/backup.log 2>&1
```

Проверка восстановления (на тестовой машине):

```bash
gunzip -c backups/scores21-YYYYMMDD-HHMMSS.db.gz > /tmp/restore.db
DATABASE_URL=file:/tmp/restore.db bun -e "…"  # или просто откройте через sqlite-клиент
```

---

## 8. Переход на PostgreSQL (когда нагрузка вырастет)

SQLite уверенно держит тысячи читателей; PostgreSQL нужен при 50+ одновременных
редакторах протоколов или мульти-серверной раскатке.

1. Установить PostgreSQL, создать БД и пользователя.
2. В `prisma/schema.prisma` поменять `provider = "sqlite"` → `provider = "postgresql"`.
3. `DATABASE_URL=postgresql://scores21:***@localhost:5432/scores21`.
4. Перенос данных: выгрузить таблицы (например, `bun scripts/` экспорт/импорт), затем
   `bunx prisma db push` на новой БД и залить данные.
5. Перезапустить сервис: `sudo systemctl restart scores21`.

> В схеме нет SQLite-специфичных типов — миграция сводится к смене провайдера.

---

## 9. Мониторинг

- **Здоровье**: `GET /api/health` — `{"ok":true,"db":"up","uptime":…}`; статус 503 при недоступной БД.
  Подключите UptimeRobot/healthchecks.io (изнутри сети, наружу endpoint прикрыт в nginx).
- **Логи**: `journalctl -u scores21 -f` (VPS) или `docker compose logs -f app` (Docker).
- **Метрики v1**: число LIVE-матчей, протоколов к вводу, алерты — уже есть в админке (Дашборд → «Требуют внимания»).

---

## 10. Обновление релиза

```bash
cd /home/scores21
sudo systemctl stop scores21
git pull
bun install
bunx prisma generate
bunx prisma db push          # если менялась схема
bun run build
sudo systemctl start scores21
curl -s http://127.0.0.1:3000/api/health
```

Откат: `git checkout <предыдущий-тег> && bun run build && sudo systemctl restart scores21`
(база совместима в обратную сторону в рамках минорных обновлений; перед обновлением — свежий бэкап!).

---

## 11. Чек-лист перед запуском в прод

- [ ] `AUTH_SECRET` сгенерирован и задан (не демо-значение!)
- [ ] `SHOW_DEMO_ACCOUNTS=0`
- [ ] `db:seed` НЕ выполнялся / демо-аккаунты удалены, супер-админ создан вручную
- [ ] HTTPS работает, редирект 80→443 активен, `Strict-Transport-Security` виден в ответах
- [ ] `/api/health` отвечает `ok:true`
- [ ] Вход под боевым админом работает; cookie `sid` помечена `Secure`
- [ ] 2FA (TOTP) включена для всех админов: «Панель → Безопасность», резервные коды сохранены
- [ ] Брутфорс-защита: 11-я НЕУДАЧНАЯ попытка входа за минуту возвращает 429
- [ ] CSRF: POST с чужим Origin возвращает 403 (проверка `curl -X POST -H 'Origin: https://evil' .../api/admin/totp`)
- [ ] Крон бэкапов настроен, в `backups/` появился первый файл
- [ ] `certbot renew --dry-run` прошёл
- [ ] Проверены firewal/ufw: наружу открыты только 80/443 (и SSH)

---

## 12. Известные ограничения текущей версии (осознанные)

| Ограничение | План |
|---|---|
| LIVE-счёт обновляется поллингом 30 с | M5: WebSocket (nginx уже готов к upgrade) |
| Rate-limit логина/OTP — в памяти процесса | Redis при мульти-инстансе |
| Баннеры — текстовые слоты | загрузка картинок в S3 |
| CSP без nonce (unsafe-inline для Next-гидратации) | ужесточить при выносе inline-скриптов |

Сделано в этой версии: SSR-страницы с JSON-LD (SEO видит весь контент), TOTP-2FA для
всех сотрудников, CSRF-защита мутаций, прод-CI/CD (тесты → образ → деплой → откат).

---

## 14. 2FA (TOTP) — двухфакторная защита аккаунтов

Включается каждым сотрудником самостоятельно: **/admin → Система → Безопасность**.

- Стандарт **RFC 6238** (Google Authenticator, Яндекс.Ключ, 1Password): 6 цифр, шаг 30 с, окно ±30 с.
- Вход: пароль → подписанный 5-минутный челлендж → код из приложения **или** одноразовый резервный код.
- **Анти-replay**: повторно введённый код отклоняется (запоминается последний принятый шаг).
- **8 резервных кодов** выдаются один раз при включении (sha256-хэши в БД); перегенерация — по паролю.
- Отключение 2FA — кодом приложения **или** паролем; все действия пишутся в журнал аудита.
- Брутфорс-защита: 10 неудачных попыток/мин на IP, 10 провалов на челлендж — челлендж сгорает.
- Потерян телефон: резервный код → «Безопасность» → перегенерация. Полная потеря доступа — супер-админ
  может сбросить 2FA напрямую в БД: `UPDATE User SET totpEnabled=0, totpSecret=NULL WHERE email='…'`.

---

## 15. SSR/SEO — что уже работает

Публичный сайт отдаёт **серверный HTML** (не SPA): поисковик и «Просмотр HTML-кода» видят контент.

| Страница | Рендер | Кэш | SEO-разметка |
|---|---|---|---|
| `/` (livescore) | dynamic SSR | — | OG, keywords, canonical |
| `/match/[id]` | SSR | ISR 30 c | SportsEvent, BreadcrumbList, OG, canonical |
| `/league/[id]/[tab]` | SSR | ISR 60 c | BreadcrumbList, OG, canonical |
| `/team/[id]` | SSR | ISR 120 c | SportsTeam, BreadcrumbList |
| `/player/[id]` | SSR | ISR 120 c | Person, BreadcrumbList |
| `/stadium/[id]` | SSR | ISR 300 c | StadiumOrArena, BreadcrumbList |
| `/admin` | client | noindex | robots + X-Robots-Tag |

Дополнительно: `sitemap.xml` (матчи/лиги/команды/персоны/стадионы), `robots.txt` (закрыты /admin и /api),
404-страницы с корректным HTTP-статусом. Смена домена → обновить `SITE_URL` (канонические URL и sitemap).

Старые ссылки вида `#/match/…` автоматически редиректятся на путь `/match/…`.

---

## 16. CI/CD — пайплайн поставки

**CI** (`.github/workflows/ci.yml`) — на каждый PR/push в main:

1. `quality` — ESLint + `tsc --noEmit` + 54 юнит-теста движков (~1 мин, кэш bun).
2. `integration` — чистая SQLite + сид + `next build` + сервер :3100 → 36 инвариантов PRD
   (`scripts/test-api.ts`) + полный 2FA-флоу + smoke SSR/SEO (headers, JSON-LD, 404, CSRF).
3. `docker` — сборка прод-образа (main only, без push).
4. `audit` — `bun audit --level critical`.

**CD** (`.github/workflows/cd.yml`) — по тегу `v*` или ручной запуск (environment=production, нужен approval):

1. Сборка и push образа в **GHCR** (теги: версия, sha, latest).
2. SSH-деплой на сервер: `scripts/deploy.sh <tag>` — бэкап БД → `prisma db push` → `docker compose up -d` →
   health-check `/api/health` (90 с) → фиксация тега в `.deploy/history`.
3. **Авто-откат** при провале health: `scripts/rollback.sh` поднимает предыдущий рабочий тег из истории.
4. Внешний health-check из раннера + ручной job-откат с environment-approval.

Secrets для CD: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PUBLIC_URL`.
На сервере: `docker login ghcr.io` (read-токен) один раз от пользователя раннера.

Локально то же самое руками:

```bash
bun run verify     # lint + typecheck + unit
bun run test:all   # + интеграция (сервер должен быть поднят; мутирует БД!)
bun run build && bun run start:prod
```

---

## 17. Скатч-карта команды разработчика

| Файл | Роль |
|---|---|
| `prisma/schema.prisma` | 15+ моделей домена (Person/Team/Club, дисквалификации, заявки, 2FA-поля User) |
| `src/lib/engine/*` | расписание, таблицы, дисциплина, lifecycle матчей, сигналы |
| `src/lib/services/*` | сервис-слой: единый источник данных для API и SSR-страниц |
| `src/lib/totp.ts` | RFC 6238: коды, окно ±30 c, анти-replay, резервные коды |
| `src/app/api/**` | публичный API + админ-CRUD + auth/2FA (всё с аудитом) |
| `src/app/(site)/**` | SSR-страницы: матч/лига/команда/игрок/стадион + метаданные/JSON-LD |
| `src/app/admin/` | панель управления (noindex, вход только здесь) |
| `src/proxy.ts` | security-фильтр: CSRF origin-check, noindex для /admin и /api |
| `src/components/portal/*` | livescore-сайт + Ozon-админка + панель «Безопасность» |
| `prisma/seed.ts` | демо-данные (только для стендов!) |
| `tests/unit/*` | юнит-тесты движков (TOTP/расписание/таблица/стрики) — `bun test` |
| `tests/integration/*` | 36 инвариантов PRD + 2FA-флоу + smoke SSR/SEO — `bun run test:api` |
| `.github/workflows/*` | CI (качество → интеграция → Docker) и CD (GHCR → SSH → откат) |
