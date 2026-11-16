import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow: _eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  const isCenter = align === "center";
  return (
    <div
      className={cn(
        "flex max-w-3xl flex-col gap-4",
        isCenter ? "items-center text-center mx-auto" : "items-start text-start",
        className
      )}
    >
      <h2
        className={cn(
          "section-title heading-underlined",
          isCenter ? "heading-underlined-center" : "heading-underlined-left"
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
