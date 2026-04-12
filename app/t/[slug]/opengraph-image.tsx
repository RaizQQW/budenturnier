import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

import { loadTournamentIndex } from "@/lib/tournaments";
import type { TournamentMeta } from "@/lib/types";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const { tournaments } = loadTournamentIndex();
  return tournaments.map((t) => ({ slug: t.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const logoData = fs.readFileSync(
    path.join(process.cwd(), "public", "logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  const tournamentDir = path.join(process.cwd(), "data", "tournaments", slug);
  const meta: TournamentMeta = JSON.parse(
    fs.readFileSync(path.join(tournamentDir, "meta.json"), "utf8"),
  );
  const standings: { standings: { rank: number }[] } = JSON.parse(
    fs.readFileSync(path.join(tournamentDir, "standings.json"), "utf8"),
  );
  const playerCount = standings.standings.length;

  // Parse as UTC to avoid timezone-induced off-by-one day errors.
  const [y, mo, d] = meta.date.split("-").map(Number);
  const date = new Date(Date.UTC(y!, mo! - 1, d!)).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const details = [meta.format, `${playerCount} Players`, date]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Logo fills full width */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        style={{ width: 1200, height: 471, objectFit: "cover" }}
        alt=""
      />
      {/* Dark info strip */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#18181b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, color: "#f4f4f5" }}>
          {meta.title}
        </div>
        <div style={{ fontSize: 22, color: "#a1a1aa" }}>{details}</div>
      </div>
    </div>,
    { ...size },
  );
}
