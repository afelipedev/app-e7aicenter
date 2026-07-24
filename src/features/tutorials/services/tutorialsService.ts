import { supabase } from "@/lib/supabase";
import {
  CATALOG_PAGE_SIZE,
  DURATION_BUCKETS,
  SIGNED_URL_TTL_SECONDS,
  TUTORIALS_THUMBNAIL_BUCKET,
  TUTORIALS_VIDEO_BUCKET,
} from "../constants";
import type {
  AdminTutorialFilters,
  Tutorial,
  TutorialAuthor,
  TutorialCategory,
  TutorialFilters,
  TutorialInput,
  TutorialStatus,
} from "../types";
import { isRecentlyPublished, slugify } from "../utils/format";

const TUTORIAL_SELECT = `
  id, title, slug, short_description, full_description, category_id, module_key, tags,
  thumbnail_path, video_path, hls_path, transcode_status, mime_type, file_size,
  duration_seconds, status, published_at, is_featured, sort_order,
  views_count, unique_views_count, author_user_id, created_at, updated_at,
  category:tutorial_categories(id, name, slug, description, sort_order, is_active),
  author:users!tutorials_author_user_id_fkey(id, name, avatar_url)
`;

const DEFAULT_TIMEOUT = 30000;

const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs = DEFAULT_TIMEOUT): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("A operação demorou demais. Tente novamente.")), timeoutMs)
    ),
  ]);

const publicThumbnailUrl = (path: string | null): string | null => {
  if (!path) return null;
  return supabase.storage.from(TUTORIALS_THUMBNAIL_BUCKET).getPublicUrl(path).data.publicUrl;
};

/** Linha crua do PostgREST: as relações vêm como objeto ou array. */
type RawTutorialRow = Omit<Tutorial, "category" | "author" | "thumbnail_url" | "is_new"> & {
  category?: TutorialCategory | TutorialCategory[] | null;
  author?: TutorialAuthor | TutorialAuthor[] | null;
};

const mapTutorial = (row: RawTutorialRow): Tutorial => ({
  ...row,
  tags: row.tags ?? [],
  // Supabase devolve relação como objeto ou array conforme a cardinalidade.
  category: Array.isArray(row.category) ? row.category[0] ?? null : row.category ?? null,
  author: Array.isArray(row.author) ? row.author[0] ?? null : row.author ?? null,
  thumbnail_url: publicThumbnailUrl(row.thumbnail_path),
  is_new: isRecentlyPublished(row.published_at),
});

export interface TutorialPage {
  items: Tutorial[];
  nextPage: number | null;
  total: number;
}

export const tutorialsService = {
  async listCategories(): Promise<TutorialCategory[]> {
    const { data, error } = await withTimeout(
      supabase
        .from("tutorial_categories")
        .select("id, name, slug, description, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order")
    );
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Catálogo público: apenas publicados, paginado por range. */
  async listPublished(filters: TutorialFilters, page = 0): Promise<TutorialPage> {
    const from = page * CATALOG_PAGE_SIZE;
    const to = from + CATALOG_PAGE_SIZE - 1;

    let query = supabase
      .from("tutorials")
      .select(TUTORIAL_SELECT, { count: "exact" })
      .eq("status", "publicado");

    query = applyCommonFilters(query, filters);

    switch (filters.sort) {
      case "views":
        query = query.order("views_count", { ascending: false });
        break;
      case "alphabetical":
        query = query.order("title", { ascending: true });
        break;
      default:
        query = query
          .order("is_featured", { ascending: false })
          .order("published_at", { ascending: false, nullsFirst: false });
    }

    const { data, error, count } = await withTimeout(query.range(from, to));
    if (error) throw new Error(error.message);

    const items = (data ?? []).map(mapTutorial);
    const loaded = from + items.length;
    return {
      items,
      total: count ?? items.length,
      nextPage: count !== null && loaded < count ? page + 1 : null,
    };
  },

  /** Busca pontual por ids — usada pelo "continuar assistindo". */
  async listByIds(ids: string[]): Promise<Tutorial[]> {
    if (!ids.length) return [];
    const { data, error } = await withTimeout(
      supabase.from("tutorials").select(TUTORIAL_SELECT).in("id", ids).eq("status", "publicado")
    );
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTutorial);
  },

  /**
   * Índice leve (id + módulo) de tudo que está publicado. Alimenta a trilha de
   * módulos sem depender das páginas já carregadas no infinite scroll.
   */
  async listModuleIndex(): Promise<{ id: string; module_key: string | null }[]> {
    const { data, error } = await withTimeout(
      supabase.from("tutorials").select("id, module_key").eq("status", "publicado")
    );
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getBySlug(slug: string): Promise<Tutorial | null> {
    const { data, error } = await withTimeout(
      supabase.from("tutorials").select(TUTORIAL_SELECT).eq("slug", slug).maybeSingle()
    );
    if (error) throw new Error(error.message);
    return data ? mapTutorial(data) : null;
  },

  /** Vídeos da mesma trilha (módulo), usados em relacionados e navegação. */
  async listSiblings(moduleKey: string | null, categoryId: string | null): Promise<Tutorial[]> {
    let query = supabase
      .from("tutorials")
      .select(TUTORIAL_SELECT)
      .eq("status", "publicado")
      .order("sort_order")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(20);

    if (moduleKey) query = query.eq("module_key", moduleKey);
    else if (categoryId) query = query.eq("category_id", categoryId);

    const { data, error } = await withTimeout(query);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTutorial);
  },

  /** URL assinada do vídeo. O bucket é privado, então nada é servido direto. */
  async getVideoUrl(tutorial: Pick<Tutorial, "hls_path" | "video_path">): Promise<string | null> {
    const path = tutorial.hls_path || tutorial.video_path;
    if (!path) return null;

    const { data, error } = await withTimeout(
      supabase.storage.from(TUTORIALS_VIDEO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    );
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
  },

  // ---------------------------------------------------------------------------
  // Administração
  // ---------------------------------------------------------------------------

  async listForAdmin(filters: AdminTutorialFilters): Promise<TutorialPage> {
    const from = filters.page * filters.pageSize;
    const to = from + filters.pageSize - 1;

    let query = supabase.from("tutorials").select(TUTORIAL_SELECT, { count: "exact" });
    query = applyCommonFilters(query, filters);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.authorId) query = query.eq("author_user_id", filters.authorId);

    query = query.order(filters.sortBy ?? "created_at", {
      ascending: filters.sortDir === "asc",
      nullsFirst: false,
    });

    const { data, error, count } = await withTimeout(query.range(from, to));
    if (error) throw new Error(error.message);

    const items = (data ?? []).map(mapTutorial);
    const loaded = from + items.length;
    return {
      items,
      total: count ?? items.length,
      nextPage: count !== null && loaded < count ? filters.page + 1 : null,
    };
  },

  async create(input: TutorialInput): Promise<Tutorial> {
    const actorId = await getCurrentUserId();
    const slug = await buildUniqueSlug(input.title);

    const { data, error } = await withTimeout(
      supabase
        .from("tutorials")
        .insert({
          ...input,
          slug,
          author_user_id: actorId,
          created_by: actorId,
          updated_by: actorId,
        })
        .select(TUTORIAL_SELECT)
        .single()
    );
    if (error) throw new Error(error.message);
    return mapTutorial(data);
  },

  async update(id: string, input: Partial<TutorialInput>): Promise<Tutorial> {
    const actorId = await getCurrentUserId();
    const { data, error } = await withTimeout(
      supabase
        .from("tutorials")
        .update({ ...input, updated_by: actorId })
        .eq("id", id)
        .select(TUTORIAL_SELECT)
        .single()
    );
    if (error) throw new Error(error.message);
    return mapTutorial(data);
  },

  async setStatus(id: string, status: TutorialStatus): Promise<void> {
    const actorId = await getCurrentUserId();
    const { error } = await withTimeout(
      supabase.from("tutorials").update({ status, updated_by: actorId }).eq("id", id)
    );
    if (error) throw new Error(error.message);
  },

  /**
   * Duplica os metadados como rascunho. Os arquivos são reaproveitados: a cópia
   * aponta para os mesmos objetos do Storage, então excluir a cópia não pode
   * remover os arquivos do original (ver `remove`).
   */
  async duplicate(id: string): Promise<Tutorial> {
    const actorId = await getCurrentUserId();
    const { data: original, error: readError } = await withTimeout(
      supabase.from("tutorials").select("*").eq("id", id).single()
    );
    if (readError) throw new Error(readError.message);

    const slug = await buildUniqueSlug(`${original.title} copia`);
    // Campos gerados pelo banco não podem ser reinseridos.
    const { id: _id, created_at, updated_at, search_tsv, ...rest } = original as Record<string, unknown> & {
      title: string;
    };

    const { data, error } = await withTimeout(
      supabase
        .from("tutorials")
        .insert({
          ...rest,
          title: `${original.title} (cópia)`,
          slug,
          status: "rascunho",
          published_at: null,
          views_count: 0,
          unique_views_count: 0,
          created_by: actorId,
          updated_by: actorId,
        })
        .select(TUTORIAL_SELECT)
        .single()
    );
    if (error) throw new Error(error.message);
    return mapTutorial(data);
  },

  async remove(tutorial: Tutorial): Promise<void> {
    // Só apaga arquivos que não estejam sendo usados por outra linha (cópias).
    const [videoInUse, thumbInUse] = await Promise.all([
      countUsages("video_path", tutorial.video_path, tutorial.id),
      countUsages("thumbnail_path", tutorial.thumbnail_path, tutorial.id),
    ]);

    if (tutorial.video_path && videoInUse === 0) {
      await supabase.storage.from(TUTORIALS_VIDEO_BUCKET).remove([tutorial.video_path]);
    }
    if (tutorial.thumbnail_path && thumbInUse === 0) {
      await supabase.storage.from(TUTORIALS_THUMBNAIL_BUCKET).remove([tutorial.thumbnail_path]);
    }

    const { error } = await withTimeout(supabase.from("tutorials").delete().eq("id", tutorial.id));
    if (error) throw new Error(error.message);
  },

  /** Remove um objeto órfão do Storage (upload sem registro salvo). */
  async removeOrphanFile(bucket: string, path: string): Promise<void> {
    await supabase.storage.from(bucket).remove([path]);
  },

  async listAuthors(): Promise<{ id: string; name: string | null }[]> {
    const { data, error } = await withTimeout(
      supabase.from("tutorials").select("author:users!tutorials_author_user_id_fkey(id, name)")
    );
    if (error) throw new Error(error.message);

    const unique = new Map<string, { id: string; name: string | null }>();
    for (const row of (data ?? []) as { author?: TutorialAuthor | TutorialAuthor[] | null }[]) {
      const author = Array.isArray(row.author) ? row.author[0] : row.author;
      if (author?.id) unique.set(author.id, { id: author.id, name: author.name });
    }
    return [...unique.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// O builder do PostgREST muda de tipo a cada encadeamento; manter genérico aqui
// é mais simples que reconstruir a assinatura completa.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCommonFilters(query: any, filters: TutorialFilters | AdminTutorialFilters) {
  if (filters.search?.trim()) {
    // Busca PT-BR sobre título, descrições, módulo e tags (coluna gerada search_tsv).
    query = query.textSearch("search_tsv", filters.search.trim(), {
      type: "websearch",
      config: "portuguese",
    });
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.moduleKey) query = query.eq("module_key", filters.moduleKey);

  const duration = (filters as TutorialFilters).duration;
  if (duration) {
    const bucket = DURATION_BUCKETS.find((b) => b.value === duration);
    if (bucket) {
      query = query.gte("duration_seconds", bucket.min);
      if (bucket.max !== null) query = query.lt("duration_seconds", bucket.max);
    }
  }
  return query;
}

async function countUsages(column: "video_path" | "thumbnail_path", path: string | null, excludeId: string) {
  if (!path) return 0;
  const { count } = await supabase
    .from("tutorials")
    .select("id", { count: "exact", head: true })
    .eq(column, path)
    .neq("id", excludeId);
  return count ?? 0;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  return data?.id ?? null;
}

async function buildUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "tutorial";
  const { data } = await supabase.from("tutorials").select("slug").like("slug", `${base}%`);
  const taken = new Set(((data ?? []) as { slug: string }[]).map((row) => row.slug));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
