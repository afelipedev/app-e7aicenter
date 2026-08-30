# Exclusão de Canais na Gestão de Equipes

**Data:** 25/05/2026

## Objetivo

Permitir que perfis administrativos excluam canais cadastrados na página de configuração da equipe (`/admin/teams/:teamId`).

## O que foi implementado

- Botão de ícone (lixeira) em cada canal listado na seção **Canais** de `TeamDetailAdminPage`.
- Modal de confirmação (`AlertDialog`) antes da exclusão, informando que postagens e anexos serão removidos.
- Integração com `channelService.deleteChannel`, que chama a Edge Function `teams-channel-mutate` com a action `delete_channel`.
- Invalidação das queries de canais da equipe e da árvore de equipes após exclusão bem-sucedida.

## Permissões

O botão de exclusão é exibido apenas para os perfis:

- `administrator`
- `it`
- `advogado_adm`

A rota `/admin/teams/*` já exige permissão `admin`; a checagem no componente reforça a regra na UI.

## Restrições

- O **canal padrão (Geral)** não exibe botão de exclusão — a Edge Function também bloqueia essa operação no backend.

## Arquivos alterados

- `src/features/teams/pages/admin/TeamDetailAdminPage.tsx`
