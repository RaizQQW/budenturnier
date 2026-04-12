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

  // Scale logo so the panels portion (bottom ~78%) fills 1200×630.
  // At 2055px wide the logo is 808px tall; bottom-aligning in a 630px
  // container hides the top 178px (text is ~161px) and shows only panels.
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} width={2055} style={{ marginLeft: -428 }} alt="" />
    </div>,
    { ...size },
  );
}
