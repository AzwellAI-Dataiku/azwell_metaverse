interface Props {
  level: number;
  xpProgress: number;
}

export default function LevelBadge({ level, xpProgress }: Props) {
  return (
    <div>
      <span className="inline-block bg-cy-mint/60 text-cy-brown text-xs font-bold px-2 py-0.5 rounded-full">
        🌰 Lv.{level}
      </span>
      <div className="mt-1 h-1.5 bg-cy-cream rounded-full overflow-hidden">
        <div
          className="h-full bg-cy-mint rounded-full transition-all duration-500"
          style={{ width: `${Math.min(xpProgress * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
