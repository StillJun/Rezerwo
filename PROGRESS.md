# PROGRESS — Rezerwo UI Roadmap

## Этапы

- [x] **Этап 0** — Фикс тёмной темы
  - Добавлен `<meta name="color-scheme" content="light">` в `index.html`
  - Добавлен `color-scheme: light` в `:root` в `index.css`
  - Причина: без этого браузер применял системную тёмную тему к нативным элементам

- [x] **Этап 1** — PWA иконка-приложение (manifest + icons + service worker)
  - Уже было реализовано: manifest.json с иконками 192/512/180, vite-plugin-pwa autoUpdate+skipWaiting+clientsClaim
- [x] **Этап 2** — Навигация: сайдбар слева (десктоп) + таб-бар снизу (мобайл)
  - `.panel-shell` / `.panel-layout` / `.panel-sidebar` / `.panel-content` в index.css
  - `BottomBar` с "Więcej" drawer для мобайла (4 главных + 5 дополнительных вкладок)
  - `NAV_ITEMS()` — 9 вкладок в сайдбаре; `TabId` union type
- [x] **Этап 3** — База клиентов (CRM)
  - БД: таблица `clients` (id, business_id, name, phone, email, notes, tags[], rodo_consent)
  - Backend: CRUD роуты `/api/crm/clients` (GET/POST/PUT/DELETE), только owner-scoped
  - Frontend: `ClientsTab` компонент — список с поиском, форма добавления, детальный просмотр
  - История визитов в детальном просмотре (uses existing `/clients/:phone` endpoint)
  - RODO чекбокс — обязательный при добавлении клиента
  - Теги (text[]), заметки
  - Вкладка "Klienci" добавлена в сайдбар и мобильный таб-бар
- [x] **Этап 4** — Цвета и расширенная инфо услуг
  - БД: `services.color TEXT DEFAULT ''` (идемпотентная миграция)
  - Backend: поле `color` в POST/PUT services + в svcClient
  - Frontend: 10-цветная палитра в ServiceModal, цветная полоска в списке услуг
- [x] **Этап 5** — Полноценный календарь владельца
  - БД: таблица `blocked_slots` (idempotent migration)
  - Backend: `POST /api/appointments` (owner create с overlap check), `PATCH /api/appointments/:id` (reschedule), `GET/POST/DELETE /api/blocked`
  - Frontend: `CalendarView` — day/week grid 07:00–22:00, цветные блоки по `serviceColor`, текущее время, drag&drop reschedule
  - `DayColumn` с drag-over preview, блокировка времени (штриховка), клик по слоту → create, клик по блоку → detail
  - `ApptDetailModal` — статус-кнопки прямо из календаря
  - `NewApptModal` — форма создания с сервисом/мастером/датой/временем
  - `BlockModal` — добавление блокировки с label и длительностью
  - Переключатель Календарь/Список в AppointmentsTab

## Заметки
- Стек: React 18 + TypeScript strict + Vite 5 + Express 4 + PostgreSQL (Neon)
- Деплой: Vercel (frontend) + Render (backend)
- PWA уже частично настроен (manifest.json, vite-plugin-pwa, иконки)
