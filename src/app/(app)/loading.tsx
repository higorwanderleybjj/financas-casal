export default function Carregando() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="mx-auto h-6 w-40 rounded bg-black/10 dark:bg-white/15" />
      <div className="h-36 rounded-2xl bg-black/10 dark:bg-white/15" />
      <div className="h-16 rounded-2xl bg-black/10 dark:bg-white/15" />
      <div className="h-16 rounded-2xl bg-black/10 dark:bg-white/15" />
    </div>
  );
}
