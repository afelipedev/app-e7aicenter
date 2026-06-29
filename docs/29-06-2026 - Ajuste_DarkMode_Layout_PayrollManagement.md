# 29/06/2026 - Ajuste Dark Mode e Layout da Página de Holerites da Empresa

## Contexto

A página de detalhes da empresa (rota `/companies/:companyId/payrolls`, componente
[`PayrollManagement.tsx`](../src/pages/PayrollManagement.tsx)) apresentava dois problemas:

1. **Dark mode inadequado** — background ficava branco e diversos textos/elementos usavam
   cores fixas (cinzas, vermelhos, branco), quebrando o tema escuro.
2. **Conteúdo centralizado/limitado** — a página usava um container `max-w-7xl mx-auto`,
   ficando estreita e centralizada, diferente das demais páginas que ocupam a largura total.

## O que foi implementado

### 1. Layout expandido (largura total)

- Removido o container raiz `min-h-screen bg-white` e o wrapper interno
  `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8`.
- Adotado o mesmo padrão das demais páginas (ex.: [`Companies.tsx`](../src/pages/Companies.tsx)):
  raiz `p-4 sm:p-6 space-y-6 sm:space-y-8`, deixando o background a cargo do `AppLayout`.
- Removidas margens redundantes (`mb-6 sm:mb-8`) dos blocos internos, já que o espaçamento
  passou a ser controlado pelo `space-y` do container.

### 2. Dark mode adequado ao design system

Substituição de cores hardcoded por tokens semânticos do Tailwind/shadcn:

| Antes | Depois |
|-------|--------|
| `bg-white` (raiz) | removido — background do `AppLayout` |
| `bg-white` (modal) | `bg-card` + `border border-border` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600` / `text-gray-700` / `text-gray-400` | `text-muted-foreground` / `text-foreground` |
| `bg-gray-100` / `bg-gray-200` | `bg-muted` / `bg-muted/80` |
| `text-red-500` / `text-red-600` | `text-destructive` |
| `bg-red-50` / `bg-red-100` | `bg-destructive/10` |
| `border-red-200` | `border-destructive/30` |
| `bg-red-600 hover:bg-red-700 text-white` | `bg-destructive hover:bg-destructive/90 text-destructive-foreground` |
| `bg-black bg-opacity-50` | `bg-black/50` |
| `hover:text-blue-700` | `hover:underline` |

Aplicado também aos estados de **loading**, **erro de conectividade** e
**empresa não encontrada**, que deixaram de usar `bg-white`/cinzas fixos.

## Arquivos alterados

- [`src/pages/PayrollManagement.tsx`](../src/pages/PayrollManagement.tsx)

## Observações

- As _stat cards_ já utilizavam `text-foreground` / `text-muted-foreground` corretamente.
- O componente [`PayrollBatchUploadForm`](../src/features/payroll/components/PayrollBatchUploadForm.tsx)
  já segue o design system (apenas um ícone de PDF em `text-red-500`, mantido por ser semântico).
- Lint executado sem novos erros (permanece apenas um warning pré-existente de
  `react-hooks/exhaustive-deps`).
