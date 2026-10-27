/** A key combination, one cap per key. */
export function Keys({ keys }: Readonly<{ keys: readonly string[] }>) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="min-w-7 rounded-md border border-border bg-background px-1.5 py-0.5 text-center font-mono text-xs text-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
