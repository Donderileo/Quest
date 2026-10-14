export default function Loading() {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-[15px] bg-muted" />
      ))}
    </div>
  );
}
