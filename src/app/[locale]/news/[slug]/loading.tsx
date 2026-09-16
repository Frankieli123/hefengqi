export default function Loading() {
  return (
    <main id="main-content" aria-busy="true" aria-label="Loading">
      <header className="bg-muted/40">
        <div className="page-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div className="aspect-video rounded-lg bg-muted motion-safe:animate-pulse" />
          <div className="space-y-5">
            <div className="h-4 w-28 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-16 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-12 rounded bg-muted motion-safe:animate-pulse" />
          </div>
        </div>
      </header>
    </main>
  );
}
