import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const logoData = fs.readFileSync(
    path.join(process.cwd(), "public", "logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  // Scale logo so the panels portion (bottom ~78 % of image) fills the
  // 512×512 square. The title text scrolls above the top edge.
  // Full image at target scale: 1669 × 656 px → bottom 512 px = panels only.
  return new ImageResponse(
    <div
      style={{
        width: 512,
        height: 512,
        backgroundImage: `url(${logoSrc})`,
        backgroundSize: "1669px 656px",
        backgroundPosition: "center bottom",
        backgroundColor: "#ffffff",
      }}
    />,
    { width: 512, height: 512 },
  );
}
