import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Bookmark, 
  Share2, 
  EyeOff, 
  AlertCircle,
  Bell,
  Copy,
  PlusCircle,
  MinusCircle,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PostMenuProps {
  postId: string;
  postUserId: string;
  currentUserId: string;
  isSaved?: boolean;
  hasNotifications?: boolean;
  onUpdate?: () => void;
}

export default function PostMenu({ 
  postId, 
  postUserId, 
  currentUserId,
  isSaved = false,
  hasNotifications = false,
  onUpdate 
}: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSavePost = async () => {
    try {
      if (isSaved) {
        await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        toast.success("Post removido dos salvos");
      } else {
        await supabase
          .from("saved_posts")
          .insert({ post_id: postId, user_id: currentUserId });
        toast.success("Post salvo com sucesso");
      }
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleInterested = async () => {
    try {
      await supabase
        .from("post_preferences")
        .upsert({ 
          post_id: postId, 
          user_id: currentUserId,
          preference_type: 'interested'
        });
      toast.success("Marcado como interessante");
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleNotInterested = async () => {
    try {
      await supabase
        .from("post_preferences")
        .upsert({ 
          post_id: postId, 
          user_id: currentUserId,
          preference_type: 'not_interested'
        });
      toast.success("Preferência atualizada");
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleHidePost = async () => {
    try {
      await supabase
        .from("post_preferences")
        .upsert({ 
          post_id: postId, 
          user_id: currentUserId,
          preference_type: 'hide'
        });
      toast.success("Post ocultado");
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleToggleNotifications = async () => {
    try {
      if (hasNotifications) {
        await supabase
          .from("post_notifications")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        toast.success("Notificações desativadas");
      } else {
        await supabase
          .from("post_notifications")
          .insert({ 
            post_id: postId, 
            user_id: currentUserId,
            enabled: true
          });
        toast.success("Notificações ativadas");
      }
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência");
    setOpen(false);
  };

  const handleShare = () => {
    const link = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      navigator.share({
        title: "Compartilhar publicação",
        url: link,
      });
    } else {
      handleCopyLink();
    }
    setOpen(false);
  };

  const handleReport = () => {
    navigate(`/report?type=post&id=${postId}`);
    setOpen(false);
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Tens certeza que desejas eliminar esta publicação?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      toast.success("Publicação eliminada com sucesso");
      onUpdate?.();
      navigate("/feed");
    } catch (error: any) {
      toast.error("Erro ao eliminar publicação");
      console.error(error);
    }
    setOpen(false);
  };

  const isOwner = postUserId === currentUserId;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-muted rounded-full"
        >
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-72 max-h-[70vh] overflow-y-auto bg-card border shadow-lg z-50"
        sideOffset={5}
      >
        {isOwner && (
          <>
            <DropdownMenuItem onClick={handleDeletePost} className="py-2.5 cursor-pointer text-destructive focus:text-destructive">
              <div className="flex items-center gap-3">
                <Trash2 className="h-4 w-4" />
                <p className="font-medium text-sm">Eliminar publicação</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleSavePost} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            <p className="font-medium text-sm">
              {isSaved ? "Remover dos guardados" : "Guardar publicação"}
            </p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleShare} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <Share2 className="h-4 w-4" />
            <p className="font-medium text-sm">Partilhar</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCopyLink} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <Copy className="h-4 w-4" />
            <p className="font-medium text-sm">Copiar ligação</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleInterested} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <PlusCircle className="h-4 w-4" />
            <p className="font-medium text-sm">Com interesse</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleNotInterested} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <MinusCircle className="h-4 w-4" />
            <p className="font-medium text-sm">Sem interesse</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleHidePost} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <EyeOff className="h-4 w-4" />
            <p className="font-medium text-sm">Não quero ver isto</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleToggleNotifications} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <Bell className={`h-4 w-4 ${hasNotifications ? 'fill-current' : ''}`} />
            <p className="font-medium text-sm">
              {hasNotifications ? "Desativar" : "Ativar"} notificações
            </p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleReport} className="py-2.5 cursor-pointer">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4" />
            <p className="font-medium text-sm">Denunciar publicação</p>
          </div>
        </DropdownMenuItem>

        {!isOwner && (
          <DropdownMenuItem
            onClick={() => { navigate(`/report?type=user&id=${postUserId}`); setOpen(false); }}
            className="py-2.5 cursor-pointer text-destructive focus:text-destructive"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4" />
              <p className="font-medium text-sm">Denunciar conta</p>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
