export type TeamVisibility = "private" | "public";
export type ChannelVisibility = "public" | "private";
export type TeamMemberRole = "owner" | "admin" | "member";
export type ChannelMemberRole = "admin" | "member";

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  visibility: TeamVisibility;
  is_archived: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  invited_by_user_id: string | null;
  joined_at: string;
}

export interface TeamMemberWithUser extends TeamMember {
  user?: { id: string; name: string; email: string };
}

export interface Channel {
  id: string;
  team_id: string;
  name: string;
  slug: string;
  topic: string | null;
  visibility: ChannelVisibility;
  is_general: boolean;
  is_archived: boolean;
  position: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamsTreeNode extends Team {
  channels: Channel[];
  member_role: TeamMemberRole | null;
}

export interface Post {
  id: string;
  channel_id: string;
  author_user_id: string;
  title: string;
  description_json: Record<string, unknown>;
  description_text: string;
  is_pinned: boolean;
  is_announcement: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PostWithAuthor extends Post {
  author?: { id: string; name: string; email: string };
  reply_count?: number;
  is_favorited?: boolean;
}

export interface PostMessage {
  id: string;
  post_id: string;
  author_user_id: string;
  content_json: Record<string, unknown>;
  content_text: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface PostMessageWithAuthor extends PostMessage {
  author?: { id: string; name: string; email: string };
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface PostKanbanLink {
  id: string;
  post_id: string;
  card_id: string | null;
  board_id: string | null;
  column_id: string | null;
  link_direction: "bi" | "post_to_card" | "card_to_post";
  created_by_user_id: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
