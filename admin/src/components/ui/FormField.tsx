import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, required, hint, error, className, children }: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const field = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: htmlFor,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.8125rem] font-medium text-(--color-charcoal)">
        {label}
        {required && <span className="text-(--color-error)"> *</span>}
      </label>
      {field}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-(--color-text-muted)">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-(--color-error)">
          {error}
        </p>
      )}
    </div>
  );
}
