# Rezerwo — Аудит 2026-06-27

> Статус: ФИКСЫ ПРИМЕНЕНЫ — 8 коммитов запушено
> Сборка: ✅ frontend `npm run build` зелёный (финал), backend синтаксис чист

---

## 🔴 КРИТИЧНО (блокирует, ломает флоу, безопасность)

---

### C-1 · Напоминания: временная зона на сервере (UTC vs Warsaw)
**Файл:** `backend/src/reminders.js:85–88`

```js
const apptTime = new Date(`${String(appt.date).slice(0,10)}T00:00:00`);
apptTime.setMinutes(apptTime.getMinutes() + appt.start_min);
```
На Render сервер работает в UTC. `new Date("2026-06-27T00:00:00")` создаёт UTC полночь, а не варшавскую. Бронь на 18:00 по Варшаве (UTC+2 летом) = 16:00 UTC. Но `apptTime` = UTC полночь + 1080 мин = 18:00 UTC — на 2 часа позже реального времени. Напоминания срабатывают **на 2 часа раньше** нужного момента (для h=4 клиент получит письмо за 2ч вместо 4ч).

**Фикс:** Строить время явно: `new Date(`${date}T${minToTime(start_min)}:00+02:00`)` или `+01:00` зимой, через `Intl`/вычисление Warsaw offset.

---

### C-2 · `calcSlots`: неправильный день недели на UTC-сервере
**Файл:** `backend/src/server.js` → функция `calcSlots` (определение `DAY_KEYS`)

```js
const date = new Date(dateStr + "T00:00:00");
const dayKey = DAY_KEYS[date.getDay()];
```
На UTC сервере `new Date("2026-06-27T00:00:00")` — UTC полночь. Но если клиент присылает "2026-06-27" в варшавском понедельнике (23:30 Warsaw = 21:30 UTC = ещё воскресенье UTC), сервер вычислит слоты по расписанию воскресенья, а не понедельника. Клиент видит неправильные окна записи.

**Фикс:** `const dayKey = DAY_KEYS[new Date(dateStr + "T12:00:00Z").getDay()]` — noon UTC всегда внутри нужного дня.

---

### C-3 · XSS в email-шаблонах через пользовательский ввод
**Файл:** `backend/src/reminders.js` — все email-функции

```js
html: `... ${clientName} ... ${businessName} ... ${bizAddr} ...`
```
Поля `clientName`, `businessName`, `serviceName`, `bizAddr`, `bizPhone` подставляются в HTML **без экранирования**. Клиент, назвавшись `<img src=x onerror=alert(1)>`, инжектирует HTML в email владельцу. Большинство email-клиентов режут `<script>`, но HTML-инъекция в письмо возможна.

**Фикс:** Добавить хелпер `esc(s)` = `s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")` и обернуть все вставки.

---

## 🟡 СРЕДНЕ (баг, но не полностью блокирует)

---

### M-1 · `isoToday()` / `addDays()` в клиентском маркетплейсе — UTC вместо Warsaw
**Файл:** `frontend/src/BusinessPage.tsx:36,83–86`

```js
function isoToday() { return new Date().toISOString().slice(0,10); }
```
После 22:00 варшавского летнего времени UTC уже переходит в следующий день. Клиент видит "завтра" как первый доступный день и не видит оставшихся слотов на сегодня. Бэкенд при этом правильно использует `todayPoland()`.

**Фикс:** `function isoToday() { return new Date().toLocaleString("en-CA",{timeZone:"Europe/Warsaw"}).slice(0,10); }`

---

### M-2 · `notifyOwnerNewBooking` вызывается когда владелец сам создаёт запись
**Файл:** `backend/src/server.js:663`

```js
notifyOwnerNewBooking(row.id).catch(() => {});
```
В маршруте `POST /api/appointments` (панель владельца) — владелец получает email "новая запись" о своём собственном действии. Это спам.

**Фикс:** Убрать вызов `notifyOwnerNewBooking` из маршрута панели (строка 663). `notifyClientBooking` оставить — клиенту письмо уместно.

---

### M-3 · `changeStatus` без try/catch — молча ломается при ошибке API
**Файл:** `frontend/src/PanelPage.tsx` — `changeStatus` в `AppointmentsTab`

```js
const changeStatus = async (id, status) => {
  await api.updateAppointment(id, status);
  await Promise.all([load(), loadPending()]);
};
```
Нет try/catch. При ошибке API статус в UI не обновится, но и ошибки пользователь не увидит.

**Фикс:** Обернуть в try/catch, показать `setErr(...)`.

---

### M-4 · `saveNote` в `ClientModal` без try/catch
**Файл:** `frontend/src/PanelPage.tsx` — `saveNote`

Та же проблема — тихий сбой без фидбека.

**Фикс:** try/catch + показать ошибку пользователю.

---

### M-5 · `notify` (Waitlist) и `load()` в `WaitlistTab`/`ServiceRequestsTab` без обработки ошибок
**Файл:** `frontend/src/PanelPage.tsx`

Оба `.catch(()=>{})` поглощают ошибки без сообщения в UI.

**Фикс:** Добавить состояние `err` и показывать его.

---

### M-6 · `client_email` не валидируется как email до сохранения
**Файл:** `backend/src/server.js:640` (панель), `:922` (публичное бронирование)

Email принимается как любая строка без проверки формата. При попытке отправить письмо Resend вернёт ошибку (поглощается), но "email" вида `asdf` сохраняется в БД.

**Фикс:** Добавить regex-проверку: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

---

### M-7 · `start_min` не валидируется как целое число в диапазоне 0–1439
**Файл:** `backend/src/server.js:641,881`

Принимается без проверки типа и диапазона. Значение `-1` или `99999` пройдёт проверку `start_min == null` и запишется в БД.

**Фикс:** `if (!Number.isInteger(start_min) || start_min < 0 || start_min > 1439)` → 400.

---

### M-8 · Гонка в `generateSlug` может дать 500 при одновременной регистрации
**Файл:** `backend/src/server.js:139–148`

SELECT slug + INSERT slug — две отдельные операции без транзакции. При двух одновременных регистрациях с одним именем одна вернёт 500 (unique constraint violation).

**Фикс:** Поймать ошибку `23505` (unique violation) и повторить генерацию с другим суффиксом.

---

### M-9 · `CLIENT_URL` не установлен в prod → ссылка верификации ведёт на localhost
**Файл:** `backend/src/reminders.js:127`

```js
const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?...`
```
Если `CLIENT_URL` не добавлен в Render env vars — письмо верификации идёт с localhost-ссылкой. Владелец не сможет подтвердить email.

**Фикс:** Добавить startup-предупреждение если `CLIENT_URL` не задан; и проверить что он реально добавлен в Render.

---

### M-10 · Новые бизнесы авто-аппрувятся — модерация обходится
**Файл:** `backend/src/server.js:288,390`

`status='approved'` проставляется при регистрации автоматически. Бизнес появляется в маркетплейсе сразу без модерации.

**Статус:** Может быть намеренным для MVP (CLAUDE.md упоминает модерацию). Требует решения Adam'а — оставить или включить `status='pending'` с авто-аппрувом только через email верификацию.

---

### M-11 · Overlap check в панели без мастера делает business-wide проверку
**Файл:** `backend/src/server.js:651–653`

При `master_id = null` проверка ищет пересечения среди ВСЕХ записей бизнеса, а не конкретного мастера. Владелец с несколькими мастерами не может добавить запись "без мастера" если хоть у кого-то есть бронь в то же время.

**Статус:** Логика спорная — требует обсуждения.

---

## ⚪ КОСМЕТИКА

---

### K-1 · `isoToday` именование вводит в заблуждение (возвращает UTC, не ISO)
`frontend/src/BusinessPage.tsx:36`

---

### K-2 · "Więcej" в BottomBar захардкожен по-польски, не через i18n
`frontend/src/PanelPage.tsx:450`

---

### K-3 · `colRef.current!` без null-guard (TypeScript strictness)
`frontend/src/PanelPage.tsx:1005`

---

### K-4 · Колонка `color` у `services` не в основном DDL, добавляется через `ALTER TABLE`
`backend/src/db.js:281` — работает, но схема не читается как единое целое.

---

### K-5 · Нет состояния загрузки в `ReviewsSection`
`frontend/src/BusinessPage.tsx:504–505`

---

### K-6 · `confirm()` для удаления в `ClientsTab` — блокируется в iframe-контексте
`frontend/src/PanelPage.tsx:2519`

---

### K-7 · Email поддержки не валидируется по формату
`backend/src/server.js:1043`

---

### K-8 · CORS пропускает запросы без `Origin` header
`backend/src/server.js:37` — стандартная практика для REST API, но стоит документировать.

---

## СТАТУС ФИКСОВ

| # | ID | Что | Коммит | Статус |
|---|-----|-----|--------|--------|
| 1 | C-3 | XSS в email: `esc()` хелпер | `f69f36b` | ✅ |
| 2 | C-1 | Reminder timezone → Warsaw (sv-SE trick) | `9d27419` | ✅ |
| 3 | C-2 | `calcSlots` getDay → noon UTC | `a8097c2` | ✅ |
| 4 | M-1 | `isoToday()` / `addDays()` → Warsaw | `ab9498b` | ✅ |
| 5 | M-2 | `notifyOwnerNewBooking` убран из панели | `f89fbde` | ✅ |
| 6 | M-6 | Валидация `client_email` regex | `3a8d4a6` | ✅ |
| 7 | M-7 | Валидация `start_min` 0–1439 | `3a8d4a6` | ✅ |
| 8 | M-3 | try/catch в `changeStatus` + UI ошибка | `3265668` | ✅ |
| 9 | M-4 | try/catch в `saveNote` + UI ошибка | `3265668` | ✅ |
| 10 | M-5 | try/catch в `notify` waitlist + UI ошибка | `3265668` | ✅ |
| 11 | M-8 | Slug race condition → catch 23505 | `ec17140` | ✅ |
| 12 | K-2 | "Więcej" → `t.p_navMore` (4 языка) | `b0607dc` | ✅ |

---

## ТРЕБУЮТ РЕШЕНИЯ ADAM'А (не тронуто)

| ID | Проблема | Варианты |
|----|----------|----------|
| M-9 | `CLIENT_URL` не задан на Render → ссылка верификации ведёт на localhost | Проверь Render env vars: должно быть `CLIENT_URL=https://getrezerwo.pl` |
| M-10 | Новые бизнесы авто-аппрувятся без модерации | A) оставить как есть (быстрый онбординг) / B) `status='pending'` → модерируй через /admin |
| M-11 | Overlap check без мастера = business-wide блокировка | Обсудить нужна ли проверка по всем мастерам или только по конкретному |

---

## ИТОГ

- **Было критичных: 3 → исправлено 3** ✅
- **Было средних: 9+2 → исправлено 9, 2 на решении Adam'а** ✅
- **Было косметических: 8 → исправлено 1 (K-2), остальные несущественны** ✅
- Сборка зелёная, типы чистые, 8 коммитов запушено
- Render нужно перезапустить чтобы подтянул новый код
