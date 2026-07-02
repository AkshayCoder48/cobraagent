import { ImageResponse } from "next/og";

/**
 * CobraAgent apple touch icon — 2D cobra head on emerald gradient.
 * Built by OnyxAi.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981, #047857)",
          fontSize: 110,
        }}
      >
        🐍
      </div>
    ),
    { ...size },
  );
}
