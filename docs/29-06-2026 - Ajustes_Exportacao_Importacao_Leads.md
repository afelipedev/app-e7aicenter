# 29/06/2026 - Ajustes na Exportação/Importação de Leads

Página: `/leads` (`src/features/leads/`)

## 1. Correção de acentuação no CSV exportado

**Problema:** palavras acentuadas saíam com caracteres quebrados ao abrir o CSV no Excel.
Ex.: `Costa do Sol Táxi Aéreo` virava `Costa do Sol T√°xi A√©reo`.

**Causa:** o Excel/planilhas interpretavam o arquivo (gerado em UTF-8) com a codificação
local do sistema, pois o arquivo não declarava a codificação.

**Correção:** adicionado o BOM UTF-8 (`﻿`) no início do `Blob` em
[useLeadImportExport.ts](../src/features/leads/hooks/useLeadImportExport.ts) (`exportLeadsToCsvFile`),
fazendo o Excel reconhecer corretamente o UTF-8.

Para compatibilidade, a importação ([csv.ts](../src/features/leads/utils/csv.ts) → `parseCsv`)
passou a remover o BOM (`/^﻿/`) no início do conteúdo, evitando que o primeiro cabeçalho
viesse "sujo".

## 2. Botão Atualizar como icon button

O botão "Atualizar" virou um botão de ícone (`RefreshCw`, `size="icon"`) com tooltip
"Atualizar lista" e animação de spin enquanto carrega.

## 3. Renomeação dos botões

- "Importar Cadastro" → **Importar**
- "Exportar Cadastro" → **Exportar**

## 4. Botão e modal de Tutorial

Adicionado o botão **Tutorial** (ícone `HelpCircle`) antes do botão Importar.
Abre um `Dialog` (`ImportTutorialDialog` em
[LeadsTable.tsx](../src/features/leads/components/LeadsTable.tsx)) com:

- Dicas gerais (separador, UTF-8, campo obrigatório, tipo do lead);
- Tabela descrevendo cada coluna do CSV e o que preencher (incluindo aliases aceitos);
- Exemplo de cabeçalho pronto para copiar.

## Arquivos alterados

- `src/features/leads/hooks/useLeadImportExport.ts`
- `src/features/leads/utils/csv.ts`
- `src/features/leads/components/LeadsTable.tsx`
