# CLAUDE.md — Rezerwo

> Этот файл читается Claude Code первым. Он содержит видение, архитектуру, схему БД,
> соглашения и полный план проекта. Держи его в корне репозитория и обновляй по мере роста.
> Язык общения с разработчиком (Adam) — **русский**. UI продукта — **польский по умолчанию**.

---

## 1. О проекте

**Rezerwo** — маркетплейс онлайн-записи для бьюти-индустрии Польши.
Вертикали: 💅 Маникюр · 💈 Барбер · ✂️ Женский парикмахер · 👁️ Брови · 🎨 Тату.

**Позиционирование:** не «ещё один календарь», а система, которая:
- даёт клиенту записаться за 30 секунд без звонков и без регистрации,
- даёт владельцу полный контроль над профилем, услугами и записями,
- возвращает клиентов и не теряет слоты (напоминания, авто-освобождение, лист ожидания).

**Принцип разработки:** строим **по модулям (этапам)**, каждый — рабочий и проверенный
(`npm run build` без ошибок, типы чистые). Не пытаться сделать всё разом.

---

## 2. Стек и структура

```
rezerwo/
├── backend/                 Node + Express + PostgreSQL (pg)
│   ├── src/
│   │   ├── db.js            пул подключения + initDb() (схема)
│   │   ├── auth.js          bcrypt + JWT (cookie rz_session + Bearer)
│   │   └── server.js        роуты API
│   ├── .env.example
│   └── package.json
├── frontend/                React + TypeScript + Vite (панель владельца)
│   ├── src/
│   │   ├── api.ts           типизированный клиент API
│   │   ├── types.ts         интерфейсы (Business, Service, ...)
│   │   ├── App.tsx          панель: auth + профиль + услуги
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example         VITE_API_URL
│   └── package.json
├── README.md
└── CLAUDE.md                (этот файл)
```

**Технологии:** React 18, TypeScript (strict), Vite 5, Express 4, PostgreSQL,
bcryptjs, jsonwebtoken, lucide-react (иконки). Без тяжёлых UI-библиотек — стили инлайн.

**Аккаунты внешних сервисов:** Neon (БД), Render (бэкенд), Vercel (фронт),
позже Cloudinary (фото), Resend (email), SMSAPI.pl (SMS).

---

## 3. Запуск локально

```bash
# 1. База: создать на neon.tech, скопировать connection string

# 2. Backend
cd backend
npm install
cp .env.example .env     # вписать DATABASE_URL и JWT_SECRET
npm start                # http://localhost:4000 (таблицы создаются сами)

# 3. Frontend (второй терминал)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Frontend проксирует `/api` → `localhost:4000` (см. `vite.config.ts`).

---

## 4. Как работать с Claude Code на этом проекте

**Правило №1:** делать по одному этапу за раз. После каждого — запустить
`npm run build` (frontend) и проверить, что бэкенд стартует без ошибок.

**Промпты по этапам** (примеры):
- `Реализуй Этап 3 из CLAUDE.md: клиентский маркетплейс + бронирование. Не трогай готовые Этапы 1-2.`
- `Добавь схему таблиц appointments и waitlist из раздела 6, потом роуты.`
- `Проверь сборку: cd frontend && npm run build. Почини ошибки типов.`

**Соглашения для агента:**
- Не переписывать готовые модули без явной просьбы.
- Все сообщения для пользователя (UI, ошибки API) — **на польском**.
- Деньги — `NUMERIC`, время — минуты (int) или `HH:MM` строкой, даты — `YYYY-MM-DD`.
- Каждый новый роут — owner-scoped через `business_id` (проверка владельца обязательна).
- Перед коммитом: сборка зелёная, нет `any` без причины, нет секретов в коде.

---

## 5. Архитектура (ключевые решения)

### Авторизация
- **Только владельцы** регистрируются. Клиенты бронируют **без аккаунта** (имя + телефон).
- JWT в httpOnly-cookie `rz_session` + fallback на `Authorization: Bearer` (для кросс-домена
  Vercel↔Render). Хелпер `requireAuth` в `auth.js`.

### Логика свободных слотов (ядро)
Слоты **не хранятся** в базе — вычисляются на лету:
1. берём рабочие часы мастера/бизнеса (`businesses.hours`);
2. шагаем интервалом (например 15-30 мин);
3. для каждого кандидата: помещается ли услуга по длительности до закрытия?
4. не пересекается ли с активными записями (`status IN ('pending','confirmed')`)?
5. не в прошлом ли?
→ остаток = свободные слоты. Проверка пересечения интервалов:
`newStart < existingEnd && existingStart < newEnd`.

### Авто-освобождение слота
Отмена = `appointments.status = 'cancelled'`. Расчёт слотов учитывает только активные
записи → отменённый слот сразу свободен. Никакой отдельной логики «освобождения» не нужно.

### Подтверждение записей (решение пользователя)
`businesses.confirm_required = TRUE` по умолчанию. Поток:
`клиент бронирует → status='pending' → владелец подтверждает вручную (и сам звонит/пишет)
→ status='confirmed' → клиенту уходит подтверждение`. Если `confirm_required=FALSE` —
бронь сразу `confirmed`.

### Напоминания (решение пользователя: email на старте, SMS позже)
`businesses.reminder_hours` (JSONB, по умолчанию `[24,4]`) — за сколько часов напоминать.
Логика: если запись через 1-2 дня → напоминания за 24ч и за 4ч; если ближе → за 2ч
(или как настроил владелец). Реализация: планировщик (`node-cron`) каждые ~5 минут ищет
записи, у которых до начала осталось ≈ одно из `reminder_hours` и это напоминание ещё не
отправлено → шлёт email клиенту и владельцу → пишет в `reminders_sent`. Защита от дублей.

### CRM-заметки
`client_notes` — приватные заметки владельца о клиенте (по телефону как ключу),
видны **только владельцу**. Плюс к записи подтягивается `appointments.comment`
(особенности от клиента при брони).

---

## 6. Схема базы данных

### Готово (Этап 1-2)
```sql
owners(id, email UNIQUE, password_hash, created_at)

businesses(
  id, owner_id UNIQUE→owners, name, category,           -- nails|barber|hair|brows|tattoo
  city, district, address, phone, instagram, about,
  banner,                                                -- ключ градиента или URL
  hours JSONB,                                           -- {mon:["10:00","19:00"], ...}
  photos JSONB,                                          -- портфолио (URL)
  confirm_required BOOL DEFAULT TRUE,
  reminder_hours JSONB DEFAULT '[24,4]',
  verified BOOL DEFAULT FALSE, created_at)

services(
  id, business_id→businesses, grp,                       -- группа/колонка
  name, description, duration INT, price NUMERIC,
  sort INT, created_at)
```

### Планируется (добавлять по этапам)
```sql
-- Этап 3-4: записи
appointments(
  id, business_id→businesses,
  service_id→services, staff_id NULL,                    -- staff на будущее
  client_name, client_phone, client_email NULL,
  comment,                                                -- особенности от клиента
  date DATE, start_min INT, duration INT,                -- start в минутах от 00:00
  status,                                                 -- pending|confirmed|cancelled|done|no_show
  created_at)
CREATE INDEX ON appointments(business_id, date);

-- Этап 3: запрос услуги, которой нет в списке
service_requests(id, business_id→businesses, client_phone, text, created_at, handled BOOL)

-- Этап 4: CRM-заметки владельца о клиенте
client_notes(id, business_id→businesses, client_phone, note, updated_at,
             UNIQUE(business_id, client_phone))

-- Этап 5: лог отправленных напоминаний
reminders_sent(id, appointment_id→appointments, hours_before INT, sent_at,
               UNIQUE(appointment_id, hours_before))

-- Этап 6: отзывы и репорты
reviews(id, business_id→businesses, appointment_id NULL,
        client_name, rating INT, text, created_at, hidden BOOL DEFAULT FALSE)
reports(id, review_id→reviews, owner_id→owners, reason, status,  -- open|resolved|rejected
        created_at)
support_tickets(id, owner_id→owners NULL, email, subject, message, status, created_at)

-- Этап 7: справочник городов/районов (или из датасета TERYT)
cities(id, name, voivodeship)
districts(id, city_id→cities, name)
```

---

## 7. Полный план по этапам

Статус: ✅ готово · 🔜 следующее · ⬜ запланировано

### ✅ Этап 1 — Фундамент
БД (owners, businesses, services), регистрация/вход владельца (bcrypt+JWT),
авто-создание бизнеса при регистрации. **Сделано.**

### ✅ Этап 2 — Кабинет: конструктор услуг + профиль
Конструктор услуг (название, описание, длительность, цена, группы), редактор профиля
(баннер, категория, город/район, контакты, «о нас», портфолио по URL),
настройки записи (ручное подтверждение + напоминания). **Сделано.**

### ✅ Этап 3 — Клиентская сторона (маркетплейс + бронь). **Сделано.**
### ✅ Этап 4 — Подтверждение записей + CRM. **Сделано.**
Лента «Oczekujące» с кнопками Potwierdź/Odrzuć, CRM-заметки, комментарий при брони.

### ✅ Этап 5 — Напоминания (email). **Сделано.**
node-cron каждые 5 мин, Resend ленивая инициализация, `reminders_sent`, FROM=onboarding@resend.dev.

### ✅ Этап 6 — Отзывы + репорты + поддержка. **Сделано.**
Отзывы с рейтингом, репорты, форма поддержки, юр-страницы.

### ✅ Этап 7 — i18n + запросы услуг + slug. **Сделано.**
4 языка (PL/EN/RU/UA), вкладка «Zapytania» для запросов услуг, редактор slug в кабинете.

### ✅ Этап 8 — Роли, модерация, антифрод, деплой-готовность. **Сделано.**
- `owners.role` (owner|admin), `businesses.status` (pending|approved|rejected).
- Admin-панель `/admin`: модерация, статистика, фидбэк.
- Rate limiting (регистрация 5/ч, бронь 10/ч), `trust proxy`.
- Валидация ввода (email, телефон, длины).
- Маркетплейс: только `status='approved'`.
- Slug бизнеса — редактируемый в кабинете.
- ⚠️ Требуется вручную: `UPDATE owners SET role='admin' WHERE email='borshenkoadam15@gmail.com';`

---

## 8. Env-переменные (Render)

| Переменная | Описание | Где взять |
|---|---|---|
| `DATABASE_URL` | Строка подключения к Neon | Neon → Connection string |
| `JWT_SECRET` | Длинная случайная строка | `openssl rand -hex 32` |
| `CLIENT_URL` | URL фронта на Vercel (без `/`) | Vercel dashboard |
| `RESEND_API_KEY` | Ключ Resend для email | resend.com → API Keys |
| `FROM_EMAIL` | Отправитель email | `Rezerwo <onboarding@resend.dev>` (пока нет домена) |
| `NODE_ENV` | Режим | `production` |

Vercel (фронт): одна переменная — `VITE_API_URL` = URL Render (без `/api`).

---

## 9. Деплой (Render + Vercel + Neon)

1. **Neon** — продакшн-база, скопировать `DATABASE_URL`.
2. **Render** — деплой `backend`: root=`backend`, start=`npm start`, добавить все env из раздела 8.
3. **Vercel** — деплой `frontend`: root=`frontend`, preset Vite, env `VITE_API_URL`=адрес Render.
4. Связать CORS: `CLIENT_URL` на Render = точный адрес Vercel (без `/` в конце).
5. После деплоя: `UPDATE owners SET role='admin' WHERE email='borshenkoadam15@gmail.com';` в Neon.

⚠️ Бесплатный Render «засыпает» — первый запрос ~30-50 сек.

---

## 10. Будущие релизы (после MVP)

### v1.0 — MVP (Этапы 1-8)
Полный цикл: маркетплейс, бронь, кабинет, подтверждение, заметки, email-напоминания,
отзывы, 4 языка, юр-страницы, деплой. **Цель: первые 2-3 реальных барбершопа Вроцлава.**

### v1.1 — SMS и анти-no-show
- **SMS-напоминания** через SMSAPI.pl (когда есть платящие клиенты).
- **Загрузка фото** через Cloudinary (вместо URL) — настоящее портфолио.
- Мастера внутри бизнеса (несколько staff со своими расписаниями).

### v1.2 — Удержание клиентов (деньги владельцу)
- **Авто-возврат**: «клиент не был N недель» → напоминание/скидка.
- **Программа лояльности**: «5 визитов = бонус».
- Поздравления с днём рождения + предложение.
- Аналитика действий: «вторник днём пуст → запусти акцию».

### v1.3 — Виджет и интеграции
- **Embeddable-кнопка** «Zarezerwuj» для вставки на Instagram/свой сайт.
- Синхронизация с Google Calendar.
- Экспорт записей/клиентов в CSV.

### v2.0 — Платежи и монетизация
- **Депозит/предоплата** против no-show (Stripe Connect / Przelewy24 / BLIK).
- Подписка для владельцев (платные фичи) — **когда оформлено ИП**.
- Комиссия/партнёрка с площадками.
- Тарифы: Free (база) / Pro (напоминания, аналитика, лояльность, без комиссии).

### v2.1+ — Масштаб
- **Режим ресторанов**: столики + кол-во гостей (отдельная модель брони).
- Мобильное приложение (React Native / PWA).
- Расширение на другие города и страны.
- ИИ-помощник владельцу: советы по загрузке, ценам, текстам постов.

---

## 10. Монетизация и юридическое (заметки на будущее)

- **Старт — бесплатно.** Это инструмент новичка для первых пользователей, не бизнес-модель.
  Цель раннего этапа — реальные барбершопы, которые пользуются каждый день (= репутация).
- **ИП оформлять**, когда есть спрос на платную версию (есть кому платить). Раньше — лишние расходы.
- **RODO/GDPR** обязательно: храним персональные данные (имя, телефон) → нужны
  Polityka prywatności, согласие, право на удаление. Это Этап 8, не опционально.
- Сканировать/обрабатывать только свои данные бизнеса; никаких чужих площадок (легальность).

---

## 11. Что НЕ делать (защита от типичных ошибок)

- ❌ Не строить «всё для всех» — узкая ниша (бьюти PL) + одна боль за раз.
- ❌ Не пытаться сделать «весь проект разом» — только по этапам с проверкой.
- ❌ Не хранить фото как base64 в БД — использовать объектное хранилище (Cloudinary).
- ❌ Не принимать оплату/карты до оформления юрлица и без PCI-провайдера (Stripe и т.п.).
- ❌ Не давать клиенту регистрацию — только владельцам. Клиент = имя + телефон.
- ❌ Не коммитить `.env` и секреты. `.gitignore` уже настроен.

---

_Версия документа: v1 · Базовый стек и Этапы 1-2 реализованы · Следующее: Этап 3._
