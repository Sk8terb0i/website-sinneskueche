import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function Header({ currentLang, setCurrentLang }) {
  const location = useLocation();
  const [isPortrait, setIsPortrait] = useState(
    window.innerWidth < window.innerHeight,
  );
  const [titleHovered, setTitleHovered] = useState(false);

  // Update portrait state on window resize
  useEffect(() => {
    const handleResize = () =>
      setIsPortrait(window.innerWidth < window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hoverTransition = "transform 0.2s ease, color 0.2s ease";

  return (
    <header
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100vw",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(12px, 2vw, 32px)",
        boxSizing: "border-box",
        zIndex: 4000,
        pointerEvents: "auto",
        gap: "1rem",
      }}
    >
      {/* Left container: title/home */}
      <div style={{ width: "50vw", display: "flex", alignItems: "center" }}>
        {/* Studio name clickable in all relevant cases */}
        {(location.pathname === "/" && isPortrait) ||
        location.pathname !== "/" ? (
          <a
            href="/"
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: "2rem",
              fontWeight: 700,
              textDecoration: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transform: titleHovered ? "scale(1.05)" : "scale(1)",
              transition: hoverTransition,
              color: titleHovered ? "#9960a8" : "#1c0700",
            }}
          >
            Atelier Sinnesküche
          </a>
        ) : null}
      </div>

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        {/* Language Toggle */}
        <div
          className="lang-toggle"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.color = "#9960a8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.color = "#4e5f28";
          }}
          onClick={() =>
            setCurrentLang((prev) => (prev === "en" ? "de" : "en"))
          }
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: "Satoshi, sans-serif",
            fontSize: "1rem",
            cursor: "pointer",
            color: "#4e5f28",
            userSelect: "none",
            transition: hoverTransition,
          }}
        >
          <span style={{ fontWeight: currentLang === "en" ? 700 : 400 }}>
            EN
          </span>
          <span style={{ margin: "0 0.25rem" }}>/</span>
          <span style={{ fontWeight: currentLang === "de" ? 700 : 400 }}>
            DE
          </span>
        </div>

        {/* Hamburger Menu */}
        <div
          className="hamburger-menu"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            const spans = e.currentTarget.querySelectorAll("span");
            spans.forEach((s) => (s.style.backgroundColor = "#9960a8"));
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            const spans = e.currentTarget.querySelectorAll("span");
            spans.forEach((s) => (s.style.backgroundColor = "#4e5f28"));
          }}
          onClick={() => console.log("Menu clicked")}
          style={{
            width: "24px",
            height: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "transform 0.2s ease",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: "block",
                height: "4px",
                width: "100%",
                backgroundColor: "#4e5f28",
                borderRadius: "2px",
                transition: "background-color 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
