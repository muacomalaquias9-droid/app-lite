import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onGifSelect: (gifUrl: string) => void;
}

interface GifItem {
  id: string;
  title: string;
  media_formats: {
    gif: {
      url: string;
    };
    tinygif: {
      url: string;
    };
  };
}

export default function GifPicker({ open, onClose, onGifSelect }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Tenor API key público (pode ser usado em produção)
  const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
  const TENOR_CLIENT_KEY = 'blynk_chat';

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=30&media_filter=gif`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar GIFs');
      }

      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
      toast({
        title: 'Erro ao buscar GIFs',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGifClick = (gif: GifItem) => {
    onGifSelect(gif.media_formats.gif.url);
    onClose();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Debounce search
    const timeout = setTimeout(() => {
      searchGifs(value);
    }, 500);

    return () => clearTimeout(timeout);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Escolher GIF</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar GIFs..."
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Buscando GIFs...</p>
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchQuery ? 'Nenhum GIF encontrado' : 'Digite para buscar GIFs'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  className="relative cursor-pointer rounded-lg overflow-hidden hover:scale-105 transition-transform border border-border"
                  onClick={() => handleGifClick(gif)}
                >
                  <img
                    src={gif.media_formats.tinygif.url}
                    alt={gif.title}
                    className="w-full aspect-square object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground text-center mt-2">
          Powered by Tenor
        </div>
      </DialogContent>
    </Dialog>
  );
}
