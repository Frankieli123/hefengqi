export function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="flex max-w-3xl flex-col gap-5">{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h2 className="section-title">{title}</h2>{description ? <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">{description}</p> : null}</div>;
}
