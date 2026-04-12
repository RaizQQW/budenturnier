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
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, color: "#f4f4f5" }}>
          Budenturnier Stats
        </div>
        <div style={{ fontSize: 24, color: "#71717a" }}>·</div>
        <div style={{ fontSize: 24, color: "#a1a1aa" }}>
          budenturnier.vercel.app
        </div>
      </div>
    </div>,
    { ...size },
  );
}
