# CLAUDE.md — Rezerwo

> Язык общения с разработчиками — **русский**.
> UI продукта — **польский по умолчанию** (4 языка: PL / EN / RU / UA).
> Этот файл — единственный источник правды о проекте. Обновляй после каждого этапа.

---

## 1. О проекте

**Rezerwo** — маркетплейс онлайн-записи для бьюти-индустрии Польши.
Вертикали: 💅 Маникюр · 💈 Барбер · ✂️ Парикмахер · 👁️ Брови · 🎨 Тату · 💄 Красота · и ещё 9 категорий.

**Позиционирование:** не «ещё один календарь», а система, которая:
- даёт клиенту записаться за 30 секунд без звонков и без регистрации,
- даёт владельцу полный контроль над профилем, услугами и расписанием,
- возвращает клиентов и не теряет слоты (напоминания, лист ожидания, авто-освобождение).

**Текущий статус:** MVP **полностью готов** (Этапы 1-8 завершены).
Задеплоен: Vercel (фронт) + Render (бэкенд) + Neon (PostgreSQL).
Следующий шаг: v1.1 — SMS, загрузка фото через Cloudinary, полноценные мастера.

---

## 2. Стек

| Слой | Технологии |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite 5, PWA (vite-plugin-pwa) |
| Стили | CSS инлайн (`style={S.xxx}`) + `index.css` для глобального/responsive |
| Иконки | `lucide-react` — только отсюда, никаких других библиотек иконок |
| UI-библиотеки | **нет тяжёлых**. Всё самописное, стили инлайн |
| Backend | Node.js + Express 4, CommonJS (`.js`, не TypeScript) |
| БД | PostgreSQL через `pg` (пул), хостинг Neon |
| Авторизация | bcryptjs + JWT, httpOnly-cookie `rz_session` + Bearer fallback |
| Email | Resend (ленивая инициализация, `onboarding@resend.dev` пока нет домена) |
| Деплой | Vercel (фронт) + Render (бэкенд, free tier, засыпает ~30-50 сек) |
| Планировщик | `node-cron` — напоминания каждые 5 минут |

---

## 3. Полная структура файлов

```
rezerwo/
├── backend/
│   ├── src/
│   │   ├── db.js          пул pg + initDb() — создаёт все таблицы + миграции
│   │   ├── auth.js        bcrypt, JWT, middleware requireAuth
│   │   ├── reminders.js   node-cron: поиск и отправка email-напоминаний
│   │   └── server.js      все Express-роуты (~2000 строк)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              роутер (SPA, history.pushState без react-router)
│   │   ├── main.tsx             точка входа, <LanguageProvider><App/>
│   │   ├── index.css            глобальные стили + responsive медиа-запросы
│   │   ├── api.ts               типизированный HTTP-клиент (все запросы к /api)
│   │   ├── types.ts             TypeScript-интерфейсы (Business, Service, ...)
│   │   │
│   │   ├── MarketplacePage.tsx  главная: поиск + фильтры + карточки бизнесов
│   │   ├── BusinessPage.tsx     публичная страница бизнеса + бронирование + отзывы
│   │   ├── PanelPage.tsx        кабинет владельца (~4000 строк, всё в одном файле)
│   │   ├── AdminPage.tsx        панель администратора /admin
│   │   ├── SupportPage.tsx      страница помощи + FAQ
│   │   ├── VerifyEmailPage.tsx  верификация email по токену
│   │   │
│   │   ├── RegulaminPage.tsx          юр. страница (PL, намеренно не переводится)
│   │   ├── PolitykaPrywatnosciPage.tsx юр. страница (PL, намеренно не переводится)
│   │   ├── TermsPage.tsx              (алиас/редирект)
│   │   ├── PrivacyPage.tsx            (алиас/редирект)
│   │   ├── LegalPage.tsx              общий компонент правовых страниц
│   │   │
│   │   ├── i18n/
│   │   │   ├── index.ts   LanguageProvider, useTranslation(), Lang тип, FLAGS, LANG_LABELS
│   │   │   ├── pl.ts      польский (эталон, из него вытекает тип T)
│   │   │   ├── en.ts      английский
│   │   │   ├── ru.ts      русский
│   │   │   └── ua.ts      украинский
│   │   │
│   │   ├── components/
│   │   │   ├── LangDropdown.tsx   переключатель языка (флаги + код)
│   │   │   ├── Select.tsx         кастомный select-компонент
│   │   │   ├── FeedbackWidget.tsx плавающая кнопка «сообщить об ошибке»
│   │   │   └── InstallPrompt.tsx  PWA-баннер «установить приложение»
│   │   │
│   │   └── icons/
│   │       └── CategoryIcon.tsx   иконки для 15 категорий бизнеса
│   │
│   ├── public/
│   ├── vite.config.ts    proxy /api → localhost:4000
│   ├── .env.example      VITE_API_URL
│   └── package.json
│
├── CLAUDE.md   (этот файл)
└── README.md
```

---

## 4. Роутинг (SPA без react-router)

```ts
// App.tsx — ручной роутер на history.pushState
"/"                       → MarketplacePage
"/panel"                  → PanelPage      (владелец)
"/admin"                  → AdminPage      (только role='admin')
"/verify-email"           → VerifyEmailPage
"/pomoc"                  → SupportPage
"/regulamin"              → RegulaminPage
"/polityka-prywatnosci"   → PolitykaPrywatnosciPage
"/:slug"                  → BusinessPage   (публичная страница бизнеса)
```

Навигация: `navigate("/path")` из `./App` — везде где нужна программная навигация.

---

## 5. i18n система

```ts
// frontend/src/i18n/index.ts
const DICT: Record<Lang, T> = { pl, en, ru, ua };

// Использование в любом компоненте:
const { t, lang, setLang } = useTranslation();
t.someKey   // строка или функция: t.found(n) → "Znaleziono 5 salonów"
```

**Правила i18n:**
- `pl.ts` — эталон. Тип `T = typeof pl` автоматически. Все языки ОБЯЗАНЫ реализовать все ключи.
- Добавляя новый ключ: сначала в `pl.ts`, потом в `en.ts`, `ru.ts`, `ua.ts`. TypeScript не соберётся пока все языки не заполнены.
- Юридические страницы (`/regulamin`, `/polityka-prywatnosci`) — **намеренно только на польском**, не переводить.
- `AdminPage.tsx` — тоже только польский/русский, это инструмент разработчика.

---

## 6. База данных — полная актуальная схема

### Основные таблицы

```sql
owners(
  id BIGSERIAL PK,
  email TEXT UNIQUE,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  role TEXT DEFAULT 'owner',          -- 'owner' | 'admin'
  created_at TIMESTAMPTZ
)

businesses(
  id BIGSERIAL PK,
  owner_id BIGINT UNIQUE → owners,
  slug TEXT UNIQUE,                   -- редактируемый в кабинете, напр. "barber-adam"
  name TEXT,
  category TEXT DEFAULT 'barber',     -- legacy, заменён на categories[]
  categories TEXT[],                  -- массив: ['barber','nails'], GIN-индекс
  city TEXT, district TEXT, address TEXT,
  phone TEXT, instagram TEXT, about TEXT,
  banner TEXT DEFAULT 'violet',       -- ключ градиента или URL
  hours JSONB,                        -- {"mon":["10:00","19:00"], "tue":["10:00","19:00"],...}
  photos JSONB DEFAULT '[]',          -- массив URL портфолио
  confirm_required BOOLEAN DEFAULT TRUE,
  reminder_hours JSONB DEFAULT '[24,4]',
  verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'approved',     -- 'pending' | 'approved' | 'rejected'
  is_visible BOOLEAN DEFAULT TRUE,    -- скрыть из маркетплейса без удаления
  created_at TIMESTAMPTZ
)

services(
  id BIGSERIAL PK,
  business_id BIGINT → businesses,
  grp TEXT DEFAULT '',                -- группа/раздел в списке услуг
  name TEXT, description TEXT,
  duration INT DEFAULT 30,            -- минуты
  price NUMERIC DEFAULT 0,
  sort INT DEFAULT 0,
  created_at TIMESTAMPTZ
)

masters(
  id BIGSERIAL PK,
  business_id BIGINT → businesses,
  name TEXT, photo TEXT, bio TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort INT DEFAULT 0,
  created_at TIMESTAMPTZ
)

appointments(
  id BIGSERIAL PK,
  business_id BIGINT → businesses,
  service_id BIGINT → services (ON DELETE SET NULL),
  master_id BIGINT → masters (ON DELETE SET NULL),   -- необязательно
  client_name TEXT, client_phone TEXT, client_email TEXT,
  comment TEXT,                       -- комментарий клиента при брони
  date DATE,                          -- YYYY-MM-DD (возвращается строкой, не Date!)
  start_min INT,                      -- минуты от 00:00 (напр. 570 = 09:30)
  duration INT DEFAULT 30,
  status TEXT DEFAULT 'pending',      -- pending|confirmed|cancelled|done|no_show
  source TEXT DEFAULT 'client',       -- 'client' | 'manual' (добавлена вручную владельцем)
  visit_type TEXT DEFAULT 'normal',   -- 'normal' | 'vip' | 'model' | 'free'
  private_note TEXT DEFAULT '',       -- приватная заметка владельца к этой записи
  created_at TIMESTAMPTZ
)
INDEX: appointments(business_id, date)

service_requests(
  id BIGSERIAL PK,
  business_id BIGINT → businesses,
  client_phone TEXT, text TEXT,
  handled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
)

client_notes(
  id BIGSERIAL PK,
  business_id BIGINT → businesses,
  client_phone TEXT,
  note TEXT DEFAULT '',
  updated_at TIMESTAMPTZ,
  UNIQUE(business_id, client_phone)
)

reminders_sent(
  id BIGSERIAL PK,
  appointment_id BIGINT → appointments,
  hours_before INT,
  sent_at TIMESTAMPTZ,
  UNIQUE(appointment_id, hours_before)
)

reviews(
  id BIGSERIAL PK,
  business_id BIGINT → businesses,
  appointment_id BIGINT → appointments (ON DELETE SET NULL),
  client_name TEXT, rating INT CHECK(1-5), text TEXT,
  created_at TIMESTAMPTZ,
  hidden BOOLEAN DEFAULT FALSE
)

reports(
  id BIGSERIAL PK,
  review_id BIGINT → reviews,
  owner_id BIGINT → owners,
  reason TEXT,
  status TEXT DEFAULT 'open',         -- 'open' | 'resolved' | 'rejected'
  created_at TIMESTAMPTZ
)

support_tickets(
  id BIGSERIAL PK,
  owner_id BIGINT → owners (NULL для гостей),
  email TEXT, subject TEXT, message TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ
)

waitlist(
  id BIGSERIAL PK,
  business_id BIGINT → businesses,
  service_id BIGINT → services (ON DELETE SET NULL),
  client_name TEXT, client_phone TEXT, client_email TEXT,
  preferred_date DATE,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
)

feedback(
  id BIGSERIAL PK,
  kind TEXT DEFAULT 'bug',            -- 'bug' | 'idea' | 'other'
  message TEXT, email TEXT, page TEXT,
  created_at TIMESTAMPTZ
)
```

### Важные детали БД
- **DATE-колонки** возвращаются как строки `YYYY-MM-DD` (не JS Date) — в `db.js` `pg.types.setTypeParser(1082, val => val)`.
- **start_min** = минуты от 00:00. `570 = 09:30`, `720 = 12:00`. Конвертация: `Math.floor(min/60) + ':' + String(min%60).padStart(2,'0')`.
- **categories** — массив. Фильтрация: `WHERE $1 = ANY(categories)`. legacy поле `category` существует для обратной совместимости.
- **Все таблицы создаются автоматически** при старте `npm start` через `initDb()`. Миграции — `ALTER TABLE ADD COLUMN IF NOT EXISTS` в конце `initDb()`.

---

## 7. Архитектура: ключевые решения

### Авторизация
- Только **владельцы** имеют аккаунты. Клиенты — без регистрации (имя + телефон).
- JWT в httpOnly-cookie `rz_session` + `Authorization: Bearer` fallback (Vercel → Render кросс-домен).
- `requireAuth` middleware в `auth.js` проверяет оба варианта.
- `owners.role = 'admin'` даёт доступ к `/admin`. Сейчас только Adam: `borshenkoadam15@gmail.com`.

### Логика свободных слотов (ядро системы)
Слоты **не хранятся** в БД — вычисляются на лету в `server.js`:
1. Берём рабочие часы из `businesses.hours` (или мастера если указан).
2. Шагаем с интервалом (обычно 15-30 мин).
3. Каждый кандидат проверяем: помещается ли услуга до закрытия?
4. Не пересекается ли с активными записями (`status IN ('pending','confirmed')`)?
5. Не в прошлом ли?
```js
// Проверка пересечения:
newStart < existingEnd && existingStart < newEnd
```

### Напоминания (reminders.js)
`node-cron` каждые 5 минут. Ищет записи где до начала осталось ≈ одно из `reminder_hours`. Защита от дублей через `UNIQUE(appointment_id, hours_before)` в `reminders_sent`. FROM email = `onboarding@resend.dev` (пока нет своего домена).

---

## 8. Соглашения кода

### Backend (Node/Express)
- CommonJS (`.js`), `import/export` через `type: "module"` в `package.json`.
- Каждый роут обязан проверять владельца через `business_id`: `WHERE id = $1 AND owner_id = $2`.
- Деньги: `NUMERIC` в БД, число в JSON.
- Время: `start_min` — целое число минут от 00:00.
- Даты: `YYYY-MM-DD` строка везде.
- Валидация email/телефона есть в `server.js`. Rate limiting на регистрацию (5/ч) и бронь (10/ч).

### Frontend (React/TS)
- TypeScript strict, **нет `any` без веской причины**.
- Стили: **инлайн объекты** `style={S.xxx}` — объект `S` в конце каждого компонента/файла.
- Глобальный CSS только в `index.css`: reset, responsive медиа-запросы, классы `.btn-primary`, `.search-bar`, `.city-trigger` и т.д.
- Иконки: только `lucide-react`. Импорт по одной: `import { MapPin } from "lucide-react"`.
- Навигация: `navigate("/path")` из `./App` — не `window.location.href`.
- Все строки UI через i18n: `const { t } = useTranslation()` → `t.someKey`. **Нельзя хардкодить польский текст** в TSX (кроме юр. страниц и AdminPage).
- `npm run build` должен проходить **без ошибок** перед каждым коммитом.

### Коммиты
```
feat: краткое описание новой функции
fix: краткое описание исправления
```
Всегда добавлять в конец коммит-сообщения:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## 9. Категории бизнеса (15 штук)

| ID (в БД) | PL | EN |
|---|---|---|
| `nails` | Manicure | Nails |
| `barber` | Barber | Barber |
| `hair` | Fryzjer | Hairdresser |
| `brows` | Brwi | Eyebrows |
| `tattoo` | Tatuaż | Tattoo |
| `beauty` | Salon kosmetyczny | Beauty salon |
| `laser` | Laser | Laser hair removal |
| `sugaring` | Sugaring | Sugaring |
| `lashes` | Rzęsy | Eyelashes |
| `massage` | Masaż | Massage |
| `spa` | SPA | Spa |
| `cosmetology` | Kosmetolog | Cosmetologist |
| `makeup` | Wizaż | Makeup |
| `aesthetic` | Medycyna estetyczna | Aesthetic medicine |
| `podology` | Podolog | Podiatrist |

**ID категорий в БД никогда не менять** — только отображаемые названия через `t.catLabels[id]`.

---

## 10. Переменные окружения

### Backend (Render)
```env
DATABASE_URL=postgres://...neon.tech/...   # Neon connection string
JWT_SECRET=<openssl rand -hex 32>
CLIENT_URL=https://rezerwo.vercel.app       # URL фронта БЕЗ "/" в конце
RESEND_API_KEY=re_...
FROM_EMAIL=Rezerwo <onboarding@resend.dev>
NODE_ENV=production
```

### Frontend (Vercel)
```env
VITE_API_URL=https://rezerwo-backend.onrender.com  # URL бэкенда БЕЗ "/api"
```

---

## 11. Локальный запуск

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env    # вписать DATABASE_URL (Neon) и JWT_SECRET
npm start               # :4000, таблицы создаются автоматически

# 2. Frontend (второй терминал)
cd frontend
npm install
npm run dev             # :5173, proxy /api → :4000
npm run build           # проверка типов + production build
```

---

## 12. Деплой

**Render (backend):**
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Env vars: см. раздел 10

**Vercel (frontend):**
- Root directory: `frontend`
- Framework: Vite
- Env vars: `VITE_API_URL`

**После первого деплоя (один раз в Neon):**
```sql
UPDATE owners SET role='admin' WHERE email='borshenkoadam15@gmail.com';
```

⚠️ Render на free tier «засыпает» — первый запрос после простоя ~30-50 сек.

---

## 13. Что сделано (MVP v1.0 завершён)

| Этап | Что включает |
|---|---|
| ✅ 1 — Фундамент | owners/businesses/services, регистрация/вход JWT, авто-создание бизнеса |
| ✅ 2 — Кабинет | редактор услуг (группы, drag-sort), профиль, баннер, портфолио, часы работы |
| ✅ 3 — Маркетплейс + бронь | поиск по городу/категории, публичная страница, wizard бронирования |
| ✅ 4 — Подтверждение + CRM | лента ожидающих записей, подтверждение/отклонение, заметки о клиентах |
| ✅ 5 — Напоминания | email через Resend, node-cron каждые 5 мин, защита от дублей |
| ✅ 6 — Отзывы + поддержка | рейтинг 1-5, репорты владельца, форма поддержки, юр. страницы |
| ✅ 7 — i18n + slug + запросы | 4 языка PL/EN/RU/UA, редактируемый slug, вкладка «Zapytania» |
| ✅ 8 — Модерация + антифрод | роли owner/admin, статусы pending/approved/rejected, rate limit, валидация |
| ✅ Доп. — Мастера | таблица masters, выбор мастера при брони, календарь по мастерам |
| ✅ Доп. — Ручные записи | владелец добавляет запись вручную (source=manual, тип визита, заметка) |
| ✅ Доп. — QR-код | генерация QR на страницу бизнеса, скачать/поделиться/распечатать |
| ✅ Доп. — PWA | service worker, install prompt, offline-ready |

---

## 14. Что делать дальше (v1.1+)

### 🔜 v1.1 — Приоритет
- **Cloudinary** — загрузка фото портфолио напрямую из кабинета (сейчас только URL).
- **SMS-напоминания** через SMSAPI.pl — аналог email, но SMS.
- **Мастера (полная версия)** — своё расписание на каждого мастера, страница мастера.

### ⬜ v1.2 — Удержание
- Авто-возврат: «клиент не был N недель» → напоминание.
- Программа лояльности: «5 визитов = бонус».
- Аналитика: «вторник пуст → запусти акцию».

### ⬜ v1.3 — Виджет
- Embeddable-кнопка «Zarezerwuj» для Instagram/сайта.
- Sync с Google Calendar.
- Экспорт CSV.

### ⬜ v2.0 — Платежи
- Депозит/предоплата против no-show (Stripe / Przelewy24 / BLIK).
- Только после оформления ИП!

---

## 15. Что НЕЛЬЗЯ делать

- ❌ Переписывать готовые модули без явной просьбы Adam'a.
- ❌ Менять ID категорий в БД (`nails`, `barber`, ...) — только отображаемые названия.
- ❌ Хардкодить польский текст в TSX-компонентах (кроме `AdminPage`, юр. страниц).
- ❌ Хранить фото как base64 в БД — только URL или Cloudinary.
- ❌ Принимать оплату до оформления юрлица.
- ❌ Давать клиентам регистрацию — только владельцам. Клиент = имя + телефон.
- ❌ Коммитить `.env` и секреты.
- ❌ Пушить несобранное: `npm run build` обязателен перед каждым пушем.

---

## 16. Правила работы агента

1. **Одна задача за раз.** Сделал — проверил `npm run build` — закоммитил — только потом следующее.
2. **Не трогать работающее.** Не рефакторить то, что не сломано, если не просили.
3. **Типы чистые.** Нет `any` без причины. Нет `// @ts-ignore` без комментария почему.
4. **Проверка owner-scope.** Каждый бэкенд-роут для владельца обязан проверять `owner_id`.
5. **i18n обязателен.** Новая строка в UI → сразу в все 4 языка.
6. **Коммит-сообщение** в формате `feat:` / `fix:` + строка `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
7. **Не пушить** без явной команды от Adam'a.

---

_Версия документа: v2.0 · MVP полностью готов (Этапы 1-8 + мастера + QR + PWA) · Следующее: v1.1 (Cloudinary, SMS, мастера-полная)_
