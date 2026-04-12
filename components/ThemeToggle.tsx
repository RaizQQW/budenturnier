"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getAppliedTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    localStorage.setItem("theme", "dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    localStorage.setItem("theme", "light");
  } else {
    root.classList.remove("dark", "light");
    localStorage.removeItem("theme");
    // Re-apply based on system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    }
  }
}

export function ThemeToggle() {
  const [applied, setApplied] = useState<"light" | "dark">("light");

  useEffect(() => {
    setApplied(getAppliedTheme());
  }, []);

  function toggle() {
    const next = applied === "dark" ? "light" : "dark";
    applyTheme(next);
    setApplied(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={applied === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={applied === "dark" ? "Light mode" : "Dark mode"}
      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {applied === "dark" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.42 1.41l-.71.71a1 1 0 11-1.42-1.41l.71-.71zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM4.22 15.78a1 1 0 001.42-1.41l-.71-.71a1 1 0 00-1.42 1.41l.71.71zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-6-7a1 1 0 110 2H3a1 1 0 110-2h1zm1.22-4.78a1 1 0 00-1.42 1.41l.71.71A1 1 0 005.93 4.93l-.71-.71zM15.07 4.93a1 1 0 00-1.41 1.41l.71.71a1 1 0 001.41-1.41l-.71-.71zM10 6a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
