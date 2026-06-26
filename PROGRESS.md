# PROGRESS — Rezerwo UI Roadmap

## Этапы

- [x] **Этап 0** — Фикс тёмной темы
  - Добавлен `<meta name="color-scheme" content="light">` в `index.html`
  - Добавлен `color-scheme: light` в `:root` в `index.css`
  - Причина: без этого браузер применял системную тёмную тему к нативным элементам

- [ ] **Этап 1** — PWA иконка-приложение (manifest + icons + service worker)
- [ ] **Этап 2** — Навигация: сайдбар слева (десктоп) + таб-бар снизу (мобайл)
- [ ] **Этап 3** — База клиентов (CRM)
- [ ] **Этап 4** — Цвета и расширенная инфо услуг
- [ ] **Этап 5** — Полноценный календарь владельца

## Заметки
- Стек: React 18 + TypeScript strict + Vite 5 + Express 4 + PostgreSQL (Neon)
- Деплой: Vercel (frontend) + Render (backend)
- PWA уже частично настроен (manifest.json, vite-plugin-pwa, иконки)
