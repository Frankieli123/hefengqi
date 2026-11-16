export default function Loading() {
  return (
    <main id="main-content" className="search-page" aria-busy="true">
      <section className="bg-ink text-ink-foreground">
        <div className="page-shell py-10 md:py-14">
          <div className="h-12 w-56 rounded bg-ink-foreground/15 motion-safe:animate-pulse md:h-14" />
          <div className="mt-5 h-5 max-w-2xl rounded bg-ink-foreground/10 motion-safe:animate-pulse" />
        </div>
      </section>
      <div className="page-shell py-4 md:py-5">
        <div className="h-4 w-48 rounded bg-muted motion-safe:animate-pulse" />
      </div>
      <section className="page-shell pb-5 md:pb-7">
        <div className="h-11 w-full max-w-4xl rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="mt-5 h-4 w-24 rounded bg-muted motion-safe:animate-pulse" />
        <div className="mt-4 h-5 w-full max-w-md rounded bg-muted motion-safe:animate-pulse" />
      </section>
      <section className="page-shell pb-10 pt-3 md:pb-14 md:pt-5">
        <div className="mx-auto max-w-6xl space-y-10">
          {Array.from({ length: 3 }, (_, index) => <div className="h-32 rounded-lg border bg-background motion-safe:animate-pulse" key={index} />)}
        </div>
      </section>
    </main>
  );
}
