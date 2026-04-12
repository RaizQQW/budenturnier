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
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        padding: "40px 64px",
        gap: 28,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} width={820} style={{ objectFit: "contain" }} alt="" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#18181b",
            letterSpacing: "-0.5px",
            textAlign: "center",
          }}
        >
          {meta.title}
        </div>
        <div style={{ fontSize: 26, color: "#71717a", textAlign: "center" }}>
          {details}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
