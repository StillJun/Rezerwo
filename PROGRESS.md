# PROGRESS — Rezerwo UI Roadmap

## Этапы

- [x] **Этап 0** — Фикс тёмной темы
  - Добавлен `<meta name="color-scheme" content="light">` в `index.html`
  - Добавлен `color-scheme: light` в `:root` в `index.css`
  - Причина: без этого браузер применял системную тёмную тему к нативным элементам

- [x] **Этап 1** — PWA иконка-приложение (manifest + icons + service worker)
  - Уже было реализовано: manifest.json с иконками 192/512/180, vite-plugin-pwa autoUpdate+skipWaiting+clientsClaim
- [ ] **Этап 2** — Навигация: сайдбар слева (десктоп) + таб-бар снизу (мобайл)
- [x] **Этап 3** — База клиентов (CRM)
  - БД: таблица `clients` (id, business_id, name, phone, email, notes, tags[], rodo_consent)
  - Backend: CRUD роуты `/api/crm/clients` (GET/POST/PUT/DELETE), только owner-scoped
  - Frontend: `ClientsTab` компонент — список с поиском, форма добавления, детальный просмотр
  - История визитов в детальном просмотре (uses existing `/clients/:phone` endpoint)
  - RODO чекбокс — обязательный при добавлении клиента
  - Теги (text[]), заметки
  - Вкладка "Klienci" добавлена в сайдбар и мобильный таб-бар
- [ ] **Этап 4** — Цвета и расширенная инфо услуг
- [ ] **Этап 5** — Полноценный календарь владельца

## Заметки
- Стек: React 18 + TypeScript strict + Vite 5 + Express 4 + PostgreSQL (Neon)
- Деплой: Vercel (frontend) + Render (backend)
- PWA уже частично настроен (manifest.json, vite-plugin-pwa, иконки)
