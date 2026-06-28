# 27/06/2026 — Repaginação Total do Design System

Repaginação minimalista do design system do E7AI Center (app web), focado em um AI Center jurídico, com nova paleta de cores, fonte Inter, padronização de componentes e reorganização de menus **sem alterar paths de rota reais**.

## 1. Fonte Inter

- `index.html`: `<link>` Google Fonts (preconnect + Inter 400/500/600/700, `display=swap`).
- `tailwind.config.ts`: `fontFamily.sans = ["Inter", ...defaultTheme.fontFamily.sans]`.
- `src/index.css`: `body` aplica `font-sans antialiased` + `font-feature-settings`.

## 2. Nova paleta (tokens HSL) — `src/index.css`

Reescrita dos blocos `:root` e `.dark` mantendo os mesmos nomes de variáveis (nada que consome tokens quebra).

| Cor | HEX | HSL |
|-----|-----|-----|
| Marinho (primária) | `#2A2D52` | `235 32% 24%` |
| Marrom (apoio) | `#76573E` | `28 31% 35%` |
| Cinza (apoio) | `#66625F` | `26 4% 39%` |
| Light bg | `#FFFFFF` | `0 0% 100%` |
| Dark bg | `#3d3d3d` | `0 0% 24%` |

- **Primária:** Marinho. Dark mode usa marinho clareado (`235 45% 70%`) para contraste AA.
- Novos tokens: `--brown`, `--gray-warm`, `--success` (verde dessaturado), `--warning` (âmbar dessaturado).
- Tokens legados `--ai-*` (rainbow) **remapeados** para a paleta: blue/purple→marinho, green→success, orange/pink→brown, cyan→gray-warm. Gradientes `--gradient-*` repintados nos novos tons. Isso neutraliza o "rainbow" no Dashboard e nos cards de processos sem editar cada arquivo.
- `--radius` reduzido para `0.625rem` (visual mais sóbrio).
- Utilitária `.scrollbar-thin` adicionada (scrollbar fina/consistente para overlays).
- `tailwind.config.ts`: adicionadas cores `success`, `warning`, `brown`, `gray-warm`, `ai.cyan`.

## 3. Sidebar — `src/components/layout/AppSidebar.tsx`

**Ícones monocromáticos:** removida a prop `color: "text-ai-*"`. Ícones em `text-muted-foreground`; item ativo em `text-primary` + `font-medium`.

**Reorganização de menus (labels/agrupamento mudam, paths NÃO):**
- `Assistentes de IA` → **`AI Center`** (ícone `Sparkles`).
- `Documentos & Processos` desmembrado em:
  - **`Gestão Jurídica`** (`Gavel`) → `Processos` → Dashboard / **Quadros Jurídicos** / Consultas Processuais.
  - **`Gestão Contábil`** (`Calculator`) → Gestão de Holerites / Gestão de SPEDs.
- **`Relatórios`** agora é item independente top-level.

Paths preservados → zero impacto em `App.tsx`, `processRoutes`, links de teams e breadcrumbs.

## 4. Login — `src/pages/Login.tsx`

- Imagem na metade **direita** em **moldura arredondada** (`rounded-3xl`, overlay marinho sutil `bg-primary/10`); formulário à **esquerda** em card destacado (`rounded-2xl border shadow-xl`).
- Removidos hex hardcoded (`rgba(184,184,184)`, `ring-black`, `bg-black`) → tokens (`border-input`, `ring-ring`, botão `variant=default` marinho).
- Mobile: empilha (imagem oculta, form full-width), `min-h-dvh`.

## 5. Padronização Select / Dropdown / Popover / Command

Altura máxima e scroll unificados (`max-h` = `min(24rem, available-height)` via vars Radix) + `.scrollbar-thin`:
- `dropdown-menu.tsx` (Content e SubContent): passa a ter teto + scroll (antes ilimitado).
- `select.tsx`: `max-h` alinhada à altura disponível.
- `popover.tsx`: teto + scroll.
- `command.tsx`: `CommandList` de `300px` → `24rem`.

## 6. Limpeza de hex hardcoded (módulo de processos)

`FavoriteProcessCard`, `ProcessResultsTable`, `ProcessMetricCard`, `ProcessFiltersSheet`, `ProcessesDashboardPage`, `ProcessQueriesPage`, `ProcessDetailsPage`: acentos `emerald/amber/blue/red/slate/white` e gradientes radiais verdes substituídos por tokens (`primary`, `accent`, `card`, `success`, `warning`, `destructive`). Estrela de favorito → `warning`. Card de consumo (verde escuro) → `bg-primary`.

## Backend / Supabase

Nenhuma alteração de banco ou Edge Functions — mudanças são apenas de labels/agrupamento e estilo; paths de rota intactos.

## 7. Dashboard reformulado + dark mode marrom (2ª rodada)

**Dark mode (correção do "lilás"):** o `--primary`/`--ring`/`--sidebar-primary` do dark mode usava marinho clareado (`235 45% 70%`), que lia como lilás. Trocado para **Marrom** clareado (`28 38% 58%`) — botões, ícones e bordas de inputs focados ficam marrom no dark e marinho no light. Tokens legados `--ai-blue/purple` no dark também remapeados para marrom; `--accent` dark ganhou leve tom marrom.

**Despadronizações de azul hardcoded → tokens:** `FirstAccessGuard`, `FirstAccessModal`, `ProtectedRoute`, `CompanyCreateModal`, `CompanyEditModal`, `UserEditModal` (botões `bg-blue-600`, focos `ring-blue-500`, ícones `bg-blue-100/text-blue-600`, caixas info `bg-blue-50/border-blue-200`) convertidos para `primary`/`ring`. Containers de ícone em `Companies` e `PayrollManagement` → `bg-primary/10 text-primary`. Azuis **semânticos de status** (processando) no módulo payroll foram mantidos. Paleta de labels multicolorida do legal-kanban (violeta etc.) preservada por ser intencional.

**Dashboard (`src/pages/Dashboard.tsx` + `src/services/dashboardService.ts`):**
- Ícones dos cards de stats e de ações rápidas padronizados em `primary` (marinho light / marrom dark).
- Removidas as métricas evolutivas (Novo, -43%…); cards exibem apenas o contador.
- Novos cards de estatística (contagens reais via Supabase MCP confirmadas):
  - **Conversas IA** = `count(chats)`.
  - **SPEDs Processados** = `count(sped_files where status='completed')`.
  - **Holerites Processados** = `count(payroll_files where status='completed')`.
  - **Processos Ativos** = `count(process_snapshots)` (processos consultados no módulo de consultas).
  - **Empresas** = `count(companies)`.
- `dashboardService` reescrito com contadores simples (`getChatsCount`, `getProcessedSpedsCount`, `getProcessedPayrollsCount`, `getConsultedProcessesCount`, `getCompaniesCount`); removidas as funções de evolução mensal (referenciavam a tabela inexistente `process_monitorings`).

> Nota: nenhuma alteração de schema foi necessária — apenas leitura de contagens via MCP do Supabase.

## Verificação

- `npm run build` ✓ (sem erros) — rodado nas duas rodadas.
- Lint: apenas 2 erros **pré-existentes** (`icon: any` em `SidebarEntry`; interface vazia `CommandDialogProps` do shadcn) — não introduzidos por esta mudança.
- Pendente de validação visual manual: `npm run dev` (porta 8081) — login, sidebar (ícones neutros + nova hierarquia), select/dropdown longos, dark mode (#3d3d3d).
