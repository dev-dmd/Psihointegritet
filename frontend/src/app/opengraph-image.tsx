import { ImageResponse } from "next/og";

export const alt = "Psihointegritet — digitalni centar za mentalno zdravlje";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#F4F1EA",
        color: "#284235",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "72px",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 600 }}>Psihointegritet</div>
      <div
        style={{
          color: "#546A59",
          fontSize: 34,
          marginTop: 28,
          textAlign: "center",
        }}
      >
        Digitalni centar za mentalno zdravlje
      </div>
    </div>,
    size,
  );
}
