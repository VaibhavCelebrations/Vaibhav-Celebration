"use client";

import { Check } from "lucide-react";

interface Step {
  label: string;
  description?: string;
}

interface CheckoutStepperProps {
  steps: Step[];
  currentStep: number;
}

export function CheckoutStepper({ steps, currentStep }: CheckoutStepperProps) {
  return (
    <div className="flex items-center justify-center w-full max-w-3xl mx-auto">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + Label */}
            <div className="flex flex-col items-center relative">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shrink-0 ${
                  isCompleted
                    ? "bg-mocha text-white shadow-md shadow-mocha/30"
                    : isActive
                    ? "bg-mocha text-white shadow-lg shadow-mocha/30 scale-110"
                    : "bg-cream-dark text-text-light border border-border-light"
                }`}
              >
                {isCompleted ? <Check size={18} /> : index + 1}
              </div>
              <span
                className={`hidden md:block absolute top-14 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isCompleted || isActive ? "text-charcoal" : "text-text-light"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 md:mx-3 relative">
                <div className="absolute inset-0 bg-border-light rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 bg-mocha rounded-full transition-all duration-700 ease-out"
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
