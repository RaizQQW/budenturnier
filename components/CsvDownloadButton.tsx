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

export function CsvDownloadButton({
  filename,
  csv,
  label,
}: {
  filename: string;
  csv: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => download(filename, csv)}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
    >
      {label}
    </button>
  );
}
