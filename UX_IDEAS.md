# UX_IDEAS — Rezerwo · улучшение клиентского опыта

> **Ветка:** `feature/ux-improvements`
> **Цель:** довести опыт клиента (того, кто записывается) до уровня, когда запись —
> это 30 секунд без трения, а салон возвращает клиента сам.
> Владельца почти не трогаем — только там, где нужен backend под клиентскую фичу.

---

## Как пользоваться этим файлом

Каждый этап самодостаточен. Промпт агенту:

```
Реализуй Этап UX-1 из UX_IDEAS.md. Не трогай готовые модули.
После — cd frontend && npm run build, почини типы, покажи диф.
```

**Обязательные правила (из CLAUDE.md):**
- Все новые строки UI — сразу в 4 языка: `pl.ts` → `en.ts` → `ru.ts` → `ua.ts`. TS не соберётся, пока не заполнены все.
- Никакого хардкода польского текста в TSX (кроме `AdminPage` и юр-страниц).
- Каждый новый backend-роут для владельца — owner-scoped через `owner_id`.
- Клиентские роуты (`/api/public/...`) — без авторизации, но с rate limiting и валидацией ввода.
- Деньги — число, время — `start_min` (минуты от 00:00), даты — строка `YYYY-MM-DD`, зона `Europe/Warsaw`.
- `npm run build` зелёный перед каждым коммитом. Коммит: `feat:` / `fix:` + `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Стили — инлайн `style={S.xxx}`, иконки — только `lucide-react`.

**Легенда объёма:** `S` ≈ пара часов · `M` ≈ день · `L` ≈ несколько дней.

---

## Порядок этапов (по соотношению польза / трудозатраты)

| Этап | Тема | Статус |
|---|---|---|
| UX-1 | Быстрые победы | ✅ |
| UX-2 | Флоу бронирования | ✅ |
| UX-3 | Управление записью клиентом (magic-link) | ✅ |
| UX-4 | Маркетплейс: поиск, выдача, избранное | ✅ (фильтры 4.3 отложены) |
| UX-5 | Страница бизнеса: галерея, мастера, навигация | ✅ |
| UX-6 | Доверие и отзывы | ✅ |
| UX-7 | Доступность и надёжность | ✅ |

**Остаток:** UX-4.3 (фильтры: язык / удобства / цена) — отдельным коммитом; `min_price` в API для цены.

---

## Этап UX-1 — Быстрые победы ✅

Мало кода, эффект виден сразу. Всё во фронте, без БД. **Сделано** (коммит `feat: UX-1`).

Новые модули: `lib/clientMemory.ts`, `lib/validate.ts`, `lib/calendar.ts`, `lib/useModalA11y.ts`,
`components/Toast.tsx` (+ `<ToastHost/>` в `App.tsx`).

- [x] **1.1 · Запоминание клиента** — `lib/clientMemory.ts` (`loadClient`/`saveClient`, ключ `rz_client`,
  try/catch на приватный режим). Подставляется в `BookingWizard`, `WaitlistModal`,
  `ServiceRequestModal`, поле имени в отзыве. Сохраняется после успешной брони/waitlist/запроса. Comment не хранится.
- [x] **1.2 · «Добавить в календарь»** — `lib/calendar.ts`: `googleCalendarUrl()` + `icsDataUri()`
  (data-URI, без blob-cleanup). Блок на шаге `done` (`calEvent`), TZID=Europe/Warsaw. Google-ссылка как fallback для PWA.
- [x] **1.3 · Share** — кнопка `Share2` в `navBar` → `navigator.share()` → fallback `clipboard.writeText` + тост.
- [x] **1.4 · Инлайн-валидация** — `lib/validate.ts` (`isEmail`, `isPhone` — зеркало backend-regex).
  Проверка в `book()`, `WaitlistModal.send()`, `ServiceRequestModal.send()` перед запросом.
- [x] **1.5 · Нудж про email** — `t.emailReminderHint` под пустым полем email в `BookingWizard` (не блокирует).
- [x] **1.6 · `inputMode`** — `inputMode="tel"/"email"` + `autoComplete` на всех клиентских полях.
- [x] **1.7 · `useModalA11y`** — `Esc` закрывает, scroll-lock `body`, фокус в модалку (уважает `autoFocus`)
  и возврат на триггер. Подключён к 3 клиентским модалкам + `role="dialog"`/`aria-modal`/`aria-label` на иконочных кнопках.
- [x] **1.8 · Скелетон страницы бизнеса** — `BizSkeleton` вместо `…`.
- [x] **1.9 · Загрузка отзывов** — `loading` state + skeleton-строки в `ReviewsSection` (AUDIT K-5).

**i18n ключи UX-1 (добавлены в pl/en/ru/ua):** `addToCalendar`, `calGoogle`, `calIcs`,
`errEmailFormat`, `errPhoneFormat`, `emailReminderHint`, `share`, `linkCopied`.

---

## Этап UX-2 — Флоу бронирования ✅

Ядро продукта. **Сделано** (коммит `feat: UX-2`).

Backend: `slotsForDate()` вынесен как общий хелпер; `/slots` переписан на него; новый
`GET /public/businesses/:slug/availability?service_id=&master_id=&days=` (≤30, Cache-Control 60s);
`addDaysStr()` хелпер; `confirmRequired` добавлен в `publicBizClient`.

- [x] **2.1 · Доступность в выборе даты** — `api.availability()`, грузится per service/master.
  Дни с `0` окон — приглушены + метка `t.dayFull`, но кликабельны.
- [x] **2.2 · Чип «Ближайшее свободное»** — над date-picker, прыгает на первый день с окнами → шаг `slots`.
- [x] **2.3 · Группировка слотов** — `bucketSlots()` → Утро (<12) / День (12–17) / Вечер (≥17),
  подзаголовки только если заполнено >1 корзины.
- [x] **2.4 · Не пропускать мастера** — новый шаг `"resolve"`: при входе с услуги ждёт загрузки
  мастеров, затем роутит на `master` (если выбор ≥2) или `date`. Нумерация шагов через `seq[]`.
- [x] **2.5 · Крупная сводка** — `S.summaryCard` на шаге `details` (услуга+цена, дата+время+мастер, длительность).
- [x] **2.6 · «Подтверждение вручную» до брони** — `S.confirmNotice` на шаге `details` если `biz.confirmRequired`.
- [x] **2.7 · Память выбора** — `sessionStorage` `rz_wiz_<slug>` = `{serviceId, masterId, masterName}`,
  восстанавливается при открытии без `initService` (если услуга ещё существует). PII не хранится.
- [x] **2.8 · Кнопка «Zarezerwuj» внизу** — `setBooking("open")` вместо `services[0]`.

**i18n ключи UX-2 (pl/en/ru/ua):** `earliestSlot`, `dayFull`, `slotsMorning`, `slotsAfternoon`,
`slotsEvening`, `confirmRequiredNotice`.

---

## Этап UX-3 — Управление записью клиентом (magic-link) ✅

Клиент теперь может сам отменить/перенести запись по ссылке из письма — без аккаунта.

**Сделано** (коммит `feat: UX-3`).

- [x] **3.1 · Токен записи** — `appointments.manage_token TEXT` + partial unique index (миграция в `db.js`).
  `randomBytes(24).hex` генерится в `/book`, возвращается в `BookingResult.manageToken`.
  В списках владельца/публичных не отдаётся.
- [x] **3.2 · Страница `/wizyta/:token`** — `ManageBookingPage.tsx` (маршрут в `App.tsx`).
  Backend: `GET /public/appointments/:token`, `POST .../cancel`, `POST .../reschedule`
  (все с `bookLimiter`; reschedule переиспользует `isSlotFree`, исключая саму запись из проверки;
  нельзя менять `done`/`cancelled`/прошедшие). Reschedule сбрасывает статус в `pending`,
  если `confirm_required`.
- [x] **3.3 · Ссылка в письмах** — `manageButton(token)` в `reminders.js`: в письмах `created`,
  `confirmed`, `rescheduled` и в reminder-письме. Использует `CLIENT_URL` (см. HANDOFF §2).
  Новый `notifyOwnerBookingChange()` — владельцу об отмене/переносе клиентом.
- [x] **3.4 · «Записаться снова»** — кнопка на `/wizyta/:token` (статус cancelled/done) → `/{slug}`.
  Ссылка «перенести · отменить» на экране `done` мастера бронирования.

**Backend UX-3:** колонка `manage_token`, 3 публичных роута, `notifyOwnerBookingChange`,
`rescheduled` в `notifyClientBooking`. Owner-scope не затронут. **i18n:** блок `mv_*` в pl/en/ru/ua.

---

## Этап UX-4 — Маркетплейс: поиск, фильтры, выдача ✅ (4.3 частично)

Новый модуль `lib/marketMemory.ts` (последний поиск, недавние, избранное — всё в `localStorage`).

- [x] **4.1 · Бизнесы сразу при заходе** — `MarketplacePage` грузит выдачу на mount (`loading` стартует `true`),
  заголовок `t.popularSalons` пока фильтры пусты. Empty-state теперь с чипами городов.
- [x] **4.2 · Сортировка** — селектор «Wg oceny / Najnowsze / Wg nazwy», клиентская сортировка `sortedResults`.
- [ ] **4.3 · Фильтры** — ⬜ отложено: язык/удобства/цена. `languages`/`amenities` уже в payload
  (можно сделать клиентски), цена требует `min_price` в API. Вынести в отдельный коммит.
- [x] **4.4 · Фото в карточке** — `biz.photos[0]` фоном карточки (`cardBannerImg`), градиент — fallback, `loading="lazy"`.
- [x] **4.5 · Недавние + избранное** — `pushRecent()` на открытии страницы бизнеса; секции «Обране» и
  «Нещодавно переглянуті» над выдачей (только когда фильтры пусты); сердечко на карточке (`toggleFav`).
- [x] **4.6 · Память поиска** — `rz_search` (город+категория), восстанавливается на mount.
- [x] **4.7 · Язык из `?lang=`** — `i18n/index.ts` `getInitialLang()`: `?lang=` → сохранённый → браузер.
- [x] **4.8 · Карточка как `<a href>`** — средняя/Ctrl-кнопка мыши работает нативно, SPA-навигация по обычному клику.

**i18n ключи UX-4 (pl/en/ru/ua):** `popularSalons`, `recentlyViewed`, `favorites`, `sortLabel`,
`sortRating`, `sortNewest`, `sortNameAZ`, `filtersBtn`, `clearFilters`.

---

## Этап UX-5 — Страница бизнеса: галерея, мастера, навигация ✅

**Сделано** (коммит `feat: UX-5`).

- [x] **5.1 · Галерея портфолио** — `PhotoLightbox` (стрелки, `Esc`, счётчик, scroll-lock),
  сетка миниатюр `galleryGrid`, баннер по клику открывает лайтбокс (`cursor: zoom-in`).
- [x] **5.2 · Блок «Специалисты»** — `api.publicMasters(slug)` в `BusinessPage`, карточки с аватаром/био,
  кнопка «Zarezerwuj» открывает мастер бронирования. (Пресет мастера в wizard — можно доделать позже.)
- [x] **5.3 · Якорная навигация** — липкая мини-панель `anchorNav`, `scrollIntoView` к секциям
  `#biz-services / #biz-specialists / #biz-portfolio / #biz-reviews / #biz-contact`.
- [x] **5.4 · Выходные явно** — `hoursBox` показывает все 7 дней; нерабочий → `t.dayOff` серым.
- [x] **5.5 · «Скоро закрывается»** — `getOpenStatus` возвращает `closesAt`, если до закрытия ≤ 60 мин →
  бейдж `t.closingSoon(time)`.

**i18n ключи UX-5 (pl/en/ru/ua):** `portfolio`, `specialists`, `contactNav`, `bookWith`, `dayOff`, `closingSoon`.

---

## Этап UX-6 — Доверие и отзывы ✅

**Сделано** (коммит `feat: UX-6`).

БД: `reviews.verified`, `reviews.owner_reply`, `reviews.owner_reply_at`,
partial-unique `idx_reviews_appointment`, таблица `review_requests_sent`.

- [x] **6.1 · Верифицированные отзывы** — `POST .../reviews` принимает `manage_token`; если он валиден
  и запись принадлежит бизнесу → `appointment_id` + `verified=true` (1 отзыв на запись, дубль → 409).
  Форма отзыва на `/wizyta/:token` для прошедших визитов. Бейдж «Był na wizycie» на странице бизнеса и в панели.
- [x] **6.2 · Ответы владельца** — `PUT /api/reviews/:id/reply` (owner-scoped). Показ ответа под отзывом
  на странице бизнеса (`S.ownerReply`) и редактирование во вкладке «Opinie» панели.
- [x] **6.3 · Сортировка отзывов** — `?sort=recent|rating_desc|rating_asc`, селектор в `ReviewsSection`
  (при `total > 1`); avg/total считаются в SQL, а не по 50 отданным строкам.
- [x] **6.4 · Письмо после визита** — `sendReviewRequests()` в `reminders.js`, cron каждые 30 мин:
  визиты, закончившиеся 2–48 ч назад, `confirmed/done`, есть email+token, нет записи в
  `review_requests_sent` и нет отзыва → письмо со ссылкой `/wizyta/:token`.

**i18n ключи UX-6 (pl/en/ru/ua):** `reviewVerified`, `reviewSortHigh`, `reviewSortLow`, `ownerReplyLabel`,
`rateYourVisit`, `p_reviewReply`, `p_reviewReplyPh`, `p_reviewReplySave`, `p_reviewReplyDelete`, `p_reviewVerified`.

---

## Этап UX-7 — Доступность и надёжность ✅

**Сделано** (коммит `feat: UX-7`).

- [x] **7.1 · Семантика и ARIA** — лого и карточки бизнеса теперь `<a href>` (средняя/Ctrl-кнопка мыши);
  `htmlFor`/`id` в формах брони и отзыва; `aria-label` на точках фото, звёздах (`role="radiogroup"`),
  иконочных кнопках лайтбокса/модалок; `role="dialog"`/`aria-modal` (UX-1).
- [x] **7.2 · `prefers-reduced-motion`** — уже было в `index.css` (глобально гасит анимации/переходы).
- [x] **7.3 · Тосты** — `showToast` / `<ToastHost/>` (UX-1); ошибки клиентских форм показываются через `setErr`
  или тост. Тихие `.catch(()=>{})` остались только на фоновых загрузках (список отзывов/мастеров) —
  намеренно, чтобы не спамить тостами на холодном старте Render.
- [x] **7.4 · Фокус-видимость** — `:focus-visible` (2px violet outline) в `index.css`, мышиный фокус без рамки.
- [x] **7.5 · `document.title` per-page** — в `App.tsx` по маршруту; `BusinessPage` и `ManageBookingPage`
  ставят `{название} — Rezerwo` после загрузки.

---

## Связанные пункты из AUDIT.md (решение Adam'а)

Эти не в scope UX, но пересекаются — держать в голове:

- **M-9** — `CLIENT_URL` на Render: magic-link из UX-3 не заработает, если не задан правильный домен.
- **M-10** — авто-аппрув бизнесов: влияет на качество выдачи в UX-4.1.
- **M-11** — overlap-check без мастера: влияет на точность слотов в UX-2.1 и переносе в UX-3.2.

---

## Что НЕ делать на этой ветке

- ❌ Не переписывать `PanelPage.tsx` / календарь владельца — только точечные backend-добавки.
- ❌ Не менять ID категорий, схему существующих таблиц (только `ADD COLUMN IF NOT EXISTS`).
- ❌ Не вводить аккаунты для клиентов — всё через `localStorage` и magic-link.
- ❌ Не тащить UI-библиотеки, роутер, стейт-менеджеры.
- ❌ Не хардкодить тексты — 4 языка сразу.

---

_Создано как план ветки `feature/ux-improvements`. Отмечать `[x]` по мере реализации,
дописывать детали реализации под пунктом (как в PROGRESS.md)._
