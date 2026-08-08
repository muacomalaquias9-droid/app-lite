import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EMOJI_CATEGORIES, EMOJI_CATEGORY_NAMES } from "@/lib/emojiData";

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ open, onOpenChange, onSelect }: EmojiPickerProps) {
  const [category, setCategory] = useState(EMOJI_CATEGORY_NAMES[0]);
  const emojis = EMOJI_CATEGORIES[category] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Emojis</DialogTitle>
        </DialogHeader>
        <div className="px-2 pb-2 overflow-x-auto">
          <div className="flex gap-1.5 px-2 pb-2 w-max">
            {EMOJI_CATEGORY_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors ${
                  category === name ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4">
          <ScrollArea className="h-[360px] pr-3">
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="h-10 w-10 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-xl flex items-center justify-center"
                  aria-label={`Emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
