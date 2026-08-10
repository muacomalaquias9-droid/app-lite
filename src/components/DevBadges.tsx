import { DEV_BADGE_MAP } from "@/lib/devBadges";

interface DevBadgesProps {
  badges?: string[] | null;
  className?: string;
}

/** Faixa de selos de programador (linguagens, senioridade, empresa). */
export default function DevBadges({ badges, className }: DevBadgesProps) {
  const items = (badges || []).map((id) => DEV_BADGE_MAP[id]).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className || ""}`}>
      {items.map((badge) => (
        <span
          key={badge.id}
          title={badge.label}
          className="flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full border border-border/70 bg-muted/40"
        >
          <img
            src={badge.icon}
            alt={badge.label}
            loading="lazy"
            draggable={false}
            className="h-4 w-4 object-contain"
          />
          <span className="text-[11.5px] font-semibold text-muted-foreground">{badge.label}</span>
        </span>
      ))}
    </div>
  );
}
