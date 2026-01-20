export default function StudioName() {
  return (
    <div
      className="studio-name"
      style={{
        position: "absolute",
        left: "2vw",
        top: "50%",
        transform: "translateY(-50%)",
        writingMode: "sideways-lr",
        textOrientation: "mixed",
        fontFamily: "Harmond-SemiBoldCondensed",
        fontSize: "clamp(5vh, 7vh, 9vh)",
        letterSpacing: "0.08em",
        color: "#1c0700",
        whiteSpace: "nowrap",
        zIndex: 3000,
        pointerEvents: "none",
      }}
    >
      Atelier Sinnesküche
    </div>
  );
}
