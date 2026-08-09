import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Heart, MessageCircle, Share2, Sparkles, PartyPopper, Rocket } from "lucide-react";
import blynkLogo from "@/assets/blynk-2026-logo.png";
import { toast } from "sonner";

interface Reaction {
  type: string;
  emoji: string;
  count: number;
}

const reactionTypes = [
  { type: "love", emoji: "❤️" },
  { type: "fire", emoji: "🔥" },
  { type: "party", emoji: "🎉" },
  { type: "rocket", emoji: "🚀" },
  { type: "star", emoji: "⭐" },
];

export function Blynk2026Announcement() {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [totalReactions, setTotalReactions] = useState(0);

  useEffect(() => {
    // Simulated reactions for demo
    setReactions([
      { type: "love", emoji: "❤️", count: 234 },
      { type: "fire", emoji: "🔥", count: 189 },
      { type: "party", emoji: "🎉", count: 145 },
      { type: "rocket", emoji: "🚀", count: 98 },
      { type: "star", emoji: "⭐", count: 67 },
    ]);
    setTotalReactions(733);
  }, []);

  const handleReaction = (type: string, emoji: string) => {
    if (myReaction === type) {
      setMyReaction(null);
      setTotalReactions(prev => prev - 1);
      toast("Reação removida");
    } else {
      if (myReaction) {
        setMyReaction(type);
        toast(`Reagiu com ${emoji}`);
      } else {
        setMyReaction(type);
        setTotalReactions(prev => prev + 1);
        toast(`Reagiu com ${emoji}`);
      }
    }
    setShowReactions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-4 mb-6"
    >
      <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20 shadow-xl shadow-primary/5">
        {/* Animated Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x opacity-20" />
          <div className="relative p-6 flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent blur-xl opacity-50" />
              <img 
                src={blynkLogo} 
                alt="Blynk 2026" 
                className="h-16 w-16 rounded-2xl relative z-10 shadow-lg"
              />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Blynk 2026
                </h3>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
              </div>
              <p className="text-sm text-muted-foreground">
                Feliz Ano Novo! 🎆
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                <PartyPopper className="h-8 w-8 text-primary" />
              </motion.div>
              <div>
                <h4 className="font-bold text-lg">Bem-vindo ao futuro!</h4>
                <p className="text-sm text-muted-foreground">
                  2026 está aqui com novidades incríveis
                </p>
              </div>
            </div>
            <p className="text-foreground leading-relaxed">
              Estamos entusiasmados por começar este novo ano contigo! 
              O Blynk 2026 traz um design renovado, novas funcionalidades e 
              muitas surpresas. Obrigado por fazeres parte da nossa comunidade! 🙏
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-primary/10 rounded-xl p-3 text-center"
            >
              <Rocket className="h-6 w-6 text-primary mx-auto mb-1" />
              <span className="text-xs font-medium">Mais Rápido</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-accent/10 rounded-xl p-3 text-center"
            >
              <Sparkles className="h-6 w-6 text-accent mx-auto mb-1" />
              <span className="text-xs font-medium">Novo Design</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-primary/10 rounded-xl p-3 text-center"
            >
              <Heart className="h-6 w-6 text-primary mx-auto mb-1" />
              <span className="text-xs font-medium">Comunidade</span>
            </motion.div>
          </div>
        </div>

        {/* Reactions Bar */}
        <div className="border-t border-border/50 px-6 py-3">
          {totalReactions > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-1">
                {reactions.slice(0, 4).map((r, i) => (
                  <span key={r.type} className="text-lg">{r.emoji}</span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {totalReactions.toLocaleString()} reações
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 relative">
            {/* Reaction Picker */}
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-full px-3 py-2 shadow-xl flex gap-2"
              >
                {reactionTypes.map((r) => (
                  <motion.button
                    key={r.type}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(r.type, r.emoji)}
                    className={`text-2xl transition-transform ${myReaction === r.type ? 'scale-125' : ''}`}
                  >
                    {r.emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setTimeout(() => setShowReactions(false), 500)}
              onClick={() => handleReaction("love", "❤️")}
            >
              {myReaction ? (
                <span className="text-lg">{reactionTypes.find(r => r.type === myReaction)?.emoji}</span>
              ) : (
                <Heart className={`h-5 w-5 ${myReaction ? 'fill-primary text-primary' : ''}`} />
              )}
              <span className={myReaction ? 'text-primary font-semibold' : ''}>
                {myReaction ? 'Reagido' : 'Reagir'}
              </span>
            </Button>

            <Button variant="ghost" size="sm" className="flex-1 gap-2">
              <MessageCircle className="h-5 w-5" />
              Comentar
            </Button>

            <Button variant="ghost" size="sm" className="flex-1 gap-2">
              <Share2 className="h-5 w-5" />
              Partilhar
            </Button>
          </div>
        </div>
      </Card>

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </motion.div>
  );
}
