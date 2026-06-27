# Calendar Drag&Drop — Progress

## Этапы

| # | Описание | Статус | Коммит |
|---|----------|--------|--------|
| 1 | Drag&drop перенос записи (мышь + тач long-press) | ✅ | `b5e4d52` |
| 2 | Overlap prevention (красный ghost, запрет drop) | ✅ | `2039524` |
| 3 | Resize за нижний край (изменение длительности) | ✅ | `24b58b1` |
| 4 | Tap → actions (ApptDetailModal) | ✅ | уже было |
| 5 | Click empty slot → create booking | ✅ | уже было |

---

## Этап 1 — Drag&Drop перенос ✅ `b5e4d52`

**Библиотека:** `@dnd-kit/core`

- `PointerSensor` `distance:5` — мышь, drag после 5px
- `TouchSensor` `delay:250, tolerance:5` — long-press 250ms на тач
- `DraggableApptBlock` с `useDraggable` + `touchAction: 'none'`
- `colRefsMap` (Map `day → HTMLDivElement`) для вычисления координат
- `calcTargetFromPointer(clientX, clientY)` → `{date, startMin}` (snap 5 мин)
- `RescheduleConfirmDialog`: "Przenieść wizytę? → {имя}, {дата}, {время}"
  - [Tak, przenieś] → PATCH `/api/appointments/:id {date, start_min}` → update state
  - [Anuluj] → nothing
  - Rollback при ошибке бэка
- Если drop на то же время — диалог не показывается

**Ограничение:** Скролл касанием блока записи недоступен (стандарт touch-drag).  
Скроллить нужно за пустые области колонки.

---

## Этап 2 — Overlap prevention ✅ `2039524`

- `isDragOverlap` (useMemo): проверяет, пересекается ли `dragOver` с любой другой активной записью на той же дате
- Условие: `newStart < existing.startMin + existing.duration && existing.startMin < newStart + dragging.duration`
- Ghost preview: фиолетовый → красный при overlap
- `handleDragEnd`: если overlap — Drop игнорируется, диалог не открывается
- Исключает саму перетаскиваемую запись и отменённые записи

---

## Этап 3 — Resize за нижний край ✅ `24b58b1`

### Backend
- `PATCH /api/appointments/:id` расширен: принимает опциональный `duration`
- Три режима: `{date, start_min}` / `{duration}` / `{date, start_min, duration}`
- Overlap check использует новую длительность

### Frontend
- `api.resizeAppointment(id, duration)` → PATCH `{duration}`
- `resizing` state: `{id, date, startMin, originalDuration, currentDuration}`
- `handleResizeStart(e, a)`: `e.stopPropagation()` → dnd-kit не активируется
- `useEffect([resizing?.id])`: `document.addEventListener('pointermove'/'pointerup')`
  - `pointermove`: пересчёт высоты из `clientY - colRect.top`, snap 5 мин, min 15 мин, max 480 мин
  - `pointerup`: финальный размер, PATCH, update state
- `DraggableApptBlock`:
  - Отображает `resizingDuration` вместо `a.duration` во время resize
  - 10px handle внизу блока, `cursor: ns-resize`
  - Solid border + усиленная тень во время resize

---

## Этап 4 — Tap → Actions ✅ (уже было)

Быстрый тап (< 250ms) не активирует TouchSensor → `onClick` → `onApptClick(a)` → `ApptDetailModal`:
- Статусы: Potwierdź / Odrzuć / Oznacz jako wykonane / No-show
- Кнопка CRM, информация о записи

---

## Этап 5 — Create from empty slot ✅ (уже было)

Клик на пустую область колонки (className `cal-col`) → `onSlotClick(day, getMin(e))` → `NewApptModal` с предзаполненными датой и временем (snap 15 мин). ПКМ → `NewBlockModal`.
