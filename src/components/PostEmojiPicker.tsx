import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EMOJI_CATEGORIES, EMOJI_CATEGORY_NAMES } from "@/lib/emojiData";
import { BRAND_STICKERS } from "@/lib/brandStickers";

interface PostEmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
}

const APPS_TAB = "Apps";

/** Picker de emojis + pack de apps estilo Telegram (NETFLIX, TIKTOK, ...). */
export default function PostEmojiPicker({ open, onOpenChange, onSelect }: PostEmojiPickerProps) {
  const [tab, setTab] = useState<string>(APPS_TAB);
  const tabs = [APPS_TAB, ...EMOJI_CATEGORY_NAMES];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-[16px]">Emojis e packs de apps</DialogTitle>
        </DialogHeader>

        <div className="px-2 pb-1 overflow-x-auto">
          <div className="flex gap-1.5 px-2 pb-2 w-max">
            {tabs.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors ${
                  tab === name ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <ScrollArea className="h-[340px] pr-3">
            {tab === APPS_TAB ? (
              <div className="grid grid-cols-2 gap-2">
                {BRAND_STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => onSelect(sticker.text)}
                    className="h-11 px-3 rounded-2xl bg-muted/40 hover:bg-muted transition-colors flex items-center justify-center"
                    aria-label={sticker.label}
                  >
                    <span className="text-[15px] font-semibold truncate">{sticker.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-2">
                {(EMOJI_CATEGORIES[tab] || []).map((emoji) => (
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
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
