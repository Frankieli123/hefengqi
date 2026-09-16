export default function Loading() {
  return (
    <main id="main-content" className="support-page" aria-busy="true" aria-label="Loading">
      <header className="editorial-page-header">
        <div className="page-shell section-pad">
          <div className="h-4 w-28 rounded bg-muted motion-safe:animate-pulse" />
          <div className="mt-6 h-12 max-w-xl rounded bg-muted motion-safe:animate-pulse" />
          <div className="mt-5 h-5 max-w-2xl rounded bg-muted motion-safe:animate-pulse" />
        </div>
      </header>
      <div className="page-shell py-10">
        <div className="h-11 w-full rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="mt-10 space-y-4">
          {Array.from({ length: 4 }, (_, index) => <div className="h-24 rounded-lg bg-muted motion-safe:animate-pulse" key={index} />)}
        </div>
      </div>
    </main>
  );
}
