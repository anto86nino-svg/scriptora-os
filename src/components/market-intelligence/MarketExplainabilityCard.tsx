import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { ExplainabilitySection } from "@/lib/market-intelligence/marketExplainability";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MarketExplainabilityCardProps {
  sections: ExplainabilitySection[];
  className?: string;
  defaultOpen?: boolean;
}

/** Compact expandable "Why this score?" — premium, not verbose. */
export function MarketExplainabilityCard({
  sections,
  className,
  defaultOpen = false,
}: MarketExplainabilityCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!sections.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("min-w-0", className)}>
      <CollapsibleTrigger
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/35"
        type="button"
      >
        <span className="text-[11px] font-semibold text-foreground/90">
          {t("market_explain_why_title")}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-2 space-y-3 px-1 pb-1">
          {sections.map((section) => (
            <div key={section.titleKey} className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t(section.titleKey)}
              </p>
              <ul className="space-y-0.5 text-[11px] leading-relaxed text-foreground/80">
                {section.bulletKeys.map((key) => (
                  <li key={key} className="flex gap-1.5 break-words">
                    <span className="shrink-0 text-muted-foreground">•</span>
                    <span className="min-w-0">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
