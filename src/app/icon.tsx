import { ImageResponse } from "next/og";

/**
 * CobraAgent favicon — 2D cobra head on emerald gradient.
 * Built by OnyxAi.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Icon() {
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
          borderRadius: "7px",
          fontSize: 22,
          fontWeight: 700,
          color: "white",
        }}
      >
        🐍
      </div>
    ),
    { ...size },
  );
}
