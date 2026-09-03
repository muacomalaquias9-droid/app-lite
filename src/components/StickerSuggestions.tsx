import { motion } from 'framer-motion';
import { STICKER_PACKS, type StickerItem } from '@/lib/stickerPacks';

interface StickerSuggestionsProps {
  /** Sticker tocado — devolve o termo sugerido de pesquisa. */
  onPick: (sticker: StickerItem) => void;
  activeTerm?: string;
}

/** Rail animado de packs de stickers reais (imagens) para sugerir pesquisas. */
export default function StickerSuggestions({ onPick, activeTerm }: StickerSuggestionsProps) {
  return (
    <div className="space-y-3">
      {STICKER_PACKS.map((pack, packIndex) => (
        <div key={pack.id}>
          <p className="px-4 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {pack.name}
          </p>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4">
            {pack.stickers.map((sticker, i) => {
              const active = activeTerm === sticker.term;
              return (
                <motion.button
                  key={sticker.id}
                  type="button"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: packIndex * 0.06 + i * 0.05, type: 'spring', stiffness: 320, damping: 22 }}
                  whileHover={{ y: -3, rotate: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onPick(sticker)}
                  aria-label={sticker.label}
                  className={`shrink-0 w-[84px] rounded-2xl border p-2 flex flex-col items-center gap-1 transition-colors ${
                    active ? 'border-foreground bg-muted/70' : 'border-border/60 bg-muted/30'
                  }`}
                >
                  <motion.img
                    src={sticker.src}
                    alt={sticker.label}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-12 w-12 object-contain"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                  />
                  <span className="text-[11.5px] font-semibold text-foreground leading-none">{sticker.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
