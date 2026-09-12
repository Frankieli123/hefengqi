type EditorialPageHeaderProps = {
  title: string;
  description: string;
};

export function EditorialPageHeader({ title, description }: EditorialPageHeaderProps) {
  return (
    <section className="bg-ink text-ink-foreground">
      <div className="page-shell py-16 md:py-24">
        <h1 className="heading-underlined heading-underlined-left max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-muted">{description}</p>
      </div>
    </section>
  );
}
