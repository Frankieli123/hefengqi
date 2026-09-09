import { BatteryChargingIcon, RadioTowerIcon, ServerIcon, ZapIcon } from "lucide-react";

export function HomeTechnicalVisual() {
  return (
    <div className="technical-grid relative min-h-110 overflow-hidden rounded-lg border bg-card p-8" aria-label="Communications and energy system diagram" role="img">
      <div className="absolute inset-x-10 top-1/2 h-px bg-border" />
      <div className="absolute inset-y-10 left-1/2 w-px bg-border" />
      <span className="absolute left-8 top-8 text-xs font-medium tracking-widest text-muted-foreground">SYSTEM / 01</span>
      <span className="absolute right-8 top-8 size-2 rounded-full bg-primary" />
      <div className="absolute left-[12%] top-[30%] grid size-18 place-items-center rounded-md border bg-background shadow-sm"><RadioTowerIcon /></div>
      <div className="absolute right-[13%] top-[26%] grid size-18 place-items-center rounded-md border bg-background shadow-sm"><ServerIcon /></div>
      <div className="absolute bottom-[18%] left-[20%] grid size-18 place-items-center rounded-md border bg-background shadow-sm"><BatteryChargingIcon /></div>
      <div className="absolute bottom-[16%] right-[18%] grid size-18 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm"><ZapIcon /></div>
      <div className="absolute left-1/2 top-1/2 flex size-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border bg-card shadow-sm"><strong className="text-xl tracking-wider">HFQ</strong><span className="text-[10px] tracking-[.2em] text-muted-foreground">INTEGRATION</span></div>
    </div>
  );
}
