import type { ReactNode } from "react";

export function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
        <span
          aria-hidden
          className="inline-block text-xs text-zinc-400 transition-transform duration-200 group-open:rotate-90"
        >
          ▶
        </span>
        {title}
      </summary>
      <div className="border-t border-zinc-200/80 px-3 pb-4 pt-3 dark:border-zinc-800">
        {children}
      </div>
    </details>
  );
}
