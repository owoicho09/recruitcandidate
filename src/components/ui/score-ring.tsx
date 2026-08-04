import { cn } from "@/lib/cn";

function toneFor(score: number) {
  if (score >= 75) return "var(--color-success)";
  if (score >= 50) return "var(--color-accent)";
  if (score >= 30) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function ScoreRing({
  score,
  size = 56,
  strokeWidth = 5,
  label,
  className,
}: {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex flex-col items-center justify-center", className)} style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-muted)" strokeWidth={strokeWidth} />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={toneFor(score)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 400ms ease-out" }}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-semibold text-foreground">{score !== null ? Math.round(score) : "—"}</span>
      </div>
      {label && <span className="mt-1 text-xs text-foreground-muted">{label}</span>}
    </div>
  );
}
