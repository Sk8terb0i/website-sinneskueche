import sun_portrait from "../../assets/sun_portrait.png";

export default function SunPortrait({ style }) {
  return (
    <img
      src={sun_portrait}
      alt="Sun"
      style={{
        width: style?.width,
        height: style?.height,
        objectFit: "contain",
        cursor: "default",
      }}
    />
  );
}
