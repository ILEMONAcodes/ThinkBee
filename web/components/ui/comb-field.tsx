export function CombField({ className = "", count = 9 }: Readonly<{ className?: string; count?: number }>) {
  return (
    <div aria-hidden className={`grid w-52 grid-cols-4 gap-2 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <span className="comb-cell aspect-square bg-comb-400" key={index} style={{ opacity: 0.24 + (index % 4) * 0.12 }} />
      ))}
    </div>
  );
}
