import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import homeIcon from "../../assets/menu/home.png";
import MenuOverlay from "../Menu/MenuOverlay";
import AuthOverlay from "../Auth/AuthOverlay";
import { useAuth } from "../../contexts/AuthContext";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { User, LogOut } from "lucide-react";

export default function Header({
  currentLang,
  setCurrentLang,
  isPlanetActive,
  isMenuOpen,
  onMenuToggle,
  onReset,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData, loading } = useAuth();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    window.innerWidth < window.innerHeight,
  );
  const [titleHovered, setTitleHovered] = useState(false);
  const [langHovered, setLangHovered] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [userHovered, setUserHovered] = useState(false);
  const [logoutHovered, setLogoutHovered] = useState(false);

  useEffect(() => {
    const handleResize = () =>
      setIsPortrait(window.innerWidth < window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const handleProfileClick = () => {
    if (loading) return;
    if (!currentUser) {
      setIsAuthOpen(true);
    } else if (userData?.role === "admin") {
      navigate("/admin-sinneskueche");
    } else {
      navigate("/profile");
    }
  };

  const hoverTransition =
    "transform 0.2s ease, color 0.2s ease, filter 0.2s ease";
  const isLanding = location.pathname === "/";

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

  const langFontSize = isPortrait ? "0.85rem" : "1rem";
  const rightGap = isPortrait ? "0.8rem" : "1.5rem";
  const iconGap = isPortrait ? "0.6rem" : "1rem";
  const hamburgerSize = isPortrait
    ? { width: 18, height: 16 }
    : { width: 24, height: 20 };
  const hamburgerBarHeight = isPortrait ? 2.4 : 4;

  const isAdmin = userData?.role === "admin";

  return (
    <>
      <header
        style={{
          position: "fixed",
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
          pointerEvents: "none",
          gap: "1rem",
          background:
            isLanding && !isPortrait
              ? "transparent"
              : "linear-gradient(to bottom, #fffce3 0%, #fffce3 60%, #fffce30c 100%)",
        }}
      >
        <div
          style={{
            width: "50vw",
            display: "flex",
            alignItems: "center",
            pointerEvents: "auto",
          }}
        >
          {showTitle && (
            <div
              onClick={() => {
                isLanding ? onReset?.() : navigate("/");
              }}
              onMouseEnter={() => !isPortrait && setTitleHovered(true)}
              onMouseLeave={() => !isPortrait && setTitleHovered(false)}
              style={{
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: titleFontSize,
                fontWeight: !isPortrait ? 700 : 400,
                display: "flex",
                alignItems: "center",
                color: titleHovered
                  ? "#9960a8"
                  : isPortrait && isLanding
                    ? "#1c0700"
                    : "#4e5f28",
                cursor: "pointer",
                transform: titleHovered ? "scale(1.05)" : "scale(1)",
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
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transform: titleHovered ? "scale(1.1)" : "scale(1)",
                transition: hoverTransition,
              }}
            >
              <img
                src={homeIcon}
                alt="Home"
                style={{
                  width: "28px",
                  height: "28px",
                  objectFit: "contain",
                  filter: titleHovered
                    ? "invert(46%) sepia(13%) saturate(2251%) hue-rotate(242deg) brightness(87%) contrast(81%)"
                    : "none",
                  transition: "filter 0.2s ease",
                }}
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: rightGap,
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: iconGap }}>
            <div
              onClick={handleProfileClick}
              onMouseEnter={() => setUserHovered(true)}
              onMouseLeave={() => setUserHovered(false)}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: userHovered ? "#9960a8" : "#4e5f28",
                transform: userHovered ? "scale(1.1)" : "scale(1)",
                transition: hoverTransition,
              }}
            >
              <User
                size={isPortrait ? 18 : 22}
                strokeWidth={isAdmin ? 2.5 : 2}
              />
            </div>

            {currentUser && (
              <div
                onClick={handleLogout}
                onMouseEnter={() => setLogoutHovered(true)}
                onMouseLeave={() => setLogoutHovered(false)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: logoutHovered ? "#9960a8" : "#4e5f28",
                  transform: logoutHovered ? "scale(1.1)" : "scale(1)",
                  transition: hoverTransition,
                }}
                title={currentLang === "en" ? "Sign Out" : "Abmelden"}
              >
                <LogOut size={isPortrait ? 16 : 20} strokeWidth={2} />
              </div>
            )}
          </div>

          <div
            onMouseEnter={() => setLangHovered(true)}
            onMouseLeave={() => setLangHovered(false)}
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
            className="hamburger-menu"
            onMouseEnter={() => setMenuHovered(true)}
            onMouseLeave={() => setMenuHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle(true);
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

      <AuthOverlay
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentLang={currentLang}
      />
      <MenuOverlay
        isOpen={isMenuOpen}
        onClose={() => onMenuToggle(false)}
        currentLang={currentLang}
      />
    </>
  );
}
