import Link from "next/link";

import { ScryfallFooter } from "@/components/ScryfallFooter";
import { loadTournamentIndex } from "@/lib/tournaments";

export default function HomePage() {
  const { tournaments } = loadTournamentIndex();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Budenturnier stats
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sealed / custom-format events: card performance from Swiss + Top 4
          pairings and decklists.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {tournaments.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/t/${t.slug}`}
              className="block rounded-lg border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/50"
            >
              <span className="font-medium">{t.title}</span>
              <span className="ml-2 text-sm text-zinc-500">{t.date}</span>
            </Link>
          </li>
        ))}
      </ul>

      <ScryfallFooter />
    </div>
  );
}
