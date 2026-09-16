export default function Loading() {
  return (
    <main id="main-content" className="page-shell section-pad" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-4xl">
        <div className="h-10 w-52 rounded bg-muted motion-safe:animate-pulse" />
        <div className="mt-5 h-5 max-w-2xl rounded bg-muted motion-safe:animate-pulse" />
        <div className="mt-10 h-11 w-full rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="mt-10 space-y-4">
          {Array.from({ length: 4 }, (_, index) => <div className="h-20 rounded bg-muted motion-safe:animate-pulse" key={index} />)}
        </div>
      </div>
    </main>
  );
}
