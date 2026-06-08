import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full text-[13px] px-3 py-2.5 rounded-xl border outline-none transition-all duration-150
            bg-white dark:bg-zinc-900
            border-zinc-200 dark:border-zinc-700
            text-zinc-900 dark:text-zinc-100
            placeholder:text-zinc-400 dark:placeholder:text-zinc-600
            focus:border-orange-400 dark:focus:border-orange-500 focus:ring-3 focus:ring-orange-500/10
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-500/10' : ''}
            ${leftIcon ? 'pl-9' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-red-500 flex items-center gap-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}
