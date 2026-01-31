import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { planets, planetIcons } from "../../data/planets";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import AtelierCalendar from "../Calendar/AtelierCalendar";

// Import the dot icon
import dotIcon from "../../assets/planets/moon.png";

export default function MenuDrawer({ isOpen, onClose, currentLang }) {
  const navigate = useNavigate();
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);
  const [isStudioOpen, setIsStudioOpen] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [closeActive, setCloseActive] = useState(false);

  const [activeSenses, setActiveSenses] = useState([
    "sight",
    "touch",
    "hearing",
    "smell",
    "taste",
  ]);

  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, "events");
        const q = query(eventsCollection, orderBy("date", "asc"));
        const snapshot = await getDocs(q);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // 1. Calculate end of the current month (for courses)
        const endOfCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        );
        endOfCurrentMonth.setHours(23, 59, 59, 999);

        // 2. Calculate end of the month 6 months from now (for events)
        const endOfSixMonths = new Date(
          now.getFullYear(),
          now.getMonth() + 7,
          0,
        );
        endOfSixMonths.setHours(23, 59, 59, 999);

        const filtered = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => {
            const itemDate = new Date(item.date);

            // Basic check: skip past items
            if (itemDate < now) return false;

            // Logic: Courses only show this month
            if (item.type === "course") {
              return itemDate <= endOfCurrentMonth;
            }

            // Logic: Events show current month + 6 months
            if (item.type === "event") {
              return itemDate <= endOfSixMonths;
            }

            // Fallback for safety (shows this month if type is missing)
            return itemDate <= endOfCurrentMonth;
          });

        setUpcomingEvents(filtered);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    if (isOpen) fetchEvents();
  }, [isOpen]);

  const hasUpcomingEvents = upcomingEvents.length > 0;

  const toggleSense = (senseId) => {
    setActiveSenses((prev) =>
      prev.includes(senseId)
        ? prev.filter((id) => id !== senseId)
        : [...prev, senseId],
    );
  };

  const dotIconObj = { en: dotIcon, de: dotIcon, isDot: true };

  const menuData = useMemo(
    () => ({
      courses: [
        {
          text: { en: "pottery tuesdays", de: "pottery tuesdays" },
          link: "/pottery",
          senses: ["touch", "sight"],
          icon: dotIconObj,
        },
        {
          text: { en: "singing lessons", de: "gesangsunterricht" },
          link: "/singing",
          senses: ["hearing"],
          icon: dotIconObj,
        },
        {
          text: { en: "artistic vision", de: "artistic vision" },
          link: "/artistic-vision",
          senses: ["sight", "touch", "hearing", "smell", "taste"],
          icon: dotIconObj,
        },
        {
          text: { en: "extended voice lab", de: "extended voice lab" },
          link: "/extended-voice-lab",
          senses: ["hearing", "touch"],
          icon: dotIconObj,
        },
        {
          text: { en: "performing words", de: "performing words" },
          link: "/performing-words",
          senses: ["sight", "hearing"],
          icon: dotIconObj,
        },
        {
          text: { en: "singing basics weekend", de: "singing basics weekend" },
          link: "/singing-basics",
          senses: ["hearing"],
          icon: dotIconObj,
        },
        {
          text: { en: "get ink!", de: "get ink!" },
          link: "/get-ink",
          senses: ["touch", "sight"],
          icon: dotIconObj,
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

  const filteredCourses = menuData.courses.filter((course) =>
    course.senses.some((s) => activeSenses.includes(s)),
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
          width: isMobile ? "90vw" : "420px",
          height: "100dvh",
          backgroundColor: "#fffce3",
          zIndex: 9999,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          padding: isMobile ? "1rem 1.5rem" : "3rem 4rem",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingBottom: "1rem",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseActive(true)}
            onMouseLeave={() => setCloseActive(false)}
            style={{
              ...closeBtnStyle,
              color: closeActive ? "#9960a8" : "#1c0700",
              transition: "color 0.2s ease",
            }}
          >
            <span>{currentLang === "en" ? "close" : "schließen"}</span>
            <X size={18} />
          </button>
        </div>

        <div
          className="menu-scroll-container"
          style={{
            flexGrow: 1,
            overflowY: "auto",
            paddingRight: "5px",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "1rem" : "2rem",
          }}
        >
          <Section
            title={currentLang === "en" ? "Courses" : "Kurse"}
            isOpen={isCoursesOpen}
            toggle={() => setIsCoursesOpen(!isCoursesOpen)}
            isMobile={isMobile}
          >
            <div style={{ padding: isMobile ? "12px 0" : "15px 0" }}>
              <p style={filterLabelStyle}>
                {currentLang === "en"
                  ? "Filter by sense"
                  : "Nach Sinnen filtern"}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: isMobile ? "12px" : "14px",
                  alignItems: "center",
                }}
              >
                {Object.keys(planetIcons).map((senseId) => {
                  const isActive = activeSenses.includes(senseId);
                  return (
                    <img
                      key={senseId}
                      src={planetIcons[senseId].base}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSense(senseId);
                      }}
                      style={{
                        width: isMobile ? "24px" : "28px",
                        height: isMobile ? "24px" : "28px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        opacity: isActive ? 1 : 0.15,
                        filter: isActive ? "none" : "grayscale(100%)",
                        transform: isActive ? "scale(1.1)" : "scale(0.95)",
                      }}
                      alt={senseId}
                    />
                  );
                })}
              </div>
            </div>

            {filteredCourses.map((item, i) => (
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
              <div style={{ paddingTop: "0.5rem" }}>
                <AtelierCalendar
                  currentLang={currentLang}
                  isMobile={true}
                  events={upcomingEvents}
                />
              </div>
            </Section>
          )}
        </div>

        <div style={footerStyle}>
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
        .menu-scroll-container::-webkit-scrollbar { display: none; }
        .menu-scroll-container { -ms-overflow-style: none; scrollbar-width: none; }
        .footer-link { color: #caaff3; text-decoration: none; font-family: Satoshi; font-size: 0.9rem; transition: color 0.3s; width: fit-content; }
        .footer-link:hover { color: #9960a8; }
        @keyframes fadeInBlur { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </>
  );
}

function Section({ title, children, isOpen, toggle, isMobile }) {
  const [isSectionActive, setIsSectionActive] = useState(false);
  return (
    <div style={{ marginBottom: isMobile ? "0.8rem" : "1.5rem" }}>
      <div style={{ display: "flex" }}>
        <div
          onClick={toggle}
          onMouseEnter={() => setIsSectionActive(true)}
          onMouseLeave={() => setIsSectionActive(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.8rem",
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
              fontSize: isMobile ? "1.4rem" : "2rem",
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
          transition: "grid-template-rows 0.4s ease",
        }}
      >
        <div
          style={{
            overflow: "hidden",
            paddingLeft: "1.2rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function MenuLink({ item, lang, onNavigate, isMobile }) {
  const [isActive, setIsActive] = useState(false);
  const iconSrc = item.icon?.[lang] || item.icon?.base;

  return (
    <div
      onClick={() => onNavigate(item.link)}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: isMobile ? "6px 0" : "8px 0",
        cursor: "pointer",
        color: isActive ? "#9960a8" : "#4e5f28",
        fontFamily: "Satoshi",
        fontSize: isMobile ? "0.9rem" : "1.05rem",
        transition: "all 0.2s ease",
        transform: isActive ? "translateX(5px)" : "translateX(0)",
      }}
    >
      {iconSrc && (
        <img
          src={iconSrc}
          style={{
            width: "12px",
            height: "12px",
            opacity: 0.6,
            objectFit: "contain",
          }}
          alt=""
        />
      )}
      <span>{item.text[lang]}</span>
    </div>
  );
}

const filterLabelStyle = {
  fontFamily: "Satoshi",
  fontSize: "0.6rem",
  textTransform: "uppercase",
  opacity: 0.4,
  marginBottom: "8px",
  letterSpacing: "1px",
};
const closeBtnStyle = {
  background: "none",
  border: "none",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontFamily: "Satoshi",
  fontSize: "0.75rem",
  cursor: "pointer",
};
const footerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  borderTop: "1px solid rgba(28, 7, 0, 0.05)",
  paddingTop: "1rem",
  flexShrink: 0,
  marginTop: "1rem",
};
