# 24/07/2026 — Módulo de Tutoriais

Videoteca interna do AI Center E7: catálogo de vídeos para todo usuário autenticado e área de
gestão completa para administradores. O objetivo é que o onboarding de cada módulo aconteça dentro
da própria plataforma, sem depender de alguém que já saiba usar.

---

## 1. Acesso

| Rota | Quem acessa | Página |
|------|-------------|--------|
| `/tutoriais` | Todos os autenticados | `features/tutorials/pages/TutorialsPage.tsx` |
| `/tutoriais/:slug` | Todos os autenticados | `features/tutorials/pages/TutorialWatchPage.tsx` |
| `/admin/tutoriais` | Permissão `admin` | `features/tutorials/pages/admin/TutorialsAdminPage.tsx` |

Menu na `AppSidebar`, logo abaixo de **Equipes**: grupo **Tutoriais** com os itens *Tutoriais* e
*Upload* (este só aparece para administradores — `filterMenuItems` remove o item pela permissão).
Nenhuma permissão nova foi criada: a gestão reutiliza `admin`
(`administrator`, `it`, `advogado_adm`).

As três páginas entram por `React.lazy` em `App.tsx`, o que mantém o Video.js fora do bundle
inicial (ele fica no chunk da página de reprodução, ~214 KB gzip, carregado só ao assistir).

---

## 2. Banco de dados

Migração: `supabase/migrations/20260724120000_create_tutorials_module.sql` (aplicada no projeto
remoto via Supabase MCP em três passos: schema, buckets e ajustes de segurança).

| Tabela | Papel |
|--------|-------|
| `tutorial_categories` | Categorias editoriais. Seed: Primeiros passos, Funcionalidades, Boas práticas, Novidades |
| `tutorials` | Metadados do vídeo, status, contadores e caminhos no Storage |
| `tutorial_progress` | Ponto de parada por usuário (PK `user_id + tutorial_id`) |
| `tutorial_views` | Uma linha por usuário/vídeo — base das visualizações únicas |
| `tutorial_favorites` | Favoritos por usuário |

**Busca PT-BR:** `tutorials.search_tsv` é coluna gerada sobre título, descrições, módulo e tags,
com índice GIN. Como `array_to_string` é apenas `STABLE`, o documento é montado pela função
`tutorials_search_document(...)`, marcada `IMMUTABLE` — requisito da coluna gerada. O cliente
consulta com `.textSearch('search_tsv', termo, { type: 'websearch', config: 'portuguese' })`.

**Módulos do sistema:** sem tabela. A lista canônica é `SYSTEM_MODULES` em
`features/tutorials/constants.ts`, espelhando o menu lateral. `tutorials.module_key` guarda a chave.

### RPCs

- `register_tutorial_view(p_tutorial_id)` — soma sempre em `views_count` e só na primeira vez do
  usuário em `unique_views_count`.
- `upsert_tutorial_progress(p_tutorial_id, p_position, p_duration)` — grava o ponto de parada e
  marca `completed` a partir de 90%; concluído nunca volta atrás ao reassistir.

Ambas são `SECURITY DEFINER` (o cliente não escreve direto em `tutorial_views` nem nos contadores) e
tiveram o `EXECUTE` revogado do papel `anon`.

### RLS

- `tutorials`: `SELECT` para autenticados apenas onde `status = 'publicado'`; INSERT/UPDATE/DELETE
  somente por `tutorials_is_admin()` (que delega para `is_active_administrator()`, já existente).
- `tutorial_categories`: leitura para todos; escrita só admin.
- `tutorial_progress` e `tutorial_favorites`: cada usuário enxerga e altera apenas as próprias linhas.
- `tutorial_views`: leitura da própria linha ou admin; escrita só via RPC.

### Storage

| Bucket | Visibilidade | Limite | Conteúdo |
|--------|--------------|--------|----------|
| `tutorials` | **privado** | 2 GB | MP4, MOV, WEBM (e HLS no futuro) |
| `tutorial-thumbnails` | público | 5 MB | PNG, JPG, WEBP, AVIF |

Caminhos usam UUID: `<module_key>/<uuid>.<ext>`. O vídeo é privado e servido por URL assinada de 2h
gerada na hora do play; a thumbnail é pública para aproveitar cache de CDN. Upload, alteração e
remoção de objetos nos dois buckets exigem administrador.

---

## 3. Frontend

```
src/features/tutorials/
  constants.ts · types.ts
  services/    tutorialsService · tutorialUploadService · tutorialProgressService
  hooks/       useTutorials · useTutorial · useTutorialFavorites · useTutorialAdmin · useResumableUpload
  components/  TutorialCard · TutorialFilters · TutorialSearch · ModuleTrail · ContinueWatching
               RelatedVideos · TutorialPlayer · TutorialCardSkeleton · TutorialEmptyState
    admin/     TutorialTable · TutorialForm · VideoUploader · ThumbnailUploader · UploadProgress
  pages/       TutorialsPage · TutorialWatchPage · admin/TutorialsAdminPage
  utils/       format · media · moduleStats
  styles/      videojs-theme.css
```

### Catálogo

Cabeçalho com busca (debounce de 300 ms) → **trilha de módulos** → filtros (categoria, módulo,
duração, ordenação, favoritos) → *Continuar assistindo* → grid responsivo (2/3/4 colunas).

A **trilha de módulos** é o elemento característico da página: cada chip é ao mesmo tempo filtro e
indicador de progresso, com um anel mostrando quantos vídeos daquele módulo o usuário concluiu.
Só aparecem módulos que já têm vídeo publicado.

Performance: `useInfiniteQuery` com páginas de 24 itens, `IntersectionObserver` com `rootMargin`
de 400px (a próxima página começa a carregar antes de o usuário chegar ao fim), thumbnails com
`loading="lazy"`/`decoding="async"`, skeletons durante o carregamento e estados de vazio e erro com
ação. Progresso e favoritos vêm de duas queries próprias e são combinados em memória — sem N+1 por card.

### Reprodução

Breadcrumb → player → metadados (categoria, módulo, autor, data, duração, visualizações) →
tags → navegação Anterior/Próximo dentro do mesmo módulo. À direita, vídeos relacionados. Ações de
**Copiar URL**, **Compartilhar** (usa `navigator.share` quando existe) e **Salvar** nos favoritos.

O player (`TutorialPlayer`) encapsula o Video.js: nenhuma página fala com a API dele. Traz HLS
quando `hls_path` existir e MP4 caso contrário, `fluid`/`responsive`, velocidades 0.5×–2×,
picture-in-picture, tela cheia, atalhos de teclado, `preload="metadata"`, poster e qualidade
automática limitada ao tamanho real do player (`limitRenditionByPlayerDimensions`). A skin em
`videojs-theme.css` usa os tokens do design system e respeita `prefers-reduced-motion`.

Retomada: ao carregar, o player volta ao ponto salvo (se estiver abaixo de 95% da duração) e exibe
um toast com a saída "Começar do início". O progresso é gravado a cada 10s, no pause, no fim e ao
sair da tela. A visualização é registrada uma única vez, aos 10 segundos assistidos.

### Administração

Data Table (`@tanstack/react-table`) com Thumbnail, Título, Categoria, Módulo, Status, Publicado,
Visualizações e Data de upload. Ordenação por coluna, paginação e filtros (categoria, módulo,
status, autor) resolvidos no servidor. Ações por linha: visualizar, editar, duplicar,
publicar/despublicar e excluir — esta última com confirmação.

O formulário (Sheet lateral, react-hook-form + Zod) cobre título, descrições, categoria, módulo,
tags, thumbnail, vídeo, tempo, publicado, destaque e ordem. O slug é gerado do título com
verificação de unicidade. Publicar sem vídeo é bloqueado no envio.

**Upload do vídeo:** endpoint resumível (TUS) do Supabase Storage via `tus-js-client`, em blocos de
6 MB — `storage.upload()` não expõe progresso nem permite pausar. A barra mostra porcentagem, MB
enviados/total, velocidade (média móvel de 3s), tempo restante e botões de pausar, retomar e
cancelar; o fingerprint fica salvo, então um upload interrompido pode ser retomado depois.

**Automações do cadastro:** a duração é lida do arquivo (`loadedmetadata`) e preenche o campo Tempo;
um frame do vídeo é capturado e oferecido como capa ("Capturar do vídeo"); thumbnails enviadas são
reduzidas para 1280px em WEBP antes do upload.

Os metadados só vão para o Postgres depois que o arquivo confirma no Storage. Na exclusão, os
objetos só são removidos se nenhuma outra linha (uma cópia, por exemplo) ainda os referenciar.

---

## 4. Dependências adicionadas

`video.js` (player + HLS/VHS), `tus-js-client` (upload resumível), `@tanstack/react-table`
(Data Table). Instaladas com `--legacy-peer-deps`, como o restante do projeto exige.

---

## 5. Streaming e transcodificação

Não há conversão de vídeo nesta entrega — o arquivo original é enviado como está. O contrato para
um pipeline futuro já existe no schema: `hls_path`, `video_variants` (jsonb) e `transcode_status`
(`none` | `pending` | `ready` | `failed`). Quando um serviço externo gerar o HLS e preencher esses
campos, o player passa a servir `.m3u8` automaticamente, sem nova migração nem mudança de código
nas páginas.

Downloads são desencorajados com `controlsList="nodownload"` e bloqueio do menu de contexto. Isso
não é DRM: quem tiver a URL assinada consegue baixar o arquivo dentro das 2 horas de validade.

---

## 6. Verificação executada

- `npm run build` e `npx eslint src/features/tutorials src/App.tsx` sem erros.
- Migrações aplicadas; as 5 tabelas estão com RLS habilitada.
- Trigger de publicação carimba `published_at` na primeira publicação.
- Busca PT-BR encontra por radical da descrição ("cartões") e por tag ("kanban"), e não retorna
  falso positivo ("holerite").
- `register_tutorial_view` chamada duas vezes pelo mesmo usuário: 2 visualizações totais, 1 única.
- `upsert_tutorial_progress` em 400/420s marcou `completed`.
- Usuário sem permissão de admin enxerga apenas os publicados (rascunho não vaza) e tem o INSERT
  recusado pela RLS.
- Advisor de segurança do Supabase sem alertas novos para o módulo. Os dados de teste foram removidos.

### Pendente de verificação manual
Envio de um arquivo grande de verdade (>100 MB) com pausa, retomada e cancelamento, e a reprodução
ponta a ponta no navegador — dependem de um vídeo real e de sessão autenticada na interface.

---

## 7. Achado não relacionado

`public.sync_event_ledger` está com **RLS desabilitada** e exposta à chave anon. Não faz parte deste
módulo e não foi alterada, mas vale tratar em separado.
