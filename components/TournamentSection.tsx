import type { ReactNode } from "react";

export function TournamentSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-8 rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-5 py-6 shadow-sm sm:px-7 sm:py-7 dark:border-zinc-800/80 dark:bg-zinc-900/25">
      <div className="flex flex-col gap-3 border-b border-zinc-200/60 pb-5 dark:border-zinc-800/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          {aside ? (
            <div className="shrink-0 lg:pl-4">{aside}</div>
          ) : null}
        </div>
        {description ? (
          <div className="max-w-3xl text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-5 pt-5">{children}</div>
    </section>
  );
}
