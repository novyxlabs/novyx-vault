import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "#0a0a0b",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 700,
            color: "#6366f1",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          N
        </div>
      </div>
    ),
    { ...size }
  );
}
