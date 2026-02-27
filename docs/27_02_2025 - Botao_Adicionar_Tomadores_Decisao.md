# 27/02/2025 - Botão Adicionar Tomadores de Decisão

## O que foi implementado

- **Componente `DecisionMakersFieldArray`**: Novo componente em `src/features/leads/components/DecisionMakersFieldArray.tsx` que permite adicionar múltiplos tomadores de decisão com botão "Adicionar" ao lado do título da seção, seguindo o mesmo padrão visual e de UX dos campos de Telefones e E-mails.

- **Integração no LeadForm**: O campo "Tomadores de decisão" foi convertido de um único `Textarea` para um array de inputs com:
  - Botão "Adicionar" ao lado do título
  - Botão de remover em cada linha
  - Placeholder "Ex.: João Silva (Diretor)" em cada input

- **Persistência**: Os dados continuam sendo armazenados como texto no banco (coluna `decision_makers`). Na carga, o texto é dividido por quebras de linha; no envio, os itens são unidos com `\n` para manter compatibilidade com dados existentes.
