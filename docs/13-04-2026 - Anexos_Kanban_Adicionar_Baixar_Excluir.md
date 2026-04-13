# 13/04/2026 — Anexos Kanban: adicionar arquivo, baixar e excluir

## Objetivo

Completar o fluxo de anexos no painel de detalhes do card (`LegalKanbanCardDetailsSheet`): botão **Adicionar** abre o seletor de arquivos; cada anexo exibe ícone por tipo, ações de **download** e **exclusão** com confirmação.

## O que foi implementado

1. **Botão Adicionar (seção Anexos)**  
   - `input type="file"` oculto (`sr-only`) acionado ao clicar em **Adicionar**.  
   - Estado de envio: rótulo "Enviando…" e botão desabilitado durante o upload.

2. **Lista de anexos**  
   - Ícones por tipo: **link** (`Link2`), **imagem** (`Image`), **PDF** e **Word** (`FileText` com cores distintas), **demais arquivos** (`File`).  
   - Detecção por `mimeType` e extensão do nome.  
   - Linha principal continua abrindo o anexo em nova aba (URL assinada ou link).  
   - Botões à direita: **Download** (arquivo: blob + nome; link: abre em nova aba) e **Excluir** (abre modal).

3. **Modal de confirmação de exclusão**  
   - `AlertDialog` com nome do anexo; para arquivos, texto informa remoção do armazenamento.

4. **Backend (serviço)**  
   - `legalKanbanService.deleteAttachment(attachmentId)`: remove objeto no bucket `LEGAL_KANBAN_STORAGE_BUCKET` quando for arquivo, depois remove a linha em `legal_kanban_attachments` e registra atividade.

5. **React Query**  
   - Hook `useDeleteLegalKanbanAttachment(cardId)` invalidando board e detalhes do card.

## Arquivos alterados

- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`
- `src/features/legal-kanban/services/legalKanbanService.ts`
- `src/features/legal-kanban/hooks/useLegalKanbanBoard.ts`

## Observação

Links ainda podem ser adicionados pelo menu **Adicionar** → **Anexo** (painel inline com nome + URL). O painel mantém o campo de upload de arquivo para o mesmo fluxo.
