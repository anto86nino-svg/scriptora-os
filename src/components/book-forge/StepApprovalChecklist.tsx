import { CheckCircle2, Circle } from "lucide-react";

export type ApprovalCheckItem = {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
};

type Props = {
  items: ApprovalCheckItem[];
};

export default function StepApprovalChecklist({ items }: Props) {
  const allDone = items.every((item) => item.done);

  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4">
      <p className="text-sm font-semibold text-white">
        Checklist approvazione {allDone ? "— pronta" : "— da completare"}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-xs">
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
            )}
            <div>
              <span className={item.done ? "text-emerald-50" : "text-white/75"}>{item.label}</span>
              {!item.done && item.hint && (
                <p className="mt-0.5 text-[10px] leading-4 text-white/45">{item.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function approvalChecklistComplete(items: ApprovalCheckItem[]): boolean {
  return items.length > 0 && items.every((item) => item.done);
}
