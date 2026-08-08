import { useNavigate } from "react-router-dom";
import badgeEffectBlack from "@/assets/badge-effect-black.png";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  verified?: boolean | null;
  badgeType?: string | null;
  type?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  username?: string;
  fullName?: string;
  clickable?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6"
};

export const BADGE_COLORS: Record<string, { label: string; from: string; to: string }> = {
  blue: { label: "Azul", from: "#1D9BF0", to: "#0F7FD4" },
  gold: { label: "Dourado", from: "#F4C430", to: "#C9971B" },
  pink: { label: "Rosa", from: "#FF6BAA", to: "#E23A83" },
};

export const BADGE_TYPES = ["blue", "gold", "pink"] as const;

const SPECIAL_EMOJI = '󱢏';

export function hasSpecialBadgeEmoji(text?: string | null): boolean {
  if (!text) return false;
  return text.includes(SPECIAL_EMOJI);
}

export default function VerificationBadge({ 
  verified, 
  badgeType, 
  type,
  size = "md",
  className,
  username,
  fullName,
  clickable = true
}: VerificationBadgeProps) {
  const navigate = useNavigate();
  const hasEffectBadge = hasSpecialBadgeEmoji(username) || hasSpecialBadgeEmoji(fullName);
  const effectiveType = type || badgeType;

  const handleClick = (e: React.MouseEvent) => {
    if (!clickable) return;
    e.stopPropagation();
    e.preventDefault();
    navigate('/request-verification');
  };
  
  if (hasEffectBadge) {
    return (
      <img 
        src={badgeEffectBlack} 
        alt="Badge Effect" 
        className={cn(sizeClasses[size], clickable && "cursor-pointer", className)}
        title="Badge Effect"
        onClick={handleClick}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
  
  if (!verified && !effectiveType) return null;

  const color = BADGE_COLORS[effectiveType || "blue"] || BADGE_COLORS.blue;
  const gid = `badge-${effectiveType || "blue"}`;

  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="Verificado"
      role="img"
      className={cn(sizeClasses[size], "shrink-0", clickable && "cursor-pointer", className)}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <title>{`Conta verificada — selo ${color.label.toLowerCase()}`}</title>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color.from} />
          <stop offset="100%" stopColor={color.to} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gid})`}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.26 2.52-.8 3.91c-1.32.67-2.2 1.91-2.2 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      />
      <path
        fill="#fff"
        d="M10.83 16.19 6.9 12.26l1.42-1.42 2.44 2.44 4.99-5.42 1.47 1.36-6.39 6.97z"
      />
    </svg>
  );
}
