"use client";

import { Check } from "lucide-react";
import { STEPS } from "./shared";

/** Progress through the package journey. Completed steps are links back; Checkout is reached from Review. */
export function BuilderStepper({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) {
  return (
    <nav aria-label="Progress" className="mb-8 md:mb-14">
      <ol className="flex items-center justify-center w-full max-w-3xl mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const Icon = step.icon;
          return (
            <li key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center relative">
                <button
                  type="button"
                  onClick={() => isCompleted && onStepClick(index)}
                  disabled={!isCompleted}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${step.label}${isCompleted ? " (completed, go back)" : ""}`}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2 ${
                    isCompleted
                      ? "bg-mocha text-white shadow-md cursor-pointer hover:scale-105"
                      : isActive
                        ? "bg-mocha text-white shadow-lg scale-110 ring-4 ring-mocha/15"
                        : "bg-cream-dark text-text-light border border-border-light cursor-default"
                  }`}
                >
                  {isCompleted ? <Check size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
                </button>
                <span
                  className={`hidden md:block absolute top-14 text-xs font-semibold whitespace-nowrap ${
                    isCompleted || isActive ? "text-charcoal" : "text-text-light"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 md:mx-3 relative" aria-hidden="true">
                  <div className="absolute inset-0 bg-border-light rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-mocha rounded-full transition-all duration-500"
                    style={{ width: isCompleted ? "100%" : "0%" }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="md:hidden text-center text-xs font-semibold text-mocha uppercase tracking-wider mt-3">
        Step {currentStep + 1} of {STEPS.length} · {STEPS[currentStep].label}
      </p>
    </nav>
  );
}
