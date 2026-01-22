import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HouseHeart } from "lucide-react";

export default function Header({
  currentLang,
  setCurrentLang,
  isPlanetActive,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isPortrait, setIsPortrait] = useState(
    window.innerWidth < window.innerHeight,
  );
  const [titleHovered, setTitleHovered] = useState(false);
  const [langHovered, setLangHovered] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);

  useEffect(() => {
    const handleResize = () =>
      setIsPortrait(window.innerWidth < window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hoverTransition = "transform 0.2s ease, color 0.2s ease";
  const isLanding = location.pathname === "/";

  // ----------------- Determine what to show on the left -----------------
  let showTitle = false;
  let showIcon = false;
  let titleFontSize = "2rem";

  if (isPortrait) {
    titleFontSize = "1.5rem";
    if (isLanding) {
      showTitle = isPlanetActive;
    } else {
      showIcon = true;
    }
  } else {
    titleFontSize = "2rem";
    if (isLanding) {
      showTitle = false;
      showIcon = false;
    } else {
      showTitle = true;
    }
  }

  // Right side styles
  const langFontSize = isPortrait ? "0.85rem" : "1rem";
  const rightGap = isPortrait ? "0.8rem" : "1.5rem";
  const hamburgerSize = isPortrait
    ? { width: 18, height: 16 }
    : { width: 24, height: 20 };
  const hamburgerBarHeight = isPortrait ? 2.4 : 4;

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
        {showTitle && (
          <div
            onClick={!isPortrait ? () => navigate("/") : undefined}
            onMouseEnter={() => !isPortrait && setTitleHovered(true)}
            onMouseLeave={() => !isPortrait && setTitleHovered(false)}
            // Touch events only trigger for title if NOT in portrait landing mode
            onTouchStart={() => !isPortrait && setTitleHovered(true)}
            onTouchEnd={() =>
              !isPortrait && setTimeout(() => setTitleHovered(false), 200)
            }
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: titleFontSize,
              fontWeight: !isPortrait ? 700 : 400,
              display: "flex",
              alignItems: "center",
              // Only apply the purple hover color if we are NOT in portrait
              color:
                !isPortrait && titleHovered
                  ? "#9960a8"
                  : isPortrait && isLanding
                    ? "#1c0700"
                    : "#4e5f28",
              cursor: !isPortrait ? "pointer" : "default",
              // Scale only applies to desktop/landscape
              transform:
                !isPortrait && titleHovered ? "scale(1.05)" : "scale(1)",
              transition: hoverTransition,
            }}
          >
            Atelier Sinnesküche
          </div>
        )}

        {showIcon && (
          <div
            onClick={() => navigate("/")}
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
            onTouchStart={() => setTitleHovered(true)}
            onTouchEnd={() => setTimeout(() => setTitleHovered(false), 200)}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transform: titleHovered ? "scale(1.05)" : "scale(1)",
              transition: hoverTransition,
              color: titleHovered ? "#9960a8" : "#4e5f28",
            }}
          >
            <HouseHeart size={26} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: rightGap }}>
        <div
          onMouseEnter={() => setLangHovered(true)}
          onMouseLeave={() => setLangHovered(false)}
          onTouchStart={() => setLangHovered(true)}
          onTouchEnd={() => setTimeout(() => setLangHovered(false), 200)}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentLang((prev) => (prev === "en" ? "de" : "en"));
          }}
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: "Satoshi, sans-serif",
            fontSize: langFontSize,
            cursor: "pointer",
            color: langHovered ? "#9960a8" : "#4e5f28",
            userSelect: "none",
            transition: hoverTransition,
            transform: langHovered ? "scale(1.1)" : "scale(1)",
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

        <div
          onMouseEnter={() => setMenuHovered(true)}
          onMouseLeave={() => setMenuHovered(false)}
          onTouchStart={() => setMenuHovered(true)}
          onTouchEnd={() => setTimeout(() => setMenuHovered(false), 200)}
          onClick={(e) => {
            e.stopPropagation();
            console.log("Menu clicked");
          }}
          style={{
            width: `${hamburgerSize.width}px`,
            height: `${hamburgerSize.height}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "transform 0.2s ease",
            transform: menuHovered ? "scale(1.1)" : "scale(1)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: "block",
                height: `${hamburgerBarHeight}px`,
                width: "100%",
                backgroundColor: menuHovered ? "#9960a8" : "#4e5f28",
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
