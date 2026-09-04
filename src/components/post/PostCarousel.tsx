import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Copy, Heart, Play } from "lucide-react";

interface PostCarouselProps {
  media: string[];
  /** Chamado ao tocar duas vezes (curtir) */
  onDoubleTap?: () => void;
  /** Abre o visualizador em ecrã inteiro */
  onOpen?: (index: number) => void;
  /** Mostra a animação de coração */
  showLikeAnimation?: boolean;
}

const isVideo = (url: string) => {
  const l = (url || "").toLowerCase();
  return [".mp4", ".webm", ".mov", ".avi", ".mkv"].some((ext) => l.includes(ext));
};

/**
 * Carrossel de imagens com design em cascata: cada slide agrupa até 4 mídias
 * em 4 partes escalonadas (cascata), como um mosaico editorial.
 */
export default function PostCarousel({ media, onDoubleTap, onOpen, showLikeAnimation }: PostCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Divide a mídia em grupos de 4 → cada grupo é um slide em cascata
  const slides: string[][] = [];
  for (let i = 0; i < media.length; i += 4) slides.push(media.slice(i, i + 4));

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(index, slides.length - 1)));
  }, [slides.length]);

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  /** Alturas em cascata para as 4 partes do slide */
  const cascadeClass = (count: number, idx: number) => {
    if (count === 1) return "col-span-2 row-span-2";
    if (count === 2) return idx === 0 ? "col-span-2 row-span-1" : "col-span-2 row-span-1";
    if (count === 3) return idx === 0 ? "col-span-2 row-span-1" : "col-span-1 row-span-1";
    return "col-span-1 row-span-1";
  };

  const renderItem = (url: string, globalIndex: number, cls: string) => (
    <button
      key={`${url}-${globalIndex}`}
      type="button"
      onClick={() => onOpen?.(globalIndex)}
      className={`relative overflow-hidden bg-muted/40 ${cls} group`}
      style={{ borderRadius: 18 }}
    >
      {isVideo(url) ? (
        <>
          <video src={url} className="h-full w-full object-cover" playsInline muted preload="metadata" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-11 w-11 rounded-full bg-background/70 backdrop-blur-md flex items-center justify-center">
              <Play className="h-5 w-5 fill-foreground text-foreground ml-0.5" />
            </span>
          </span>
        </>
      ) : (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.03]"
        />
      )}
      <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-foreground/5" style={{ borderRadius: 18 }} />
    </button>
  );

  return (
    <div className="relative select-none" onDoubleClick={onDoubleTap}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide native-scroll"
        style={{ scrollbarWidth: "none" }}
      >
        {slides.map((group, slideIdx) => (
          <div key={slideIdx} className="w-full shrink-0 snap-center px-3">
            <div
              className="grid grid-cols-2 grid-rows-2 gap-1.5"
              style={{ height: "min(78vw, 420px)" }}
            >
              {group.map((url, i) =>
                renderItem(url, slideIdx * 4 + i, cascadeClass(group.length, i))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Contador estilo Instagram */}
      {slides.length > 1 && (
        <div className="absolute top-3 right-6 flex items-center gap-1 rounded-full bg-foreground/70 px-2.5 py-1 text-[11.5px] font-semibold text-background backdrop-blur-md">
          <Copy className="h-3 w-3" />
          {active + 1}/{slides.length}
        </div>
      )}

      {/* Setas (desktop) */}
      {slides.length > 1 && (
        <>
          {active > 0 && (
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => goTo(active - 1)}
              className="hidden sm:flex absolute left-5 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {active < slides.length - 1 && (
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => goTo(active + 1)}
              className="hidden sm:flex absolute right-5 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </>
      )}

      {/* Indicadores */}
      {slides.length > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para o grupo ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/35"
              }`}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showLikeAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <Heart className="h-24 w-24 fill-white text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
