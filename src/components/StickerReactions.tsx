import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { BRAND_STICKERS } from "@/lib/brandStickers";
import { playLikeSound } from "@/utils/soundEffects";

const QUICK_EMOJIS = ["❤️", "😂", "🔥", "😮", "😢", "👏", "🙏", "💯", "😍", "👍"];

interface StickerReactionsProps {
  /** Envia a reação (emoji ou sticker de app) como interação direta. */
  onSelect: (value: string) => void;
  className?: string;
}

/** Barra de reações rápidas: emojis + pack de stickers de apps (estilo Telegram). */
export default function StickerReactions({ onSelect, className }: StickerReactionsProps) {
  const [showStickers, setShowStickers] = useState(false);

  const send = (value: string) => {
    playLikeSound();
    onSelect(value);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {QUICK_EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 0.85 }}
            onClick={() => send(emoji)}
            aria-label={`Reagir com ${emoji}`}
            className="h-9 w-9 shrink-0 rounded-full bg-muted/60 flex items-center justify-center text-[19px] leading-none active:bg-muted"
          >
            {emoji}
          </motion.button>
        ))}
        <button
          onClick={() => setShowStickers((s) => !s)}
          aria-label="Pack de stickers"
          className={`h-9 shrink-0 px-3 rounded-full flex items-center gap-1.5 text-[12.5px] font-semibold ${
            showStickers ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Stickers
        </button>
      </div>

      {showStickers && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-1.5 flex flex-wrap gap-1.5 max-h-[132px] overflow-y-auto native-scroll"
        >
          {BRAND_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => send(sticker.text)}
              className="h-8 px-2.5 rounded-full bg-muted/60 text-[13px] font-semibold text-foreground active:scale-95 transition"
            >
              {sticker.text}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
