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
        backgroundColor: "#18181b",
        display: "flex",
        alignItems: "center",
        padding: "0 80px",
        gap: 64,
      }}
    >
      {/* Scaled-up icon — panels only, text cropped off the top */}
      <div
        style={{
          width: 420,
          height: 420,
          flexShrink: 0,
          backgroundImage: `url(${logoSrc})`,
          backgroundSize: "1350px auto",
          backgroundPosition: "center bottom",
          backgroundColor: "#ffffff",
          borderRadius: 16,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#f4f4f5",
            lineHeight: 1.05,
          }}
        >
          Budenturnier
        </div>
        <div style={{ fontSize: 42, color: "#a1a1aa", fontWeight: 400 }}>
          Metagame Explorer
        </div>
      </div>
    </div>,
    { ...size },
  );
}
