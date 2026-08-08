import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Camera, Heart, MessageCircle, Share2, MoreHorizontal, UserPlus, UserCheck,
  Briefcase, ArrowLeft, MapPin, Link as LinkIcon, Grid3X3, Play, Flag, Copy,
  Clapperboard, Settings, Plus, Users, Globe, ExternalLink, AtSign, TrendingUp, Award
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge, { hasSpecialBadgeEmoji } from "@/components/VerificationBadge";
import { ProfileSkeleton } from "@/components/loading/ProfileSkeleton";
import { motion } from "framer-motion";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useContentProtection } from "@/hooks/useContentProtection";
import BottomNav from "@/components/BottomNav";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  first_name: string;
  avatar_url: string;
  bio: string;
  verified?: boolean;
  badge_type?: string | null;
  banner_url?: string;
  location?: string;
  website?: string;
  category?: string;
  civil_status?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}

interface Friend {
  id: string;
  username: string;
  full_name: string;
  first_name: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string | null;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  media_urls?: string[];
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Video {
  id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  views_count?: number;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  useContentProtection();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following" | "friends">("followers");
  const [modalUsers, setModalUsers] = useState<Profile[]>([]);
  const [modalSearch, setModalSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const onlineUsers = useOnlineUsers();

  useEffect(() => { loadProfile(); }, [userId]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`profile-live:${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${profile.id}` }, () => loadStats(profile.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${profile.id}` }, () => loadStats(profile.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => loadPosts(profile.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${profile.id}` }, () => {
        loadStats(profile.id);
        loadPosts(profile.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const profileId = userId || user.id;
      setIsOwnProfile(profileId === user.id);

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", profileId).single();

      if (profileData) {
        setProfile(profileData);
        await Promise.all([
          loadStats(profileId), loadPosts(profileId), loadVideos(profileId),
          loadFriends(profileId), loadStories(profileId),
        ]);
        if (profileId !== user.id) await checkFollowing(user.id, profileId);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (profileId: string) => {
    const [followers, following, friendships, postsData] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      supabase.from("friendships").select("*", { count: "exact", head: true }).or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profileId),
    ]);
    setFollowersCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setFriendsCount(friendships.count || 0);
    setPostsCount(postsData.count || 0);
  };

  const loadStories = async (profileId: string) => {
    const { data } = await supabase.from("stories").select("*").eq("user_id", profileId)
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
    if (data) setStories(data);
  };

  const checkFollowing = async (currentUserId: string, profileId: string) => {
    const { data } = await supabase.from("follows").select("*")
      .eq("follower_id", currentUserId).eq("following_id", profileId).maybeSingle();
    setIsFollowing(!!data);
  };

  const loadFriends = async (profileId: string) => {
    const { data } = await supabase.from("friendships").select("*")
      .or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`);
    if (data) {
      const friendIds = data.map(f => f.user_id_1 === profileId ? f.user_id_2 : f.user_id_1);
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles")
          .select("id, username, full_name, first_name, avatar_url, verified, badge_type")
          .in("id", friendIds);
        setFriends(profiles || []);
      }
    }
  };

  const loadPosts = async (profileId: string) => {
    const { data } = await supabase.from("posts")
      .select(`*, likes:post_likes(count), comments:comments(count)`)
      .eq("user_id", profileId).is("expires_at", null)
      .order("created_at", { ascending: false });
    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      const postsWithLikes = await Promise.all(
        data.map(async (post) => {
          const { data: userLike } = await supabase.from("post_likes").select("*")
            .eq("post_id", post.id).eq("user_id", user?.id).maybeSingle();
          return { ...post, likes_count: post.likes[0]?.count || 0, comments_count: post.comments[0]?.count || 0, user_liked: !!userLike };
        })
      );
      setPosts(postsWithLikes);
    }
  };

  const loadVideos = async (profileId: string) => {
    const { data } = await supabase.from("verification_videos")
      .select(`*, likes:verification_video_likes(count), comments:verification_video_comments(count)`)
      .eq("user_id", profileId).order("created_at", { ascending: false });
    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      const videosWithData = await Promise.all(
        data.map(async (video) => {
          const [userLike, viewsCount] = await Promise.all([
            supabase.from("verification_video_likes").select("*").eq("video_id", video.id).eq("user_id", user?.id).maybeSingle(),
            supabase.from("video_views").select("*", { count: "exact", head: true }).eq("video_id", video.id),
          ]);
          return { ...video, likes_count: video.likes[0]?.count || 0, comments_count: video.comments[0]?.count || 0, user_liked: !!userLike.data, views_count: viewsCount.count || 0 };
        })
      );
      setVideos(videosWithData);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: profile.id });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingBanner(true);
    try {
      const fileName = `${profile.id}/banner-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
      await supabase.from('profiles').update({ banner_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, banner_url: publicUrl });
      toast.success('Foto de capa atualizada!');
    } catch { toast.error('Erro ao enviar foto de capa'); }
    finally { setUploadingBanner(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    try {
      const fileName = `${profile.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success('Foto de perfil atualizada!');
    } catch { toast.error('Erro ao enviar foto de perfil'); }
    finally { setUploadingAvatar(false); }
  };

  const handleOpenModal = async (type: "followers" | "following" | "friends") => {
    setModalType(type);
    setModalOpen(true);
    setModalSearch("");
    if (type === "followers") {
      const { data } = await supabase.from("follows").select("profiles!follows_follower_id_fkey(*)").eq("following_id", profile?.id);
      setModalUsers(data?.map(d => d.profiles) || []);
    } else if (type === "following") {
      const { data } = await supabase.from("follows").select("profiles!follows_following_id_fkey(*)").eq("follower_id", profile?.id);
      setModalUsers(data?.map(d => d.profiles) || []);
    } else {
      const { data } = await supabase.from("friendships").select("*").or(`user_id_1.eq.${profile?.id},user_id_2.eq.${profile?.id}`);
      if (data) {
        const friendIds = data.map(f => f.user_id_1 === profile?.id ? f.user_id_2 : f.user_id_1);
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", friendIds);
        setModalUsers(profiles || []);
      }
    }
  };

  const filteredModalUsers = modalUsers.filter(u => 
    u.username?.toLowerCase().includes(modalSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(modalSearch.toLowerCase())
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${profile?.id}`;
    navigator.share?.({ title: profile?.first_name, url }).catch(() => {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    });
  };

  if (loading || !profile) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background"><ProfileSkeleton /></div>
      </ProtectedRoute>
    );
  }

  const isOnline = onlineUsers.has(profile.id);
  const hasVerification = profile.verified || hasSpecialBadgeEmoji(profile.username) || hasSpecialBadgeEmoji(profile.full_name);

  return (
    <ProtectedRoute>
      <div className="h-screen bg-mobile-surface overflow-y-auto native-scroll pb-[88px]">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 safe-area-top bg-background border-b border-border/60"
        >
          <div className="flex items-center justify-between px-2 h-14 text-foreground">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-8 w-8 press-effect text-mobile-header-foreground hover:bg-mobile-header-foreground/10">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Button>
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-bold">@{profile.username}</span>
                {hasVerification && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} username={profile.username} fullName={profile.full_name} className="w-4 h-4" />}
              </div>
            <div className="flex items-center gap-1">
              {isOwnProfile && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/settings/edit-profile')} className="rounded-full h-8 w-8 text-mobile-header-foreground hover:bg-mobile-header-foreground/10">
                  <Settings className="h-[18px] w-[18px]" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-mobile-header-foreground hover:bg-mobile-header-foreground/10">
                    <MoreHorizontal className="h-[18px] w-[18px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.id}`); toast.success("Link copiado!"); }}>
                    <Copy className="h-4 w-4 mr-2" />Copiar link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />Partilhar perfil
                  </DropdownMenuItem>
                  {!isOwnProfile && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(`/report?type=profile&id=${profile.id}`)} className="text-destructive">
                        <Flag className="h-4 w-4 mr-2" />Denunciar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>

        {/* Instagram-style header — no banner, classic compact layout */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-5 mb-4">
            <div className="relative flex-shrink-0">
              <div className={`p-[2.5px] rounded-full ${stories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : 'bg-border/40'}`}>
                <div className="p-[2px] rounded-full bg-background">
                  <Avatar className="h-[86px] w-[86px]">
                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold">
                      {profile.first_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {isOwnProfile && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <button onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-7 w-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-[3px] border-background shadow">
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </button>
                  <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                </>
              )}
              {!isOwnProfile && isOnline && (
                <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-background bg-green-500" />
              )}
            </div>

            <div className="flex-1 grid grid-cols-3 gap-1 text-center">
              <button className="py-1 active:opacity-60">
                <span className="block text-[17px] font-bold leading-tight">{formatNumber(postsCount)}</span>
                <span className="block text-[13px] text-muted-foreground">publicações</span>
              </button>
              <button onClick={() => handleOpenModal("followers")} className="py-1 active:opacity-60">
                <span className="block text-[17px] font-bold leading-tight">{formatNumber(followersCount)}</span>
                <span className="block text-[13px] text-muted-foreground">seguidores</span>
              </button>
              <button onClick={() => handleOpenModal("following")} className="py-1 active:opacity-60">
                <span className="block text-[17px] font-bold leading-tight">{formatNumber(followingCount)}</span>
                <span className="block text-[13px] text-muted-foreground">filhou</span>
              </button>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[15px] font-bold leading-tight">{profile.full_name || profile.first_name}</h1>
              {hasVerification && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} username={profile.username} fullName={profile.full_name} className="w-4 h-4" />}
            </div>
            {profile.category && (
              <p className="text-[13px] text-muted-foreground leading-tight">{profile.category}</p>
            )}
            {profile.bio && (
              <p className="text-[14px] leading-[18px] mt-1 whitespace-pre-wrap">{profile.bio}</p>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[14px] text-primary font-semibold mt-0.5 inline-block">
                {profile.website.replace(/https?:\/\//, '')}
              </a>
            )}
          </div>

          <div className="flex gap-2">
            {isOwnProfile ? (
              <>
                <Button size="sm" className="flex-1 rounded-full text-[14px] font-semibold h-9"
                  onClick={() => navigate('/settings/edit-profile')}>Editar perfil</Button>
                <Button variant="secondary" size="sm" className="flex-1 rounded-full text-[14px] font-semibold h-9 bg-muted hover:bg-muted/80"
                  onClick={handleShare}>Partilhar</Button>
                <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80"
                  onClick={() => navigate('/professional-panel')}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant={isFollowing ? "secondary" : "default"}
                  className={`flex-1 rounded-full text-[14px] font-semibold h-9 ${isFollowing ? 'bg-muted hover:bg-muted/80' : ''}`}
                  onClick={handleFollow}>
                  {isFollowing ? 'A filhar' : 'Filhar'}
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 rounded-full text-[14px] font-semibold h-9 bg-muted hover:bg-muted/80"
                  onClick={() => navigate(`/chat/${profile.id}`)}>Mensagem</Button>
                <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80"
                  onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-b h-10 rounded-none p-0 gap-0">
            {[
              { value: "posts", label: "Publicações" },
              { value: "reels", label: "Reels" },
              { value: "about", label: "Sobre" },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground rounded-none h-full data-[state=active]:shadow-none text-muted-foreground font-semibold text-[13px]">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="h-16 w-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-bold mb-1">Sem publicações</h3>
                <p className="text-sm text-muted-foreground">As publicações aparecem aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[1px] bg-border/20">
                {posts.map((post, idx) => {
                  const hasMedia = post.media_urls && post.media_urls.length > 0;
                  const firstMedia = hasMedia ? post.media_urls[0] : null;
                  const isVideoPost = firstMedia?.includes('.mp4') || firstMedia?.includes('.webm');
                  return (
                    <motion.div key={post.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}
                      className="aspect-square relative cursor-pointer group bg-muted/20" onClick={() => navigate(`/post/${post.id}`)}>
                      {hasMedia ? (
                        <>
                          {isVideoPost ? (
                            <video src={firstMedia!} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={firstMedia!} alt="" className="w-full h-full object-cover" />
                          )}
                          {post.media_urls!.length > 1 && (
                            <div className="absolute top-2 right-2"><Copy className="h-3.5 w-3.5 text-white drop-shadow-lg" /></div>
                          )}
                          {isVideoPost && (
                            <div className="absolute top-2 right-2"><Play className="h-3.5 w-3.5 text-white drop-shadow-lg fill-white" /></div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3">
                          <p className="text-xs text-muted-foreground line-clamp-4 text-center">{post.content}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1 text-white text-sm">
                          <Heart className="h-4 w-4 fill-white" /><span className="font-bold">{formatNumber(post.likes_count)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white text-sm">
                          <MessageCircle className="h-4 w-4 fill-white" /><span className="font-bold">{formatNumber(post.comments_count)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-0">
            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="h-16 w-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
                  <Clapperboard className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-bold mb-1">Sem reels</h3>
                <p className="text-sm text-muted-foreground">Os reels aparecem aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[1px] bg-border/20">
                {videos.map((video, idx) => (
                  <motion.div key={video.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}
                    className="aspect-[9/16] relative cursor-pointer group" onClick={() => navigate(`/videos?v=${video.id}`)}>
                    <video src={video.video_url} className="w-full h-full object-cover" muted />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white">
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span className="text-[11px] font-semibold">{formatNumber(video.views_count || 0)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-0 p-4 space-y-4">
            <div className="rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <h3 className="font-bold text-[14px]">Detalhes</h3>
              </div>
              <div className="p-4 space-y-3">
                {profile.category && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[13px]">{profile.category}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-[13px]">{profile.location}</span>
                  </div>
                )}
                {profile.civil_status && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-[13px]">{profile.civil_status}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary hover:underline flex items-center gap-1">
                      {profile.website.replace(/https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {!profile.category && !profile.location && !profile.civil_status && !profile.website && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem detalhes adicionados</p>
                )}
              </div>
            </div>

            {friends.length > 0 && (
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                  <h3 className="font-bold text-[14px]">Amigos</h3>
                  <span className="text-[12px] text-muted-foreground">{friends.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-3">
                  {friends.slice(0, 6).map(friend => (
                    <button key={friend.id} onClick={() => navigate(`/profile/${friend.id}`)}
                      className="flex flex-col items-center p-2 rounded-xl hover:bg-muted/50 transition-colors">
                      <Avatar className="h-12 w-12 mb-1">
                        <AvatarImage src={friend.avatar_url} />
                        <AvatarFallback className="text-sm">{friend.first_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] font-medium text-center line-clamp-1">{friend.first_name}</span>
                    </button>
                  ))}
                </div>
                {friends.length > 6 && (
                  <Button variant="ghost" className="w-full h-9 rounded-none border-t border-border/30 text-[12px] font-semibold"
                    onClick={() => handleOpenModal("friends")}>
                    Ver todos
                  </Button>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <h3 className="font-bold text-[14px]">Estatísticas</h3>
              </div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-border/30">
                {[
                  { label: "Publicações", value: formatNumber(postsCount), icon: Grid3X3 },
                  { label: "Seguidores", value: formatNumber(followersCount), icon: Users },
                  { label: "A seguir", value: formatNumber(followingCount), icon: UserPlus },
                  { label: "Amigos", value: formatNumber(friendsCount), icon: Heart },
                ].map((stat, i) => (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-base font-bold leading-tight">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 rounded-2xl">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="text-center text-[14px]">
                {modalType === "followers" ? "Seguidores" : modalType === "following" ? "A seguir" : "Amigos"}
              </DialogTitle>
              <div className="pt-3">
                <Input placeholder="Pesquisar..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)}
                  className="rounded-xl bg-muted/50 border-0 h-9 text-[13px]" />
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1">
              {filteredModalUsers.map(user => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => { setModalOpen(false); navigate(`/profile/${user.id}`); }}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-[13px] truncate">{user.first_name}</p>
                      {user.verified && <VerificationBadge verified={user.verified} badgeType={user.badge_type} size="sm" />}
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
