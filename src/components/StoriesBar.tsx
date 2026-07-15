import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { StoryViewer } from "@/components/story/StoryViewer";
import { motion } from "framer-motion";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  music_name?: string | null;
  music_artist?: string | null;
  custom_music_url?: string | null;
  profile: {
    username: string;
    first_name: string;
    avatar_url: string | null;
  };
}

interface StoriesBarProps {
  onCreateStory: () => void;
}

export default function StoriesBar({ onCreateStory }: StoriesBarProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(0);
  const [selectedUserStories, setSelectedUserStories] = useState<Story[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCurrentUser();
    loadStories();
    loadViewedStories();

    const channel = supabase
      .channel("stories-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => loadStories())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadViewedStories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("story_views").select("story_id").eq("viewer_id", user.id);
    if (data) setViewedStories(new Set(data.map(v => v.story_id)));
  };

  const loadStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select(`*, profile:profiles!stories_user_id_fkey (username, first_name, avatar_url)`)
      .order("created_at", { ascending: false });

    if (!error && data) setStories(data);
  };

  const handleViewStory = (userStories: Story[], index: number) => {
    setSelectedUserStories(userStories);
    setSelectedStoryIndex(index);
    setViewerOpen(true);
  };

  const handleDeleteStory = () => {
    setViewerOpen(false);
    loadStories();
  };

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) acc[story.user_id] = [];
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const hasOwnStory = currentUserId && groupedStories[currentUserId]?.length > 0;
  const isUserStoriesViewed = (userStories: Story[]) => userStories.every(story => viewedStories.has(story.id));

  return (
    <>
      {/* Facebook Lite Stories Bar — plain circle avatars, no gradient rings */}
      <div className="border-b border-border/30">
        <div className="flex gap-3 overflow-x-auto py-3 px-3 scrollbar-hide">
          {/* Your Story Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            type="button"
            onClick={hasOwnStory ? () => handleViewStory(groupedStories[currentUserId], 0) : onCreateStory}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[68px]"
          >
            <div className="relative">
              {hasOwnStory ? (
                <Avatar className={`h-[64px] w-[64px] border-[1.5px] ${
                  isUserStoriesViewed(groupedStories[currentUserId])
                    ? 'border-border'
                    : 'border-primary'
                }`}>
                  <AvatarImage src={groupedStories[currentUserId][0].profile.avatar_url || ''} className="object-cover" />
                  <AvatarFallback className="bg-muted text-lg font-bold">
                    {groupedStories[currentUserId][0].profile.first_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-[64px] w-[64px] border border-border/50">
                  <AvatarFallback className="bg-muted">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 h-[22px] w-[22px] rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background">
                <Plus className="h-3 w-3" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">
              Seu story
            </span>
          </motion.button>

          {/* Other Users Stories */}
          {Object.entries(groupedStories)
            .filter(([userId]) => userId !== currentUserId)
            .map(([userId, userStories], idx) => {
              const firstStory = userStories[0];
              const allViewed = isUserStoriesViewed(userStories);
              
              return (
                <motion.button
                  key={userId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (idx + 1) * 0.04 }}
                  type="button"
                  onClick={() => handleViewStory(userStories, 0)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[68px]"
                >
                  <Avatar className={`h-[64px] w-[64px] border-[1.5px] ${
                    allViewed ? 'border-border' : 'border-primary'
                  }`}>
                    <AvatarImage src={firstStory.profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-muted text-lg font-bold">
                      {firstStory.profile.first_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-foreground/80 text-center leading-tight truncate w-full">
                    {firstStory.profile.first_name}
                  </span>
                </motion.button>
              );
            })}
        </div>
      </div>

      {/* Story Viewer */}
      {viewerOpen && selectedUserStories.length > 0 && (
        <StoryViewer
          stories={selectedUserStories}
          initialIndex={selectedStoryIndex}
          onClose={() => setViewerOpen(false)}
          onDelete={handleDeleteStory}
        />
      )}
    </>
  );
}
