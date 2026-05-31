import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import { Minimize2, Settings, Sparkles, X } from "lucide-react";

interface MobileWriterToolsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettings: () => void;
  onFocusMode: () => void;
  onCoach: () => void;
  onGenerateFullBook?: () => void;
  canGenerateFullBook?: boolean;
  isGenerating?: boolean;
}

export function MobileWriterToolsSheet({
  open,
  onOpenChange,
  onSettings,
  onFocusMode,
  onCoach,
  onGenerateFullBook,
  canGenerateFullBook = false,
  isGenerating = false,
}: MobileWriterToolsSheetProps) {
  const closeAnd = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="scriptora-mobile-tools-sheet rounded-t-[20px] border-white/10 bg-slate-950 pb-safe">
        <DrawerHeader className="border-b border-white/10 px-4 pb-3 pt-2 text-left">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className="text-base font-bold">{t("settings")}</DrawerTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ios-toolbar-button h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>
        <div className="space-y-1 p-2">
          {canGenerateFullBook && onGenerateFullBook && (
            <button
              type="button"
              onClick={() => closeAnd(onGenerateFullBook)}
              disabled={isGenerating}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.07] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
              {isGenerating ? t("generation_running") : t("generate_full_book")}
            </button>
          )}
          <button
            type="button"
            onClick={() => closeAnd(onFocusMode)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-white/[0.07]"
          >
            <Minimize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {t("focus_mode")}
          </button>
          <button
            type="button"
            onClick={() => closeAnd(onCoach)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-white/[0.07]"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            {t("ai_coach")}
          </button>
          <button
            type="button"
            onClick={() => closeAnd(onSettings)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-white/[0.07]"
          >
            <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
            {t("settings")}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
