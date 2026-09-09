import { cn } from "@/lib/utils";

/** Iniciais a partir do nome ("Ana Paula" -> "AP"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
} as const;

/** Paleta determinística por pessoa (mesmas cores do design). */
const COLORS = [
  "#b9744f", "#4a7c59", "#6d7fa8", "#a87faa",
  "#c0913f", "#4f7d8c", "#c07a4f", "#7d6da8",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none overflow-hidden",
        SIZES[size],
        className,
      )}
      style={src ? undefined : { backgroundColor: colorFor(name) }}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
