import { FileX2 } from "lucide-react";

export function MatterSectionDisabled({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center">
      <FileX2 className="h-8 w-8 text-muted-foreground/50" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
