# Calendar Drag&Drop — Progress

## Этапы

| # | Описание | Статус | Коммит |
|---|----------|--------|--------|
| 1 | Drag&drop перенос записи (мышь + тач long-press) | ✅ Готово | — |
| 2 | Overlap prevention во время drag | ⬜ | — |
| 3 | Resize за нижний край (изменение длительности) | ⬜ | — |
| 4 | Tap → actions menu (статус, удалить) | ⬜ | — |
| 5 | Tap empty slot → create booking (время предзаполнено) | ⬜ | — |

---

## Этап 1 — Drag&Drop перенос записи ✅

**Библиотека:** `@dnd-kit/core` (`PointerSensor` + `TouchSensor`)

### Что сделано

- Установлен `@dnd-kit/core` + `@dnd-kit/utilities`
- Убран HTML5 drag (`draggable`, `onDragOver`, `onDrop`)
- Добавлен компонент `DraggableApptBlock` (использует `useDraggable`)
  - `PointerSensor` с `activationConstraint: { distance: 5 }` — мышь: drag начинается после 5px движения
  - `TouchSensor` с `activationConstraint: { delay: 250, tolerance: 5 }` — тач: long-press 250ms
  - `touchAction: 'none'` на блоке — обязательно для тач-drag
  - Прозрачность 0.35 во время перетаскивания
- Координаты указателя → столбец/время через `calcTargetFromPointer`
  - Рефы столбцов хранятся в `colRefsMap` (Map), обновляются через `onColRef`
  - Snap к 5-минутной сетке
  - Ограничение: не раньше CAL_S, не позже CAL_E - 15 мин
- Ghost preview на целевой позиции (фиолетовая рамка) — без изменений
- После drop: диалог подтверждения `RescheduleConfirmDialog`
  - "Przenieść wizytę? → {имя} → {дата}, {время}"
  - [Tak, przenieś] → PATCH `/api/appointments/:id` → update state
  - [Anuluj] → ничего
  - Rollback при ошибке бэкенда: `alert` + `reload()`
- Если drop на то же время — диалог не показывается

### Ключевые файлы

- `frontend/src/PanelPage.tsx`:
  - `DraggableApptBlock` (~line 1050) — draggable appointment block
  - `RescheduleConfirmDialog` (~line 1030) — confirm dialog
  - `CalendarView.colRefsMap` — refs для вычисления координат
  - `CalendarView.calcTargetFromPointer` — конвертация clientX/Y → {date, startMin}
  - `CalendarView.handleDragStart/Move/End/Cancel` — dnd-kit handlers

### Известные ограничения

- Нет auto-scroll при перетаскивании к краю (будет в следующих этапах или по необходимости)
- При касании appointment block'а для scroll'а — scroll не работает (стандартное ограничение touch drag)
  - Пользователь должен скроллить за пустые области колонки

---

## Этап 2 — Overlap prevention ⬜

Планируется: подсвечивать занятые слоты красным во время drag, блокировать drop если пересечение с другой записью.

## Этап 3 — Resize ⬜

Планируется: drag за нижний край appointment block'а → изменение `duration`.

## Этап 4 — Tap → Actions ⬜

Уже реализовано через `onApptClick → ApptDetailModal`. Если нужно отдельное action menu — добавить.

## Этап 5 — Create from slot ⬜

Уже реализовано через `onSlotClick → NewApptModal`. Работает.
