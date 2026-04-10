# 27/02/2025 - Exportação completa de tomadores de decisão

## Problema

Na exportação CSV da lista de leads, a coluna de tomadores de decisão (`decision_makers`) exibia apenas um tomador quando havia mais de um cadastrado.

## Causa

Os tomadores de decisão são armazenados no banco como texto separado por quebras de linha (`\n`). Na exportação CSV, essas quebras de linha permaneciam dentro da célula, gerando múltiplas linhas físicas no arquivo. Ao abrir no Excel, cada linha era interpretada como uma nova linha da planilha, fazendo com que apenas o primeiro tomador aparecesse na coluna correta.

## Solução

1. **Exportação** (`useLeadImportExport.ts`): Os tomadores de decisão passam a ser unidos com o separador ` | ` (igual aos telefones e e-mails), evitando quebras de linha no CSV e garantindo que todos apareçam na mesma célula.

2. **Carregamento no formulário** (`LeadForm.tsx`): O split ao carregar dados passou a aceitar tanto quebras de linha quanto o separador ` | `, mantendo compatibilidade com dados antigos e com arquivos reimportados.
