import Link from "next/link";

import { ScryfallFooter } from "@/components/ScryfallFooter";
import { loadTournamentIndex } from "@/lib/tournaments";

export default function HomePage() {
  const { tournaments } = loadTournamentIndex();

  return (
    <div className="min-h-full bg-zinc-50/50 dark:bg-zinc-950">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-10 px-4 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Budenturnier stats
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Custom-format constructed events: card performance from Swiss + Top
          pairings and decklists.
        </p>
        <Link
          href="/methodology"
          className="mt-4 inline-block text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-100"
        >
          Methodology — how scores are calculated
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {tournaments.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/t/${t.slug}`}
              className="block rounded-xl border border-zinc-200/90 bg-white px-5 py-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/50"
            >
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {t.title}
              </span>
              <span className="ml-2 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {t.date}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <ScryfallFooter />
      </div>
    </div>
  );
}
