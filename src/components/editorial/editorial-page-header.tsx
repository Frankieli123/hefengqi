type EditorialPageHeaderProps = {
  title: string;
  description: string;
};

export function EditorialPageHeader({ title, description }: EditorialPageHeaderProps) {
  return (
    <section className="bg-ink text-ink-foreground">
      <div className="page-shell py-10 md:py-14">
        <h1 className="heading-underlined heading-underlined-left text-3xl font-semibold leading-tight md:text-5xl">{title}</h1>
        <p className="mt-4 md:mt-5 max-w-3xl text-sm md:text-base leading-relaxed md:leading-7 text-ink-muted">{description}</p>
      </div>
    </section>
  );
}
