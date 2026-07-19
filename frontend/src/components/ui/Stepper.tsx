export type Step = { id: string; label: string };

export function Stepper({
  steps,
  currentStepId,
}: {
  steps: Step[];
  currentStepId: string;
}) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStepId),
  );

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center sm:flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  done
                    ? "bg-[var(--color-success)] text-white"
                    : active
                      ? "bg-[var(--color-blush)] text-white"
                      : "bg-[var(--color-border)] text-[var(--color-ink-muted)]"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={`text-sm ${active ? "text-[var(--color-ink)] font-medium" : "text-[var(--color-ink-muted)]"}`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div className="mx-3 hidden h-px flex-1 bg-[var(--color-border)] sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
