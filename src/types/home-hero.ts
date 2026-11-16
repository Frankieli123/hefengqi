export interface HeroImageSources {
  src: string;
  width: number;
  height: number;
  avif?: string;
  webp?: string;
  jpeg?: string;
  focusX: number;
  focusY: number;
}

export interface HomeHeroSlideView {
  id: string;
  key: string;
  contentDirection: "ltr" | "rtl";
  eyebrow: string;
  title: string;
  summary: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  imageAlt: string;
  desktop: HeroImageSources;
  mobile?: HeroImageSources;
}
