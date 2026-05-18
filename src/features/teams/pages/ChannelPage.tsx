import { useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { Hash, Lock, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { teamService } from "../services/teamService";
import { useChannelBySlug, useChannelPosts } from "../hooks/useChannel";
import { useCurrentProfileId } from "../hooks/useCurrentProfileId";
import { PostList } from "../components/channel/PostList";
import { CreatePostDialog } from "../components/channel/CreatePostDialog";
import { ChannelSearchBox } from "../components/channel/ChannelSearchBox";

export default function ChannelPage() {
  const { teamSlug, channelSlug } = useParams<{ teamSlug: string; channelSlug: string }>();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: team } = useQuery({
    queryKey: ["teams", "by-slug", teamSlug],
    queryFn: () => teamService.getTeamBySlug(teamSlug!),
    enabled: !!teamSlug,
  });
  const { data: channel } = useChannelBySlug(team?.id, channelSlug);
  const { data: posts = [], isLoading } = useChannelPosts(channel?.id);
  const { data: profileId } = useCurrentProfileId();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            <NavLink to="/teams" className="hover:text-foreground">Equipes</NavLink>
            {" / "}
            <span>{team?.name ?? teamSlug}</span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            {channel?.visibility === "private" ? <Lock className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
            {channel?.name ?? channelSlug}
          </h1>
          {channel?.topic && <p className="text-sm text-muted-foreground mt-1">{channel.topic}</p>}
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!channel?.id || !profileId}>
          <Plus className="mr-2 h-4 w-4" />
          Nova postagem
        </Button>
      </div>

      <div className="mb-4">
        <ChannelSearchBox channelId={channel?.id} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando postagens…</div>
      ) : (
        <PostList posts={posts} teamSlug={teamSlug!} channelSlug={channelSlug!} />
      )}

      {channel?.id && profileId && (
        <CreatePostDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          channelId={channel.id}
          authorUserId={profileId}
        />
      )}
    </div>
  );
}
