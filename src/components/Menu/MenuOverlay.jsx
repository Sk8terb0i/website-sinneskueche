import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import { planets } from "../../data/planets";

export default function MenuOverlay({ isOpen, onClose, currentLang }) {
  const navigate = useNavigate();

  // 1. State for collapsing (Expanded by default)
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);
  const [isStudioOpen, setIsStudioOpen] = useState(true);

  const getPlanetIcon = (id) => {
    const planet = planets.find((p) => p.id === id);
    return planet ? planet.icon : { en: "", de: "" };
  };

  const menuData = useMemo(() => {
    return {
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
          text: { en: "get to know us", de: "das sind wir" },
          link: "/team",
          icon: getPlanetIcon("team"),
        },
        {
          text: { en: "how to find us :)", de: "so findest du uns :)" },
          link: "/location",
          icon: getPlanetIcon("location"),
        },
        {
          text: { en: "rent our space", de: "raum mieten" },
          link: "/rent",
          icon: getPlanetIcon("rent"),
        },
        {
          text: { en: "get in touch!", de: "melde dich!" },
          link: "/contact",
          icon: getPlanetIcon("contact"),
        },
      ],
    };
  }, [currentLang]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "unset";
    };
  }, [isOpen]);

  const labels = {
    courses: { en: "Courses", de: "Kurse" },
    studio: { en: "The Atelier", de: "Das Atelier" },
  };

  const isMobile = window.innerWidth < window.innerHeight;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(255, 252, 227, 0.98)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        transition:
          "transform 0.8s cubic-bezier(0.85, 0, 0.15, 1), visibility 0.8s",
        transform: isOpen ? "translateY(0)" : "translateY(-100%)",
        visibility: isOpen ? "visible" : "hidden",
        pointerEvents: isOpen ? "auto" : "none",
        padding: isMobile ? "1rem" : "2rem",
        overflowY: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "30px",
          right: "30px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          zIndex: 10000,
        }}
      >
        <span
          className="close-text"
          style={{
            fontFamily: "Satoshi",
            fontSize: "0.8rem",
            letterSpacing: "0.1em",
            color: "#1c0700",
            textTransform: "lowercase",
            opacity: 0, // Hidden by default
            transition: "opacity 0.3s ease",
          }}
        >
          {currentLang === "en" ? "close menu" : "menü schließen"}
        </span>
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#1c0700",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#caaff3";
            e.currentTarget.previousSibling.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#1c0700";
            e.currentTarget.previousSibling.style.opacity = "0";
          }}
        />
      </button>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "2rem" : "10rem",
          width: "100%",
          maxWidth: "1400px",
          justifyContent: "center",
          alignItems: "flex-start",
          opacity: isOpen ? 1 : 0,
          transition: "opacity 0.5s ease 0.2s",
        }}
      >
        {/* COURSES SECTION */}
        <div style={{ flex: 1, width: "100%" }}>
          <div
            style={{
              ...categoryHeaderContainerStyle(isOpen, 0),
              cursor: "pointer",
            }}
            onClick={() => setIsCoursesOpen(!isCoursesOpen)}
          >
            <h3 style={categoryHeaderStyle(isMobile)}>
              {labels.courses[currentLang]}
            </h3>
            <div style={orbitMarkerStyle(isOpen, 0, isCoursesOpen)} />
          </div>

          <div
            style={{
              maxHeight: isCoursesOpen ? "1400px" : "0px",
              opacity: isCoursesOpen ? 1 : 0,
              overflow: "hidden",
              transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              paddingTop: "40px",
              marginTop: "-40px",
            }}
          >
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {menuData.courses.map((item, i) => (
                <MenuLink
                  key={item.link}
                  item={item}
                  lang={currentLang}
                  isOpen={isOpen && isCoursesOpen}
                  index={i}
                  isMobile={isMobile}
                  baseDelay={0.2}
                  onNavigate={(path) => {
                    navigate(path);
                    onClose();
                  }}
                />
              ))}
            </ul>
          </div>
        </div>

        {/* STUDIO SECTION */}
        <div style={{ flex: 1, width: "100%" }}>
          <div
            style={{
              ...categoryHeaderContainerStyle(isOpen, 1),
              cursor: "pointer",
            }}
            onClick={() => setIsStudioOpen(!isStudioOpen)}
          >
            <h3 style={categoryHeaderStyle(isMobile)}>
              {labels.studio[currentLang]}
            </h3>
            <div style={orbitMarkerStyle(isOpen, 1, isStudioOpen)} />
          </div>

          <div
            style={{
              maxHeight: isStudioOpen ? "1400px" : "0px",
              opacity: isStudioOpen ? 1 : 0,
              overflow: "hidden",
              transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              paddingTop: "40px",
              marginTop: "-40px",
            }}
          >
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {menuData.infoAction.map((item, i) => (
                <MenuLink
                  key={item.link}
                  item={item}
                  lang={currentLang}
                  isOpen={isOpen && isStudioOpen}
                  index={i}
                  isMobile={isMobile}
                  baseDelay={0.3}
                  onNavigate={(path) => {
                    navigate(path);
                    onClose();
                  }}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div
        style={{
          position: isMobile ? "relative" : "absolute",
          bottom: isMobile ? "0" : "40px",
          marginTop: isMobile ? "3rem" : "0",
          opacity: isOpen ? 1 : 0,
          transition: "opacity 1s ease 0.8s",
          display: "flex",
          gap: "32px",
        }}
      >
        <a
          href="https://www.instagram.com/sinneskueche/"
          target="_blank"
          rel="noreferrer"
          style={footerLinkStyle}
        >
          <Instagram size={isMobile ? 22 : 28} strokeWidth={1.2} />
        </a>
        <a href="mailto:hallo@sinneskueche.de" style={footerLinkStyle}>
          <Mail size={isMobile ? 22 : 28} strokeWidth={1.2} />
        </a>
      </div>
    </div>
  );
}

// Sub-components and styles remain largely the same, but fixed the Orbit Marker logic
function MenuLink({
  item,
  lang,
  isOpen,
  index,
  baseDelay,
  onNavigate,
  isMobile,
}) {
  const planetSizePx = isMobile ? 55 : 80;
  const orbitRadius = isMobile ? 48 : 68;
  const moonSize = isMobile ? 14 : 20;
  const gap = isMobile ? 4 : 6;
  const marginBottom = isMobile ? "2.2rem" : "5rem";
  const isPlanetOnLeft = index % 2 === 0;
  const staggerOffset = isMobile ? "10%" : "15%";

  const pos = useMemo(() => {
    const angles = isPlanetOnLeft ? [65, 90, 115] : [245, 270, 300];
    const degree = angles[Math.floor(Math.random() * angles.length)];
    const radians = (degree - 90) * (Math.PI / 180);
    return {
      x: Math.cos(radians) * orbitRadius,
      y: Math.sin(radians) * orbitRadius,
    };
  }, [isPlanetOnLeft, orbitRadius]);

  const isMoonOnLeftOfPlanet = pos.x < 0;

  return (
    <li style={{ marginBottom, listStyle: "none", width: "100%" }}>
      <div
        onClick={() => onNavigate(item.link)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isPlanetOnLeft ? "flex-start" : "flex-end",
          paddingLeft: isPlanetOnLeft ? staggerOffset : "0",
          paddingRight: !isPlanetOnLeft ? staggerOffset : "0",
          cursor: "pointer",
          transition:
            "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s",
          transform: isOpen ? "translateY(0)" : "translateY(20px)",
          opacity: isOpen ? 1 : 0,
          transitionDelay: isOpen ? `${baseDelay + index * 0.05}s` : "0s",
          height: `${planetSizePx}px`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: `${planetSizePx}px`,
            height: `${planetSizePx}px`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${orbitRadius * 2}px`,
              height: `${orbitRadius * 2}px`,
              borderRadius: "50%",
              border: "1px dashed #1c0700",
              opacity: 0.15,
              transform: "translate(-50%, -50%)",
            }}
          />
          {item.icon && (
            <img
              src={item.icon[lang]}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                zIndex: 2,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              width: `${moonSize}px`,
              height: `${moonSize}px`,
              backgroundColor: "white",
              borderRadius: "50%",
              zIndex: 4,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              whiteSpace: "nowrap",
              fontFamily: "Satoshi, sans-serif",
              fontSize: isMobile ? "0.75rem" : "clamp(0.75rem, 2.5vw, 1rem)",
              color: "#4e5f28",
              textTransform: "lowercase",
              pointerEvents: "none",
              textAlign: isMoonOnLeftOfPlanet ? "right" : "left",
              transform: `translate(calc(${isMoonOnLeftOfPlanet ? "-100%" : "0%"} + ${pos.x + (isMoonOnLeftOfPlanet ? -(moonSize / 2 + gap) : moonSize / 2 + gap)}px), calc(-50% + ${pos.y}px))`,
            }}
          >
            {item.text[lang]}
          </span>
        </div>
      </div>
    </li>
  );
}

const categoryHeaderContainerStyle = (isOpen, idx) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "right",
  paddingRight: "5vw",
  marginBottom: "2rem",
  width: "100%",
  opacity: isOpen ? 1 : 0,
  transform: isOpen ? "translateY(0)" : "translateY(20px)",
  transition: `all 0.6s ease ${0.1 + idx * 0.1}s`,
});

const orbitMarkerStyle = (isOpen, idx, isSectionExpanded) => ({
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  backgroundColor: isSectionExpanded ? "#caaff3" : "#1c0700",
  marginLeft: "1.5rem",
  opacity: isOpen ? 0.6 : 0,
  transform: isOpen
    ? isSectionExpanded
      ? "scale(1)"
      : "scale(0.8) rotate(45deg)"
    : "scale(0)",
  transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`,
  boxShadow: isSectionExpanded ? "0 0 10px rgba(202, 175, 243, 0.4)" : "none",
});

const categoryHeaderStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "2.2rem" : "clamp(2.5rem, 10vw, 4.2rem)",
  color: "#1c0700",
  lineHeight: "1",
  whiteSpace: "nowrap",
  margin: 0,
});

const footerLinkStyle = {
  textDecoration: "none",
  color: "#caaff3",
  transition: "color 0.3s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
