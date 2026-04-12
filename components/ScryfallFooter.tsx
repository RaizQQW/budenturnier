export function ScryfallFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
      Card imagery and data ©{" "}
      <a
        href="https://scryfall.com"
        className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
        target="_blank"
        rel="noreferrer"
      >
        Scryfall
      </a>
      , LLC. This site is not affiliated with Wizards of the Coast.
    </footer>
  );
}
