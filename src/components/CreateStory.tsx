import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Type, Music, Camera, X, ImageIcon, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import MusicSearch from "@/components/MusicSearch";
import { cn } from "@/lib/utils";

interface CreateStoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedMusic {
  name: string;
  artist: string;
  url?: string;
}

export default function CreateStory({ open, onOpenChange }: CreateStoryProps) {
  const [mode, setMode] = useState<"select" | "text" | "music" | "camera">("select");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [textContent, setTextContent] = useState("");
  const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach(file => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error("Apenas fotos e vídeos são permitidos");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 20MB");
        return;
      }
      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    });

    if (validFiles.length > 0) {
      setMediaFiles(validFiles);
      setMediaPreviews(previews);
      setMode("camera"); // Skip editor — go straight to preview + publish
    }
  };

  const handleCreateStory = async () => {
    if (mediaFiles.length === 0 && !textContent.trim()) {
      toast.error("Adicione conteúdo ao story");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (mediaFiles.length > 0) {
        for (const mediaFile of mediaFiles) {
          const fileExt = (mediaFile.name.split(".").pop() || (mediaFile.type.startsWith("image/") ? "jpg" : "mp4")).toLowerCase();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("stories")
            .upload(fileName, mediaFile, { cacheControl: "0", upsert: false, contentType: mediaFile.type });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(fileName);
          const mediaType = mediaFile.type.startsWith("image/") ? "image" : "video";

          const { error } = await supabase.from("stories").insert({
            user_id: user.id,
            media_url: publicUrl,
            media_type: mediaType,
            music_name: selectedMusic?.name || null,
            music_artist: selectedMusic?.artist || null,
            custom_music_url: selectedMusic?.url || null,
          });

          if (error) throw error;
        }
      } else if (textContent.trim()) {
        const { error } = await supabase.from("stories").insert({
          user_id: user.id,
          media_url: `data:text/plain,${encodeURIComponent(textContent)}`,
          media_type: "text",
          music_name: selectedMusic?.name || null,
          music_artist: selectedMusic?.artist || null,
          custom_music_url: selectedMusic?.url || null,
        });
        if (error) throw error;
      }

      toast.success("Story publicado!");
      handleClose();
    } catch (error: any) {
      console.error("Story error:", error);
      toast.error(error.message || "Erro ao criar story");
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setMode("select");
    setMediaFiles([]);
    setMediaPreviews([]);
    setTextContent("");
    setSelectedMusic(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-full max-h-full h-screen w-screen p-0 m-0 rounded-none">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b p-4">
          <div className="flex items-center gap-3">
            {mode !== "select" && (
              <Button variant="ghost" size="icon" onClick={() => setMode("select")} className="h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            )}
            <DialogTitle className="text-xl">
              {mode === "select" ? "Criar história" : 
               mode === "text" ? "Texto" :
               mode === "music" ? "Adicionar música" :
               "Pré-visualização"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {mode === "select" && (
            <div className="space-y-6 p-4 h-full">
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setMode("text")}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 hover:opacity-90 transition-opacity">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Type className="h-8 w-8 text-purple-600" />
                  </div>
                  <span className="text-white font-semibold">Texto</span>
                </button>

                <button onClick={() => setMode("music")}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 hover:opacity-90 transition-opacity">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Music className="h-8 w-8 text-teal-600" />
                  </div>
                  <span className="text-white font-semibold">Música</span>
                </button>

                <button onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 transition-opacity">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-blue-600" />
                  </div>
                  <span className="text-white font-semibold">Câmara</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Galeria</h3>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full">
                    <Check className="h-4 w-4 mr-2" />
                    Selecionar
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </div>
          )}

          {mode === "text" && (
            <div className="space-y-4 p-4 h-full">
              <Textarea placeholder="Digite seu texto..." value={textContent} onChange={(e) => setTextContent(e.target.value)} className="min-h-[300px] text-lg" />
              
              {selectedMusic && (
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <Music className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedMusic.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedMusic.artist}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedMusic(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode("music")} className="flex-1">
                  <Music className="h-4 w-4 mr-2" />Música
                </Button>
                <Button onClick={handleCreateStory} disabled={loading || !textContent.trim()} className="flex-1">
                  {loading ? "Publicando..." : "Publicar"}
                </Button>
              </div>
            </div>
          )}

          {mode === "music" && (
            <div className="h-full p-4">
              <MusicSearch onSelect={(music) => {
                setSelectedMusic({ name: music.name, artist: music.artist, url: music.preview });
                toast.success(`Música "${music.name}" selecionada`);
                setMode(textContent ? "text" : mediaFiles.length > 0 ? "camera" : "select");
              }} />
            </div>
          )}

          {mode === "camera" && (
            <div className="space-y-4 p-4 h-full overflow-y-auto">
              {mediaPreviews.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      {mediaFiles[index]?.type.startsWith("image/") ? (
                        <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                      ) : (
                        <video src={preview} controls className="w-full h-48 object-cover rounded-lg" />
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button variant="ghost" size="icon" className="bg-black/50 hover:bg-black/70 h-8 w-8"
                          onClick={() => removeMedia(index)}>
                          <X className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedMusic && (
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <Music className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedMusic.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedMusic.artist}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedMusic(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                </div>
              )}

              <div className="flex gap-2">
                {mediaPreviews.length > 0 && (
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                    <ImageIcon className="h-4 w-4 mr-2" />Mais
                  </Button>
                )}
                <Button variant="outline" onClick={() => setMode("music")} className="flex-1">
                  <Music className="h-4 w-4 mr-2" />Música
                </Button>
                <Button onClick={handleCreateStory} disabled={loading || mediaFiles.length === 0} className="flex-1">
                  {loading ? "Publicando..." : "Publicar"}
                </Button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
