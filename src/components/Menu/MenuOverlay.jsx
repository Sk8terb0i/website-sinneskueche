import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { planets } from "../../data/planets";

/**
 * MENU DRAWER COMPONENT
 * - Adaptive blur: 1px on mobile, 4px on desktop.
 * - Text links for footer.
 * - Tap-friendly interactions for mobile.
 */

export default function MenuDrawer({ isOpen, onClose, currentLang }) {
  const navigate = useNavigate();

  const [isCoursesOpen, setIsCoursesOpen] = useState(true);
  const [isStudioOpen, setIsStudioOpen] = useState(true);

  const getPlanetIcon = (id) => {
    const planet = planets.find((p) => p.id === id);
    return planet ? planet.icon : { en: "", de: "" };
  };

  const menuData = useMemo(
    () => ({
      courses: [
        {
          text: { en: "pottery tuesdays", de: "pottery tuesdays" },
          link: "/pottery",
          icon: getPlanetIcon("touch"),
        },
        {
          text: { en: "singing lessons", de: "gesangsunterricht" },
          link: "/singing",
          icon: getPlanetIcon("hearing"),
        },
      ],
      infoAction: [
        {
          text: { en: "about  us", de: "über uns" },
          link: "/team",
          icon: getPlanetIcon("team"),
        },
        {
          text: { en: "location", de: "standort" },
          link: "/location",
          icon: getPlanetIcon("location"),
        },
        {
          text: { en: "rent our space", de: "raum mieten" },
          link: "/rent",
          icon: getPlanetIcon("rent"),
        },
        {
          text: { en: "contact", de: "kontakt" },
          link: "/contact",
          icon: getPlanetIcon("contact"),
        },
      ],
    }),
    [currentLang],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* SCRIM / BACKDROP */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(28, 7, 0, 0.15)",
          backdropFilter: isOpen
            ? isMobile
              ? "blur(1px)"
              : "blur(4px)"
            : "blur(0px)",
          WebkitBackdropFilter: isOpen
            ? isMobile
              ? "blur(1px)"
              : "blur(4px)"
            : "blur(0px)",
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transition:
            "opacity 0.5s ease, backdrop-filter 0.5s ease, -webkit-backdrop-filter 0.5s ease",
        }}
        onClick={onClose}
      />

      {/* MENU PANEL */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: isMobile ? "75vw" : "420px",
          height: "100%",
          minHeight: "100vh",
          overflowY: "auto",
          backgroundColor: "#fffce3",
          zIndex: 9999,
          boxShadow: "-10px 0 50px rgba(28, 7, 0, 0.08)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          padding: isMobile ? "1.5rem 2rem" : "3rem 4rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "2rem",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#1c0700",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "Satoshi",
              fontSize: "0.85rem",
              textTransform: "lowercase",
            }}
          >
            <span>{currentLang === "en" ? "close" : "schließen"}</span>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ flex: "1 0 auto" }}>
          <Section
            title={currentLang === "en" ? "Courses" : "Kurse"}
            isOpen={isCoursesOpen}
            toggle={() => setIsCoursesOpen(!isCoursesOpen)}
          >
            {menuData.courses.map((item, i) => (
              <MenuLink
                key={i}
                item={item}
                lang={currentLang}
                onNavigate={(p) => {
                  navigate(p);
                  onClose();
                }}
              />
            ))}
          </Section>

          <div style={{ height: "1rem" }} />

          <Section
            title={currentLang === "en" ? "The Atelier" : "Das Atelier"}
            isOpen={isStudioOpen}
            toggle={() => setIsStudioOpen(!isStudioOpen)}
          >
            {menuData.infoAction.map((item, i) => (
              <MenuLink
                key={i}
                item={item}
                lang={currentLang}
                onNavigate={(p) => {
                  navigate(p);
                  onClose();
                }}
              />
            ))}
          </Section>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "3rem",
            paddingBottom: "3rem",
            paddingTop: "2rem",
            borderTop: "1px solid rgba(28, 7, 0, 0.05)",
            flexShrink: 0,
          }}
        >
          <a
            href="https://www.instagram.com/sinneskueche/"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#caaff3",
              transition: "color 0.3s",
              textDecoration: "none",
              fontFamily: "Satoshi",
              fontSize: "1rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#9960a8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#caaff3")}
          >
            instagram
          </a>
          <a
            href="mailto:hallo@sinneskueche.de"
            style={{
              color: "#caaff3",
              transition: "color 0.3s",
              textDecoration: "none",
              fontFamily: "Satoshi",
              fontSize: "1rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#9960a8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#caaff3")}
          >
            hallo@sinneskueche.de
          </a>
        </div>
      </div>

      <style>{`
        @keyframes hintPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </>
  );
}

function Section({ title, children, isOpen, toggle }) {
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleToggle = () => {
    if (!hasInteracted) setHasInteracted(true);
    toggle();
  };

  const showPulse = !isOpen && !hasInteracted;

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.2rem",
          cursor: "pointer",
          padding: "0.5rem 0",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "10px",
            height: "10px",
            flexShrink: 0,
            marginLeft: "5px",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: isOpen ? "#caaff3" : "#1c0700",
              borderRadius: "50%",
              transition: "all 0.4s ease",
              transform: isOpen ? "scale(1.3)" : "scale(1)",
              zIndex: 2,
              position: "relative",
            }}
          />
          {showPulse && (
            <div
              style={{
                position: "absolute",
                inset: "-4px",
                border: "1px solid #1c0700",
                borderRadius: "50%",
                animation: "hintPulse 2s infinite ease-out",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        <h3
          style={{
            fontFamily: "Harmond-SemiBoldCondensed",
            fontSize: "2.1rem",
            color: "#1c0700",
            margin: 0,
            padding: 0,
            lineHeight: 1.1,
            textTransform: "lowercase",
            opacity: isOpen ? 1 : 0.7,
            transition: "opacity 0.3s ease",
          }}
        >
          {title}
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden", paddingLeft: "2.5rem" }}>
          <div
            style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateY(0)" : "translateY(-5px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
              transitionDelay: isOpen ? "0.1s" : "0s",
              paddingTop: "0.2rem",
              paddingBottom: "1rem",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MenuLink updated for mobile tap interaction
 */
function MenuLink({ item, lang, onNavigate }) {
  const [isActive, setIsActive] = useState(false);

  // Desktop hover logic
  const handleMouseEnter = () => setIsActive(true);
  const handleMouseLeave = () => setIsActive(false);

  // Mobile/Touch specific logic: triggers active state on press down
  const handlePointerDown = () => setIsActive(true);
  const handlePointerUp = () => setIsActive(false);

  return (
    <div
      onClick={() => onNavigate(item.link)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 0",
        cursor: "pointer",
        color: isActive ? "#9960a8" : "#4e5f28",
        transition: "all 0.2s ease",
        fontFamily: "Satoshi",
        textTransform: "lowercase",
        fontSize: "1.1rem",
        WebkitTapHighlightColor: "transparent", // Removes the grey box on mobile
      }}
    >
      {item.icon && (
        <img
          src={item.icon[lang]}
          alt=""
          style={{
            width: "30px",
            height: "30px",
            transition:
              "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            transform: isActive ? "scale(1.2) rotate(8deg)" : "scale(1)",
          }}
        />
      )}
      <span
        style={{
          transform: isActive ? "translateX(4px)" : "translateX(0)",
          transition: "transform 0.2s ease",
        }}
      >
        {item.text[lang]}
      </span>
    </div>
  );
}
