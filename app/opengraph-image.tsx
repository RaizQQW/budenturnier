import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const logoData = fs.readFileSync(
    path.join(process.cwd(), "public", "logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

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
        gap: 32,
        padding: "48px 64px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} width={900} style={{ objectFit: "contain" }} alt="" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#18181b",
            letterSpacing: "-0.5px",
          }}
        >
          Tournament Stats
        </div>
        <div style={{ fontSize: 22, color: "#71717a" }}>
          budenturnier.vercel.app
        </div>
      </div>
    </div>,
    { ...size },
  );
}
