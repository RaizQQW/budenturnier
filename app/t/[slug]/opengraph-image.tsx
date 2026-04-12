import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

import { loadTournamentIndex } from "@/lib/tournaments";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const { tournaments } = loadTournamentIndex();
  return tournaments.map((t) => ({ slug: t.slug }));
}

export default async function Image() {
  const logoData = fs.readFileSync(
    path.join(process.cwd(), "public", "logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  // Zoom to 200 % width so the title text (top ~20 % of image) scrolls
  // off the top and only the 5-colour panels fill the frame.
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        backgroundImage: `url(${logoSrc})`,
        backgroundSize: "2400px auto",
        backgroundPosition: "center bottom",
        backgroundColor: "#ffffff",
      }}
    />,
    { ...size },
  );
}
