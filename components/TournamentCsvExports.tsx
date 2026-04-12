"use client";

function download(filename: string, text: string) {
  const blob = new Blob(["\uFEFF", text], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TournamentCsvExports({
  slug,
  bundles,
}: {
  slug: string;
  bundles: { label: string; filename: string; csv: string }[];
}) {
  if (bundles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {bundles.map((b) => (
        <button
          key={b.filename}
          type="button"
          onClick={() => download(`${slug}-${b.filename}`, b.csv)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
        >
          CSV · {b.label}
        </button>
      ))}
    </div>
  );
}
