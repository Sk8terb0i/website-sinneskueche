import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { planets } from "../../data/planets";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import AtelierCalendar from "../Calendar/AtelierCalendar";

// Import the dot icon
import dotIcon from "../../assets/planets/dot.png";

export default function MenuDrawer({ isOpen, onClose, currentLang }) {
  const navigate = useNavigate();
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);
  const [isStudioOpen, setIsStudioOpen] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [closeActive, setCloseActive] = useState(false);

  // 1. Logic inside the component
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, "events");
        const q = query(eventsCollection, orderBy("date", "asc"));
        const snapshot = await getDocs(q);
        const now = new Date().setHours(0, 0, 0, 0);

        const allUpcoming = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((event) => {
            const eventDate = new Date(event.date).setHours(0, 0, 0, 0);
            return eventDate >= now;
          });

        const limit = isMobile ? 3 : 8;
        setUpcomingEvents(allUpcoming.slice(0, limit));
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    if (isOpen) fetchEvents();
  }, [isOpen, isMobile]);

  const hasUpcomingEvents = upcomingEvents.length > 0;

  const getPlanetIcon = (id) => {
    const planet = planets.find((p) => p.id === id);
    if (!planet) return { en: "", de: "" };
    return planet.icon;
  };

  const dotIconObj = {
    en: dotIcon,
    de: dotIcon,
    isDot: true,
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
          text: { en: "about us", de: "über uns" },
          link: "/team",
          icon: dotIconObj,
        },
        {
          text: { en: "location", de: "standort" },
          link: "/location",
          icon: dotIconObj,
        },
        {
          text: { en: "rent our space", de: "raum mieten" },
          link: "/rent",
          icon: dotIconObj,
        },
        {
          text: { en: "contact", de: "kontakt" },
          link: "/contact",
          icon: dotIconObj,
        },
      ],
    }),
    [currentLang],
  );

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(28, 7, 0, 0.15)",
          backdropFilter: isOpen
            ? isMobile
              ? "blur(2px)"
              : "blur(6px)"
            : "blur(0px)",
          WebkitBackdropFilter: isOpen
            ? isMobile
              ? "blur(2px)"
              : "blur(6px)"
            : "blur(0px)",
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transition: "opacity 0.5s ease, backdrop-filter 0.5s ease",
          display: "flex",
          justifyContent: "flex-end",
          paddingRight: isMobile ? "0" : "440px",
        }}
        onClick={onClose}
      >
        {!isMobile && isOpen && hasUpcomingEvents && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "360px",
              height: "100dvh",
              padding: "5.85rem 3rem 3rem 3rem",
              backgroundColor: "rgba(255, 252, 227, 0.85)",
              borderRight: "1px solid rgba(28, 7, 0, 0.05)",
              boxShadow: "10px 0 30px rgba(28, 7, 0, 0.03)",
              animation: "fadeInBlur 1.2s forwards",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <Section
              title={currentLang === "en" ? "upcoming" : "termine"}
              isOpen={isCalendarOpen}
              toggle={() => setIsCalendarOpen(!isCalendarOpen)}
              isMobile={false}
            >
              <div style={{ paddingTop: "2.5rem" }}>
                <AtelierCalendar
                  currentLang={currentLang}
                  isMobile={false}
                  events={upcomingEvents}
                />
              </div>
            </Section>
          </div>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: isMobile ? "85vw" : "420px",
          height: "100dvh",
          backgroundColor: "#fffce3",
          zIndex: 9999,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          padding: isMobile
            ? "1.5rem 1.5rem 1rem 1.5rem"
            : "3rem 4rem 2rem 4rem",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Header Section */}
        <div
          style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}
        >
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseActive(true)}
            onMouseLeave={() => setCloseActive(false)}
            style={{
              ...closeBtnStyle,
              color: closeActive ? "#9960a8" : "#1c0700",
              // 2. Applying mobile padding here directly
              paddingBottom: isMobile ? "5vh" : "0px",
              transition: "color 0.2s ease",
            }}
          >
            <span>{currentLang === "en" ? "close" : "schließen"}</span>
            <X size={18} />
          </button>
        </div>

        <div style={{ flexGrow: isMobile ? 0.5 : 1 }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "1.5rem" : "2.5rem",
            flexShrink: 0,
          }}
        >
          <Section
            title={currentLang === "en" ? "Courses" : "Kurse"}
            isOpen={isCoursesOpen}
            toggle={() => setIsCoursesOpen(!isCoursesOpen)}
            isMobile={isMobile}
          >
            {menuData.courses.map((item, i) => (
              <MenuLink
                key={i}
                item={item}
                lang={currentLang}
                isMobile={isMobile}
                onNavigate={(p) => {
                  navigate(p);
                  onClose();
                }}
              />
            ))}
          </Section>

          <Section
            title={currentLang === "en" ? "The Atelier" : "Das Atelier"}
            isOpen={isStudioOpen}
            toggle={() => setIsStudioOpen(!isStudioOpen)}
            isMobile={isMobile}
          >
            {menuData.infoAction.map((item, i) => (
              <MenuLink
                key={i}
                item={item}
                lang={currentLang}
                isMobile={isMobile}
                onNavigate={(p) => {
                  navigate(p);
                  onClose();
                }}
              />
            ))}
          </Section>

          {isMobile && hasUpcomingEvents && (
            <Section
              title={currentLang === "en" ? "Upcoming" : "Termine"}
              isOpen={isCalendarOpen}
              toggle={() => setIsCalendarOpen(!isCalendarOpen)}
              isMobile={isMobile}
            >
              <div style={{ paddingTop: "0.2rem" }}>
                <AtelierCalendar
                  currentLang={currentLang}
                  isMobile={true}
                  events={upcomingEvents}
                />
              </div>
            </Section>
          )}
        </div>

        <div style={{ flexGrow: 2 }} />

        <div
          style={{
            ...footerStyle,
            paddingBottom: isMobile ? "1rem" : "1.5rem",
            flexShrink: 0,
          }}
        >
          <a
            href="https://instagram.com/sinneskueche/"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            instagram
          </a>
          <a href="mailto:hallo@sinneskueche.de" className="footer-link">
            hallo@sinneskueche.de
          </a>
        </div>
      </div>

      <style>{`
        .footer-link { color: #caaff3; text-decoration: none; font-family: Satoshi; font-size: 0.95rem; transition: color 0.3s; width: fit-content; }
        .footer-link:hover { color: #9960a8; }
        @keyframes fadeInBlur { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </>
  );
}

// Sub-components and styles kept clean
function Section({ title, children, isOpen, toggle, isMobile }) {
  const [isSectionActive, setIsSectionActive] = useState(false);
  return (
    <div style={{ marginBottom: "0.5vh" }}>
      <div style={{ display: "flex" }}>
        <div
          onClick={toggle}
          onMouseEnter={() => setIsSectionActive(true)}
          onMouseLeave={() => setIsSectionActive(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "1rem",
            cursor: "pointer",
            padding: "0.2rem 0",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              backgroundColor:
                isSectionActive || isOpen ? "#caaff3" : "#1c0700",
              borderRadius: "50%",
              transition: "all 0.4s ease",
              flexShrink: 0,
            }}
          />
          <h3
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: isMobile ? "1.6rem" : "2rem",
              margin: 0,
              textTransform: "lowercase",
              opacity: isOpen || isSectionActive ? 1 : 0.7,
              color: isSectionActive ? "#9960a8" : "#1c0700",
              transition: "all 0.2s ease",
            }}
          >
            {title}
          </h3>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.5s ease",
        }}
      >
        <div style={{ overflow: "hidden", paddingLeft: "1.5rem" }}>
          <div
            style={{
              opacity: isOpen ? 1 : 0,
              transition: "opacity 0.4s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuLink({ item, lang, onNavigate, isMobile }) {
  const [isActive, setIsActive] = useState(false);
  const iconSize = item.icon?.isDot
    ? isMobile
      ? "14px"
      : "18px"
    : isMobile
      ? "22px"
      : "28px";

  return (
    <div style={{ display: "flex" }}>
      <div
        onClick={() => onNavigate(item.link)}
        onMouseEnter={() => setIsActive(true)}
        onMouseLeave={() => setIsActive(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: isMobile ? "4px 0" : "8px 0",
          cursor: "pointer",
          color: isActive ? "#9960a8" : "#4e5f28",
          fontFamily: "Satoshi",
          fontSize: isMobile ? "0.95rem" : "1.05rem",
          transition: "all 0.2s ease",
          transform: isActive ? "translateX(5px)" : "translateX(0)",
        }}
      >
        {item.icon && (
          <img
            src={item.icon[lang]}
            alt=""
            style={{
              width: iconSize,
              height: iconSize,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        )}
        <span>{item.text[lang]}</span>
      </div>
    </div>
  );
}

// Fixed Styles
const closeBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontFamily: "Satoshi",
  fontSize: "0.8rem",
  textTransform: "lowercase",
};

const footerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "8px",
  borderTop: "1px solid rgba(28, 7, 0, 0.05)",
  flexShrink: 0,
  paddingTop: "1rem",
};
