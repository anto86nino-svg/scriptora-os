import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import type { MollyBrainPanel } from "./MollyBrainPanel";

const MollyBrainPanelLazy = lazy(() =>
  import("./MollyBrainPanel").then((m) => ({ default: m.MollyBrainPanel })),
);

type Props = ComponentProps<typeof MollyBrainPanel>;

/** Loads Molly only on writing/study screens — not at app boot. */
export function LazyMollyBrainPanel(props: Props) {
  return (
    <FeatureErrorBoundary featureName="Molly">
      <Suspense fallback={null}>
        <MollyBrainPanelLazy {...props} />
      </Suspense>
    </FeatureErrorBoundary>
  );
}
