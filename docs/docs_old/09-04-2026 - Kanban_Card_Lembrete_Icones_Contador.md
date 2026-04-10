# 09/04/2026 — Card Kanban: lembrete com ícones, data/hora e dias restantes

## Comportamento (atualizado)

- Com **`reminderAt`**: uma linha simples (sem caixa com borda/fundo), apenas ícone **CalendarDays** + data/hora (`formatKanbanDatetimeLocal`) + `·` + texto de dias (`formatDaysRemainingUntilReminder`).
- **Cores no contador de dias**: `calendarDaysUntil` &lt; 0 → `text-destructive` (atraso); ≥ 0 (inclui “Hoje” e dias restantes) → verde (`text-emerald-600`).
- Com **`dueDate` mas sem `reminderAt`**: linha “Prazo …” com o mesmo ícone de calendário, sem caixa.
- Se existem **lembrete e prazo**, só a linha do lembrete é exibida (a linha “Prazo …” fica oculta para evitar redundância).

## Utilitários (`utils.ts`)

- `formatKanbanDatetimeLocal`, `calendarDaysUntil`, `formatDaysRemainingUntilReminder`.

## Arquivos

- `src/features/legal-kanban/utils.ts`
- `src/features/legal-kanban/pages/LegalKanbanPage.tsx` — `CardPreview`
- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` — `formatKanbanDatetimeLocal` via `utils`
