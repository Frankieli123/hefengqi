import { BoxesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductVisual({ model, className }: { model: string; className?: string }) {
  return <div className={cn("product-visual relative grid aspect-square place-items-center overflow-hidden bg-white", className)} role="img" aria-label={`${model} product image placeholder`}><span className="absolute inset-x-0 top-0 h-1 bg-primary" /><div className="flex flex-col items-center gap-4 text-center text-muted-foreground"><span className="grid size-16 place-items-center rounded-full border bg-background"><BoxesIcon aria-hidden /></span><span className="font-mono text-xs tracking-wider">{model}</span></div></div>;
}
