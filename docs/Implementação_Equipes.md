Ready for review
Select text to add comments on the plan
Plano Técnico — Módulo "Equipes e Canais" (Slack/Teams-like)
Projeto: app-e7aicenter · Stack: React 18 + Vite + Supabase + N8N · Idioma: pt-BR

1. Contexto
O E7AI Center hoje concentra fluxos por área (assistentes, kanban, processos, payroll, leads). Falta um espaço colaborativo interno onde os usuários do escritório E7 & Vieira Aguiar discutam assuntos transversais. Este módulo introduz Equipes e Canais (modelo Microsoft Teams) com Postagens (tópicos) que abrigam respostas em chat de 1 nível, integrado ao Kanban existente para que postagens virem cards rastreáveis. O objetivo é centralizar comunicação operacional, reduzir uso de ferramentas externas (Slack/Teams) e amarrar discussões a ações no Kanban.

Decisões fechadas com o usuário:

Escopo: Equipes são globais à instância (usuários internos do escritório). Não usam company_id — companies continua sendo cadastro de clientes externos, sem relação com Equipes.
Privacidade: Privadas por padrão (Teams-like). Equipe só visível a membros; canais herdam, com sub-controle por canal.
Threading: Replies a 1 nível (Teams Posts). Postagem é root; mensagens são replies todas no mesmo nível.
Sync Kanban: Bidirecional com event log + guarda anti-loop via source_event_id.
2. Arquitetura de Alto Nível
┌────────────────────────────────────────────────────────────────────┐
│  React SPA (Vite)                                                  │
│                                                                    │
│  src/features/teams/                                               │
│   ├── pages/         TeamsHome, ChannelView, AdminTeamsPage        │
│   ├── components/    TeamsTreeSidebar, PostList, PostThread,       │
│   │                  MessageComposer, ReactionsPicker, PinsPanel   │
│   ├── hooks/         useTeams, useChannel, usePostThread (RT),     │
│   │                  useChannelPresence, useUnreadCounters         │
│   ├── services/      teamService, channelService, postService,     │
│   │                  messageService, reactionService, mentionService│
│   └── types.ts                                                     │
│                                                                    │
│  Reusos: AppSidebar (Collapsible), LegalKanbanRichTextEditor,      │
│          AuthContext.hasPermission, ProtectedRoute, sonner,        │
│          @tanstack/react-virtual, supabase realtime channels       │
└──────────────┬─────────────────────────────────────────────────────┘
               │
        ┌──────┴──────────────────────┐
        ▼                             ▼
┌──────────────────┐         ┌────────────────────────────────┐
│  Supabase        │         │  Edge Functions (Deno)         │
│  - Postgres      │◄────────┤  teams-admin-mutate            │
│  - RLS           │         │  teams-message-send (anti-spam)│
│  - Realtime      │────────►│  teams-kanban-bridge (sync)    │
│  - Storage       │         │  teams-search (full-text)      │
└──────────────────┘         └────────────────────────────────┘
Princípios:

Reuso máximo — TipTap, padrões de Realtime de useChatHistory, ensureAdminCaller de Edge Functions, legal_kanban_activities como modelo de event log, Collapsible da Sidebar.
RLS server-first — políticas no Postgres são a única fonte de verdade de autorização para leituras; mutações sensíveis (criação de equipe, gestão de membros) passam por Edge Function com double-check de role.
Realtime sob demanda — canal Realtime aberto apenas para o canal/postagem em foco, fechado on unmount. Rate limit já configurado em src/lib/supabase.ts (eventsPerSecond: 10).
Sem dependências novas — todo o módulo se constrói com libs já no package.json.
3. Modelagem de Banco (Supabase)
3.1 DER textual
users (existente)
  └─1:N─ team_members ──N:1── teams
                                ├─1:N─ channels ──1:N─ channel_members ──N:1── users
                                │                  └─1:N─ posts ──N:1── users (autor)
                                │                           ├─1:N─ post_attachments
                                │                           ├─1:N─ post_messages ──N:1── users (autor)
                                │                           │         ├─1:N─ message_reactions ──N:1── users
                                │                           │         └─1:N─ message_mentions ──N:1── users
                                │                           ├─1:N─ post_favorites ──N:1── users
                                │                           ├─1:N─ post_mentions ──N:1── users
                                │                           ├─1:N─ post_activities  (event log)
                                │                           └─1:1─ post_kanban_links ──N:1── legal_kanban_cards
                                │
                                └─1:N─ team_activities  (event log)

channel_read_state (user_id, channel_id, last_read_at) — unread counters
post_read_state (user_id, post_id, last_read_at)
3.2 Migration única — supabase/migrations/<timestamp>_create_teams_module.sql
Tabelas (resumo de colunas-chave):

Tabela	Colunas principais
teams	id uuid PK, name text, slug text unique, description text, icon text, visibility text check ('private','public') default 'private', is_archived bool default false, created_by_user_id uuid FK users, created_at, updated_at
team_members	id uuid PK, team_id uuid FK teams ON DELETE CASCADE, user_id uuid FK users, role text check ('owner','admin','member') default 'member', joined_at, invited_by_user_id, UNIQUE(team_id, user_id)
channels	id uuid PK, team_id uuid FK teams ON DELETE CASCADE, name text, slug text, topic text, visibility text check ('public','private') default 'public' (público = visível a todos os membros da equipe), is_general bool default false (canal "Geral" auto-criado), position int, created_by_user_id, created_at, updated_at, UNIQUE(team_id, slug)
channel_members	id, channel_id FK ON DELETE CASCADE, user_id FK, role text check ('admin','member'), is_muted bool, joined_at, UNIQUE(channel_id, user_id) — usado apenas para canais visibility='private'; canais públicos derivam membros de team_members
posts	id uuid PK, channel_id FK ON DELETE CASCADE, author_user_id FK, title text not null, description_json jsonb (TipTap doc), description_text text (indexável), is_pinned bool, is_announcement bool, last_activity_at timestamptz (atualizado por trigger ao receber message/reaction), created_at, updated_at, deleted_at
post_attachments	id, post_id FK ON DELETE CASCADE, uploaded_by_user_id, kind text ('file','image','link'), name, mime_type, size_bytes, storage_path (para file/image), url (para link), created_at
post_messages	id uuid PK, post_id FK ON DELETE CASCADE, author_user_id, content_json jsonb, content_text text, edited_at, deleted_at, created_at — sem parent_message_id (replies a 1 nível)
message_reactions	id, message_id FK ON DELETE CASCADE, user_id, emoji text (shortcode :thumbsup:), created_at, UNIQUE(message_id, user_id, emoji)
message_mentions	id, message_id FK ON DELETE CASCADE, mentioned_user_id, created_at
post_mentions	id, post_id FK ON DELETE CASCADE, mentioned_user_id
post_favorites	id, post_id FK ON DELETE CASCADE, user_id, created_at, UNIQUE(post_id, user_id)
channel_read_state	user_id, channel_id, last_read_at, PK(user_id, channel_id)
post_read_state	user_id, post_id, last_read_at, PK(user_id, post_id)
team_activities / post_activities	id, `team_id
post_kanban_links	id, post_id unique FK ON DELETE CASCADE, card_id uuid FK legal_kanban_cards ON DELETE SET NULL, board_id, column_id, link_direction text check ('bi','post_to_card','card_to_post') default 'bi', created_by_user_id, created_at
Triggers obrigatórios:

set_updated_at em teams, channels, posts (já existe a função update_updated_at_column() em 001_initial_setup.sql).
bump_post_last_activity (AFTER INSERT em post_messages / message_reactions) → atualiza posts.last_activity_at.
auto_join_general_channel (AFTER INSERT em team_members) → insere em channel_members do canal is_general da equipe.
prevent_owner_self_remove (BEFORE DELETE em team_members WHERE role='owner') → bloqueia se for o último owner.
Índices:

CREATE INDEX idx_team_members_user        ON team_members(user_id);
CREATE INDEX idx_channel_members_user     ON channel_members(user_id);
CREATE INDEX idx_channels_team_pos        ON channels(team_id, position);
CREATE INDEX idx_posts_channel_activity   ON posts(channel_id, last_activity_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_post_created    ON post_messages(post_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reactions_message        ON message_reactions(message_id);
CREATE INDEX idx_post_favorites_user      ON post_favorites(user_id, created_at DESC);
CREATE INDEX idx_post_mentions_user       ON post_mentions(mentioned_user_id);
-- Full-text search
ALTER TABLE posts          ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description_text,''))
  ) STORED;
CREATE INDEX idx_posts_search_tsv         ON posts USING GIN(search_tsv);

ALTER TABLE post_messages  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(content_text,''))) STORED;
CREATE INDEX idx_messages_search_tsv      ON post_messages USING GIN(search_tsv);
3.3 RLS — modelo
Estratégia espelha supabase/migrations/018_fix_rls_recursion.sql (verificações simples, sem recursão), e replica a abordagem das funções legal_kanban_has_board_access(...) já em uso (src/features/legal-kanban/services/legalKanbanService.ts).

Funções SECURITY DEFINER:

CREATE FUNCTION teams_is_member(p_team uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = p_team AND u.auth_user_id = auth.uid()
  );
$$;

CREATE FUNCTION teams_role(p_team uuid) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT tm.role FROM team_members tm
    JOIN users u ON u.id = tm.user_id
   WHERE tm.team_id = p_team AND u.auth_user_id = auth.uid();
$$;

CREATE FUNCTION channels_can_read(p_channel uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = p_channel
      AND teams_is_member(c.team_id)
      AND (
        c.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM channel_members cm
          JOIN users u ON u.id = cm.user_id
          WHERE cm.channel_id = c.id AND u.auth_user_id = auth.uid()
        )
      )
  );
$$;

CREATE FUNCTION is_global_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
      AND role IN ('administrator','it','advogado_adm')
      AND status = 'ativo'
  );
$$;
Políticas-exemplo:

-- teams: leitura para membros + admins globais
CREATE POLICY teams_select ON teams FOR SELECT
  USING (teams_is_member(id) OR is_global_admin());

-- teams: write apenas via Edge Function (service role bypasses RLS)
CREATE POLICY teams_no_client_write ON teams FOR ALL USING (false) WITH CHECK (false);

-- channels: leitura conforme visibilidade
CREATE POLICY channels_select ON channels FOR SELECT
  USING (channels_can_read(id) OR is_global_admin());

-- posts: leitura por quem lê o canal
CREATE POLICY posts_select ON posts FOR SELECT
  USING (channels_can_read(channel_id));

-- posts: inserir/editar apenas autor ou admin do canal
CREATE POLICY posts_insert ON posts FOR INSERT
  WITH CHECK (channels_can_read(channel_id));
CREATE POLICY posts_update ON posts FOR UPDATE
  USING (author_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
         OR is_global_admin());

-- post_messages: idem (membro do canal pode escrever)
CREATE POLICY messages_insert ON post_messages FOR INSERT
  WITH CHECK (channels_can_read((SELECT channel_id FROM posts WHERE id = post_id)));
4. Estrutura Frontend
4.1 Árvore de arquivos proposta
src/features/teams/
  types.ts
  constants.ts                  (buckets, defaults, limites)
  utils.ts                      (groupByDay, mentionParser, slugify)
  services/
    teamService.ts              (CRUD equipe — todas mutações via Edge Function)
    channelService.ts
    postService.ts
    messageService.ts           (send, edit, delete, react)
    attachmentService.ts        (upload reaproveitando padrão do Kanban)
    teamSearchService.ts        (full-text)
  hooks/
    useTeamsTree.ts             (lista equipes+canais visíveis ao usuário)
    useTeam.ts
    useChannel.ts               (lista de posts, paginação)
    usePostThread.ts            (mensagens + realtime + dedupe)
    useUnreadCounters.ts        (channel_read_state vs last_activity_at)
    useTeamPermissions.ts       (deriva pode-criar-canal, pode-fixar, etc.)
  components/
    sidebar/TeamsTreeSidebar.tsx       (substitui placeholder na AppSidebar)
    tree/TeamNode.tsx
    tree/ChannelNode.tsx
    channel/ChannelHeader.tsx
    channel/PostList.tsx                (virtualizado para muitos posts)
    channel/PostCard.tsx                (preview de postagem na lista)
    channel/PostComposer.tsx            (reusa LegalKanbanRichTextEditor)
    post/PostThreadView.tsx             (postagem + mensagens)
    post/PostHeader.tsx
    post/MessageList.tsx                (agrupa por dia, "Hoje" → topo, "Carregar anteriores")
    post/MessageItem.tsx                (avatar, nome, hora, reações, ações)
    post/MessageComposer.tsx            (input com @, anexos, emojis)
    post/ReactionsBar.tsx
    post/PinsPanel.tsx                  (postagens fixadas)
    post/FavoritesPanel.tsx             (mensagens/posts favoritados)
    post/KanbanLinkSection.tsx          ("Informações do Card")
    post/CreateCardFromPostDialog.tsx
    common/MentionPopover.tsx
    common/EmojiPicker.tsx              (cmdk já está nas deps)
    common/AttachmentUploader.tsx
  pages/
    TeamsHomePage.tsx                   (/teams)
    ChannelPage.tsx                     (/teams/:teamSlug/:channelSlug)
    PostPage.tsx                        (/teams/:teamSlug/:channelSlug/:postId)
    admin/TeamsAdminPage.tsx            (/admin/teams)
    admin/TeamDetailAdminPage.tsx       (/admin/teams/:teamId — membros, canais, permissões)
4.2 Rotas — adições em src/App.tsx
<Route path="/teams" element={<ProtectedRoute><TeamsHomePage /></ProtectedRoute>} />
<Route path="/teams/:teamSlug/:channelSlug" element={<ProtectedRoute><ChannelPage /></ProtectedRoute>} />
<Route path="/teams/:teamSlug/:channelSlug/:postId" element={<ProtectedRoute><PostPage /></ProtectedRoute>} />
<Route path="/admin/teams" element={<ProtectedRoute requiredPermission="admin"><TeamsAdminPage /></ProtectedRoute>} />
<Route path="/admin/teams/:teamId" element={<ProtectedRoute requiredPermission="admin"><TeamDetailAdminPage /></ProtectedRoute>} />
4.3 Sidebar (árvore Equipes)
Mudanças em src/components/layout/AppSidebar.tsx:

Trocar o nó "Equipes" hard-coded por <TeamsTreeSidebar /> que recebe lista dinâmica de useTeamsTree().
Manter o mesmo padrão Collapsible + NavLink (linhas 135-184). Cada equipe é um Collapsible; cada canal um NavLink para /teams/:teamSlug/:channelSlug.
Badge numérico de não-lidas ao lado de cada canal (vem de useUnreadCounters).
Carregamento: useTeamsTree faz uma única query (teams + channels join) com staleTime: 60s. Realtime escuta team_members/channel_members do usuário corrente para revalidar a árvore quando ele é adicionado/removido.
Permissões: árvore mostra apenas equipes/canais onde o usuário tem acesso (RLS filtra naturalmente). Admin global vê todas com badge "Admin".
4.4 Editor TipTap — reuso
Reutilizar diretamente LegalKanbanRichTextEditor (src/features/legal-kanban/components/editor/LegalKanbanRichTextEditor.tsx) para:

Descrição da postagem (PostComposer)
Mensagens longas no MessageComposer (modo expandido)
Adicionar uma única extensão custom de Mention em src/features/legal-kanban/components/editor/extensions.ts (@tiptap/extension-mention — única dep nova permitida, ou implementar parser leve sem dep). Mantém a configuração existente intacta para o Kanban.

onImageUpload aponta para attachmentService.uploadInlineImage que sobe no bucket teams-inline-images (mesmo padrão do Kanban — ver §6).

4.5 Render de mensagens — regras de UX
MessageList agrupa por dia (groupByDay em utils.ts).
Dia atual (Hoje) renderizado expandido e no topo da viewport ao abrir.
Botão "Carregar mensagens anteriores" no topo dispara fetchPreviousPage (React Query useInfiniteQuery com cursor created_at < oldest).
Cada item: avatar (Radix Avatar), nome, hora relativa (date-fns formatDistanceToNow), conteúdo renderizado read-only do TipTap doc, ReactionsBar, menu de ações (editar/excluir/favoritar/responder via menção).
Virtualização com @tanstack/react-virtual quando messages.length > 100 (mesmo gatilho do Kanban).
Auto-scroll para baixo apenas se usuário já estiver no fim (preserve scroll quando lendo histórico).
5. APIs e Edge Functions
Padrão geral: leituras vão direto via supabase-js (RLS filtra). Mutações sensíveis passam por Edge Functions que reutilizam ensureAdminCaller (supabase/functions/admin-create-user/index.ts:10-55) adaptado para ensureTeamRole(req, teamId, requiredRole).

5.1 Edge Functions a criar
Função	Métodos	Quem pode	Responsabilidade
teams-admin-mutate	POST {action, payload}	global admin (administrator/it/advogado_adm)	create/update/delete teams, gerenciar team_members, alterar role. Audit log obrigatório.
teams-channel-mutate	POST {action, payload}	team owner/admin ou global admin	criar/editar/arquivar canais; gerenciar channel_members para canais privados.
teams-message-send	POST {post_id, content_json, mentions, attachments}	membro do canal	valida tamanho, sanitiza HTML server-side (extra-safety), persiste mensagem + menções + notifica.
teams-kanban-bridge	POST {direction, post_id, card_id, event}	service-role-only (chamada interna)	aplica mutação no lado oposto com source_event_id setado para impedir loop (ver §9).
teams-search	POST {query, scope}	qualquer autenticado	full-text combinada em posts.search_tsv + post_messages.search_tsv com ranking (ts_rank) e filtro por canais acessíveis.
Esboço de assinatura — teams-admin-mutate:

// payload exemplos
{ action: "create_team", payload: { name, description, icon, initial_members: [userId,...] } }
{ action: "add_member",  payload: { team_id, user_id, role } }
{ action: "remove_member", payload: { team_id, user_id } }
{ action: "promote_member", payload: { team_id, user_id, role: "admin"|"owner"|"member" } }
{ action: "archive_team", payload: { team_id } }

// resposta: 200 { data }, 4xx { error: { code, message } }
Cada ação grava entrada em team_activities com actor_user_id, activity_type, metadata. Em paralelo grava em audit_logs (tabela global) com event_type='team:<action>'.

5.2 Reaproveitamento de padrões existentes
CORS / ensureAdminCaller — copiar template de supabase/functions/admin-create-user/index.ts.
withTimeout — usar em todas as chamadas Supabase de teamService/channelService (mesmo padrão de src/services/userService.ts).
react-query cache keys — namespace teams.*:
const teamsKeys = {
  all: ["teams"] as const,
  tree: () => [...teamsKeys.all, "tree"] as const,
  team: (id) => [...teamsKeys.all, "team", id] as const,
  channel: (id) => [...teamsKeys.all, "channel", id] as const,
  posts: (channelId, filters) => [...teamsKeys.all, "posts", channelId, filters] as const,
  messages: (postId) => [...teamsKeys.all, "messages", postId] as const,
  unread: (userId) => [...teamsKeys.all, "unread", userId] as const,
};
6. Storage e Upload
Buckets novos (criados na migration):

Bucket	Conteúdo	Política
teams-attachments	Arquivos anexados em postagens/mensagens	Signed URLs (5 min) — espelha getAttachmentUrl do Kanban
teams-inline-images	Imagens inline do TipTap (desc da postagem)	Public URL com cacheControl: 31536000 (igual ao Kanban)
teams-team-icons	Ícone/avatar da equipe	Public URL
Path convention: teams-attachments/<channel_id>/<post_id>/<timestamp>-<safeName> (mesma sanitização [^a-zA-Z0-9._-]→- usada em src/features/legal-kanban/services/legalKanbanService.ts:1310-1337).

Limites no client (constants.ts):

Imagens inline: 5 MB, tipos image/png|jpeg|webp|gif.
Anexos gerais: 25 MB, sem restrição de mime (lista negra de executáveis).
Validação espelhada server-side em teams-message-send (defense in depth).
7. Realtime e Estratégia de WebSocket
Reaproveita o setup existente em src/lib/supabase.ts (eventsPerSecond: 10) e o padrão de subscriptions de src/hooks/useChatHistory.ts:164-260.

Canais Realtime (por escopo):

Hook	Canal	Eventos	Cleanup
useTeamsTree	teams_tree:user:<userId>	INSERT/DELETE em team_members/channel_members filtrado pelo usuário corrente	unsubscribe no unmount
useChannel(channelId)	channel:<channelId>	INSERT/UPDATE/DELETE em posts (filter channel_id=eq.<id>)	unsubscribe no unmount/route change
usePostThread(postId)	post:<postId>	INSERT em post_messages, INSERT/DELETE em message_reactions, UPDATE em posts (campo is_pinned) — todos filtrados	unsubscribe no unmount
useChannelPresence(channelId) (opcional fase 2)	presence:channel:<channelId>	presence sync (quem está vendo, "X está digitando")	leave on unmount
Dedupe e ordem:

Replicar a estratégia de useChatHistory (linhas 34-98): manter Map<id, Message>, ignorar duplicatas, reordenar por created_at, esperar 100ms antes de refetch quando necessário para garantir consistência da BD.
Subscriptions usam postgres_changes (não polling).
Fallback:

Em perda de conexão, supabase-js reconecta automaticamente. Ao reconectar, useChannel/usePostThread disparam queryClient.invalidateQueries(messages-key) para reconciliar gaps.
8. Permissões — Matriz Detalhada
Camada 1 — RBAC global (existente em src/contexts/AuthContext.tsx):

Acesso ao módulo Teams: todo usuário status='ativo', sem permissão extra.
Acesso ao Admin de Equipes (/admin/teams): somente administrator, it, advogado_adm (via requiredPermission="admin").
Camada 2 — Role dentro da equipe (team_members.role):

Ação	owner	admin	member	global admin
Criar canal	✓	✓	—	✓
Editar canal	✓	✓	—	✓
Arquivar canal	✓	✓	—	✓
Convidar/remover membros da equipe	✓	✓	—	✓
Promover/rebaixar role	✓	—	—	✓
Excluir equipe	✓	—	—	✓
Postar e comentar	✓	✓	✓	✓
Fixar postagem (is_pinned)	✓	✓	—	✓
Editar/excluir mensagem própria	✓	✓	✓	✓
Editar/excluir mensagem alheia	✓	✓	—	✓
Camada 3 — Canal privado (channels.visibility='private'): membro precisa estar em channel_members adicional, gerenciado por owner/admin da equipe.

Hook useTeamPermissions(teamId) centraliza essas regras no frontend para esconder/desabilitar UI, mas a fonte de verdade continua sendo RLS + Edge Function (server-side check).

9. Integração com Kanban (sync bidirecional anti-loop)
9.1 Fluxo "Criar Card a partir da Postagem"
CreateCardFromPostDialog:

Usuário seleciona board (lista vem de legalKanbanService.listBoards() filtrada por acesso) e column/raia.
Frontend chama teams-kanban-bridge com { direction: 'post_to_card', action: 'create', post_id, board_id, column_id }.
Edge Function:
Gera event_id = uuid().
Insere em legal_kanban_cards (titulo = posts.title, description = posts.description_json) com metadata.source_event_id = event_id.
Insere em post_kanban_links (post_id, card_id, link_direction='bi').
Insere post_activities (activity_type='card_linked', metadata={ card_id, board_id, source_event_id }).
Insere legal_kanban_activities (activity_type='created_from_post', metadata={ post_id, source_event_id }).
9.2 Sincronização contínua
Acionada por Postgres triggers que postam em uma fila lógica (pg_notify) consumida por teams-kanban-bridge (Edge Function chamada via supabase functions invoke ou cron) OU, alternativa mais simples e recomendada: triggers que chamam a função teams_kanban_sync(...) diretamente em SQL e replicam o evento.

Eventos sincronizados:

Origem	Evento	Aplicado em destino
post_messages INSERT	nova reply	legal_kanban_comments (mesmo content, author)
legal_kanban_comments INSERT	novo comentário no card	post_messages na postagem vinculada
legal_kanban_cards UPDATE (status/column_id/title/due_date)	mudança no card	post_activities com activity_type='card_updated' (apenas atividade, não modifica o post)
posts UPDATE (title)	título mudado	legal_kanban_cards.title atualizado
9.3 Guarda anti-loop
Toda escrita feita pelo bridge carrega source_event_id no metadata da activity correspondente. O trigger de origem ignora mudanças cujo source_event_id corresponda a um evento gerado por ele mesmo nos últimos N segundos (lookup em tabela sync_event_ledger(event_id, created_at), TTL de 30s via DELETE em job pg_cron diário).

-- pseudo-trigger
IF (EXISTS (SELECT 1 FROM sync_event_ledger WHERE event_id = NEW.metadata->>'source_event_id')) THEN
  RETURN NEW;  -- evento espelho, não propaga
END IF;
INSERT INTO sync_event_ledger(event_id) VALUES (gen_random_uuid()) RETURNING event_id INTO v_event;
-- chama bridge com v_event
9.4 Seção "Informações do Card" na postagem
KanbanLinkSection (em PostThreadView) consulta post_kanban_links → carrega getCardDetails(cardId) de src/features/legal-kanban/services/legalKanbanService.ts e exibe:

Quadro / Coluna atual (link clicável → /documents/cases/quadros/<boardSlug>?card=<cardId>)
Status, prioridade, due_date, membros do card
Lista de comentários do card (read-only, com ícone indicando origem "Kanban")
Linha do tempo de atividades do card (legal_kanban_activities) — últimas 10
Botão "Desvincular" (chama bridge com action unlink)
10. Estratégia de Notificações
Camadas:

In-app (badge + toast) — fase 1:

Badge na sidebar (count por canal) via useUnreadCounters.
Toast sonner para @mention direto ao usuário corrente quando a página não está no canal em foco (document.visibilityState !== 'visible' ou rota diferente).
Centro de notificações em popover no header (lista paginada de notifications table — ver abaixo).
Tabela notifications (única, reusável fora de Teams futuramente):

CREATE TABLE notifications (
  id uuid PK,
  user_id uuid FK users,
  kind text,           -- 'mention', 'post_reply', 'card_linked', 'team_invite'
  payload jsonb,
  read_at timestamptz null,
  created_at timestamptz default now()
);
Populada por trigger AFTER INSERT em message_mentions e post_mentions. RLS: usuário vê apenas suas notificações.

E-mail / push — fora do escopo da fase 1 (anotado como evolução). Quando necessário, plugar webhook N8N consumindo notifications via Realtime.

11. Busca, Filtros e Indexação
Search global do módulo:

Edge Function teams-search recebe { query, scope: 'all'|'team:<id>'|'channel:<id>', filters: {author?, from?, to?, has_attachment?} }.
Executa duas queries paralelas (posts.search_tsv @@ ..., post_messages.search_tsv @@ ...) com ts_rank_cd para ordenar.
Filtra results pelos canais acessíveis (RLS do caller já cobre, mas Edge Function usa cliente do caller, não service role, para reaproveitar isolamento).
Filtros locais do canal:

PostList aceita filtros: autor (multi-select), período (date picker), com anexos (toggle), fixadas (toggle), favoritas (toggle).
Componentes shadcn Select, DatePicker, Toggle — todos já no projeto.
Favoritos:

FavoritesPanel (/teams/favorites ou tab no TeamsHomePage) lista post_favorites do usuário + posts cujas mensagens ele favoritou (extensão futura: message_favorites).
12. Cache, Escalabilidade e Observabilidade
12.1 Cache (React Query)
staleTime por tipo:
Árvore de equipes: 60s (refetch on focus).
Lista de posts de um canal: 30s.
Mensagens de uma postagem: Infinity (realtime atualiza; invalida só em reconnect).
Unread counters: 15s (e patch otimista após scroll-to-bottom marcar lido).
useInfiniteQuery para histórico de mensagens (cursor por created_at).
12.2 Escalabilidade
Pré-otimizações já cobertas por índices compostos (channel_id, last_activity_at DESC; post_id, created_at DESC).
Soft delete (deleted_at) em posts e post_messages para preservar threads.
posts.last_activity_at materializado por trigger evita ORDER BY MAX(message.created_at) em runtime.
Particionamento de post_messages por created_at (mensal) é opção futura caso volume passe de ~5M de linhas — não fazer na fase 1.
12.3 Auditoria
team_activities / post_activities — log de domínio (mostrado para usuários).
audit_logs (existente) — log de segurança/admin, populado pelas Edge Functions. Reusa AuthEventType enum em src/services/userSyncService.ts (adicionar TEAM_CREATED, TEAM_MEMBER_ADDED, etc.).
12.4 Logs e observabilidade
Edge Functions: logs estruturados via console.log(JSON.stringify({event, ...})) (padrão Supabase Functions, lido em Dashboard).
Frontend: erros de mutation já são canalizados a sonner + console; adicionar Sentry é evolução fora do escopo.
Realtime: contar events_received por canal em hook para debug.
13. Eventos Internos (catálogo)
Convenção <domain>.<entity>.<action> em activity_type/audit_logs.event_type:

Evento	Trigger	Consumidores
teams.team.created	Edge Fn	audit, notif
teams.team.member_added	Edge Fn	notif (team_invite)
teams.channel.created	Edge Fn	sidebar tree invalidate
teams.post.created	DB trigger	sidebar unread, notif (@mentions)
teams.message.sent	DB trigger	realtime fan-out, kanban bridge
teams.message.mention	DB trigger	notifications insert
teams.post.linked_to_card	Edge Fn	sidebar, audit
teams.kanban.sync	Edge Fn / pg trigger	event ledger
14. Fluxos Completos de Usuário
14.1 Onboarding em equipe
Admin global cria equipe em /admin/teams → Edge Fn teams-admin-mutate (create_team).
Adiciona membros → trigger auto-cria entrada em channel_members do canal Geral.
Membros recebem entrada em notifications (team_invite) → sidebar atualiza via realtime.
14.2 Postagem com discussão
Usuário acessa /teams/comercial/projetos, clica "Nova Postagem".
PostComposer (TipTap) → submit → postService.create → INSERT em posts.
Realtime do canal notifica demais membros → PostList atualiza no topo.
Outros membros abrem /teams/comercial/projetos/<postId> → PostThreadView carrega mensagens (vazio).
Cada reply via MessageComposer → messageService.send → INSERT em post_messages + menções → realtime fan-out → trigger atualiza posts.last_activity_at → sidebar badge incrementa.
14.3 Reação + favorito
Usuário clica emoji em ReactionsBar → reactionService.toggle (upsert/delete em message_reactions).
Realtime atualiza contadores no MessageItem para todos.
Usuário marca postagem favorita → post_favorites insert → aparece em /teams/favorites.
14.4 Criar Card a partir da Postagem
Em PostHeader → "Criar Card no Kanban" → CreateCardFromPostDialog (escolhe board+coluna).
Submit → teams-kanban-bridge (post_to_card) → cria card + post_kanban_links + activities.
KanbanLinkSection aparece com dados do card. Comentários do card sincronizam bidirecionalmente daqui em diante.
14.5 Busca
Usuário digita em campo global da ChannelHeader → debounce 300ms → teams-search.
Resultados agrupados (Postagens / Mensagens) com snippet (ts_headline).
Click → navega direto para PostPage com ?msg=<messageId> para destacar.
15. Arquivos Críticos (a serem criados / modificados)
Criar:

supabase/migrations/<ts>_create_teams_module.sql
supabase/functions/teams-admin-mutate/index.ts
supabase/functions/teams-channel-mutate/index.ts
supabase/functions/teams-message-send/index.ts
supabase/functions/teams-kanban-bridge/index.ts
supabase/functions/teams-search/index.ts
src/features/teams/** (toda a árvore listada em §4.1)
Modificar:

src/App.tsx — adicionar 5 rotas (§4.2).
src/components/layout/AppSidebar.tsx — substituir nó "Equipes" por <TeamsTreeSidebar />, adicionar item "Gestão de Equipes" em Administração (já protegido por requiredPermission="admin").
src/features/legal-kanban/components/editor/extensions.ts — adicionar Mention extension (compartilhada com Kanban quando útil).
src/services/userSyncService.ts — estender AuthEventType com eventos TEAM_*.
CLAUDE.md — adicionar seção "Teams module" sob "Feature modules".
Reutilizar sem alterar:

LegalKanbanRichTextEditor (src/features/legal-kanban/components/editor/LegalKanbanRichTextEditor.tsx)
ensureAdminCaller (supabase/functions/admin-create-user/index.ts:10-55)
legalKanbanService.uploadInlineImage / uploadAttachment patterns
useChatHistory dedupe/realtime patterns (src/hooks/useChatHistory.ts:34-260)
withTimeout wrapper
16. Verificação (end-to-end)
Migration aplica limpa: supabase db reset local ou supabase migration up em ambiente de staging → verificar todas as tabelas + RLS + buckets criados.
RLS isolation: com user member da equipe A, tentar SELECT em posts da equipe B → deve retornar vazio. Tentar via console com sessão de administrator → vê tudo.
Edge Functions: chamar teams-admin-mutate (create_team) com user não-admin → 403. Com admin → 200 e linha em teams + audit_logs.
Realtime: abrir duas janelas com usuários diferentes no mesmo canal; enviar mensagem em uma → outra recebe em <1s sem refresh.
TipTap reuse: abrir PostComposer, anexar imagem inline → confirma upload em bucket teams-inline-images e render imediato.
Kanban bridge:
Postagem cria card → card aparece em /documents/cases/quadros/<board>.
Comentar no card → reply aparece na postagem.
Replicar reply na postagem → comentário aparece no card.
Confirmar uma única vez cada (sem loop) inspecionando sync_event_ledger.
Sidebar árvore: adicionar usuário a nova equipe via admin → sidebar dele atualiza via realtime (sem F5).
Search: criar 3 posts com a palavra "compliance" em canais diferentes (1 não acessível) → teams-search retorna só os 2 acessíveis com snippets.
Lint/build: npm run lint && npm run build sem erros novos.
Smoke manual: percorrer §14.1–§14.5 com 2 perfis (administrator + advogado) no npm run dev.
17. Fora de Escopo (fase 1)
Documentado para evitar scope creep e revisitar depois:

Notificações por e-mail / push browser.
Threads aninhadas (>1 nível) em mensagens.
Voice/video.
Mensagens diretas (DM 1:1) — pode ser adicionado como team_id IS NULL + visibility='dm' em fase 2.
Bots/automação por canal (provavelmente N8N).
Edição colaborativa em tempo real do editor TipTap (Y.js).