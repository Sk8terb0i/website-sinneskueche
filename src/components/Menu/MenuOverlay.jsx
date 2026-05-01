import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronDown, ChevronRight } from "lucide-react";
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

  // State to track which months are expanded
  const [expandedMonths, setExpandedMonths] = useState({});

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [closeActive, setCloseActive] = useState(false);
  const [courseVisibility, setCourseVisibility] = useState({});
  const [courseSettings, setCourseSettings] = useState({}); // NEW: Save settings for the nav menu

  const [activeSenses, setActiveSenses] = useState([
    "sight",
    "touch",
    "hearing",
    "smell",
    "taste",
  ]);

  const isMobile = window.innerWidth < 768;

  // Reset the states whenever the menu is closed
  useEffect(() => {
    if (!isOpen) {
      setExpandedMonths({});
    } else {
      setIsCoursesOpen(true);
      setIsStudioOpen(true);
      setIsCalendarOpen(true);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchData = async () => {
      let visibilityMap = {};
      let settingsMap = {};
      let bookingCounts = {};

      try {
        const settingsSnap = await getDocs(collection(db, "course_settings"));
        settingsSnap.docs.forEach((doc) => {
          const data = doc.data();
          visibilityMap[doc.id] = data.isVisible !== false;
          settingsMap[doc.id] = data;
        });
        setCourseVisibility(visibilityMap);
        setCourseSettings(settingsMap); // NEW: Save map to state
      } catch (error) {
        console.warn("Could not fetch course settings:", error);
      }

      try {
        const countsSnap = await getDocs(collection(db, "bookings"));
        countsSnap.docs.forEach((doc) => {
          const eventId = doc.data().eventId;
          if (eventId) {
            bookingCounts[eventId] = (bookingCounts[eventId] || 0) + 1;
          }
        });
      } catch (error) {
        console.warn("Could not fetch bookings:", error);
      }

      try {
        const eventsCollection = collection(db, "events");
        const q = query(eventsCollection, orderBy("date", "asc"));
        const snapshot = await getDocs(q);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const endOfCurrentYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        const endOfNextMonth = new Date(
          currentYear,
          currentMonth + 2,
          0,
          23,
          59,
          59,
          999,
        );

        const futureItems = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              type:
                data.type ||
                (data.link?.startsWith("http") ? "event" : "course"),
            };
          })
          .filter((item) => new Date(item.date) >= now);

        const availableItems = futureItems
          .map((event) => {
            if (!event.link) return event;
            const courseId = event.link.replace(/\//g, "");
            const pricing = settingsMap[courseId];

            // If Firestore has a custom name, overwrite the event title
            if (pricing) {
              const customName =
                currentLang === "en" ? pricing.nameEn : pricing.nameDe;
              if (customName) {
                return {
                  ...event,
                  title:
                    typeof event.title === "object"
                      ? { ...event.title, [currentLang]: customName }
                      : customName,
                };
              }
            }
            return event;
          })
          .filter((event) => {
            if (!event.link) return true;
            const courseId = event.link.replace(/\//g, "");
            if (event.type === "course" && visibilityMap[courseId] === false) {
              return false;
            }
            const pricing = settingsMap[courseId];
            const isFull =
              pricing?.hasCapacity &&
              (bookingCounts[event.id] || 0) >=
                parseInt(pricing.capacity || 99);

            return !isFull;
          });

        const rawEvents = availableItems.filter(
          (item) => item.type === "event",
        );
        const rawCourses = availableItems.filter(
          (item) => item.type === "course" || !item.type,
        );

        const filteredEvents = rawEvents.filter(
          (item) => item.date && new Date(item.date) <= endOfCurrentYear,
        );

        const filteredCourses = rawCourses.filter((course) => {
          if (!course.date) return false;
          return new Date(course.date) <= endOfNextMonth;
        });

        const combined = [...filteredCourses, ...filteredEvents].sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );

        setUpcomingEvents(combined);
      } catch (error) {
        console.error("Error fetching menu events:", error);
      }
    };

    if (isOpen) fetchData();
  }, [isOpen]);

  const hasUpcomingEvents = upcomingEvents.length > 0;

  const groupedEvents = useMemo(() => {
    const groups = [];
    upcomingEvents.forEach((ev) => {
      const d = new Date(ev.date);
      const monthName = d.toLocaleString(
        currentLang === "de" ? "de-DE" : "en-US",
        { month: "long" },
      );
      const year = d.getFullYear();
      const monthYear = `${monthName} ${year}`;

      let lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.monthYear === monthYear) {
        lastGroup.events.push(ev);
      } else {
        groups.push({ monthYear, events: [ev] });
      }
    });
    return groups;
  }, [upcomingEvents, currentLang]);

  // Initialize the first 3 months to be open by default
  useEffect(() => {
    if (isOpen && groupedEvents.length > 0) {
      setExpandedMonths((prev) => {
        if (Object.keys(prev).length === 0) {
          const initial = {};
          groupedEvents.forEach((g, idx) => {
            initial[g.monthYear] = idx < 3;
          });
          return initial;
        }
        return prev;
      });
    }
  }, [isOpen, groupedEvents]);

  const toggleMonth = (monthYear) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthYear]: !prev[monthYear],
    }));
  };

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
          text: { en: "Pottery Tuesdays", de: "Pottery Tuesdays" },
          link: "/pottery",
          senses: ["touch", "sight"],
          icon: dotIconObj,
        },
        {
          text: { en: "Vocal Coaching", de: "Gesangscoaching" },
          link: "/singing",
          senses: ["hearing"],
          icon: dotIconObj,
        },
        {
          text: { en: "Artistic Vision", de: "Artistic Vision" },
          link: "/artistic-vision",
          senses: ["sight", "touch", "hearing", "smell", "taste"],
          icon: dotIconObj,
        },
        {
          text: { en: "Extended voice lab", de: "Extended voice lab" },
          link: "/extended-voice-lab",
          senses: ["hearing", "touch"],
          icon: dotIconObj,
        },
        {
          text: { en: "Performing words", de: "Performing words" },
          link: "/performing-words",
          senses: ["sight", "hearing"],
          icon: dotIconObj,
        },
        {
          text: { en: "Singing basics weekend", de: "Singing basics weekend" },
          link: "/singing-basics",
          senses: ["hearing"],
          icon: dotIconObj,
        },
        {
          text: { en: "get ink!", de: "Get ink!" },
          link: "/get-ink",
          senses: ["touch", "sight"],
          icon: dotIconObj,
        },
      ].map((course) => {
        // Look up the custom name from our fetched settings
        const sanitizedId = course.link.replace(/\//g, "");
        const customEn = courseSettings[sanitizedId]?.nameEn;
        const customDe = courseSettings[sanitizedId]?.nameDe;

        return {
          ...course,
          text: {
            en: customEn || course.text.en,
            de: customDe || course.text.de,
          },
        };
      }),
      infoAction: [
        {
          text: { en: "About us", de: "Über uns" },
          link: "/team",
          icon: dotIconObj,
        },
        {
          text: { en: "Location", de: "Standort" },
          link: "/location",
          icon: dotIconObj,
        },
        {
          text: { en: "Rent our space", de: "Raum mieten" },
          link: "/rent",
          icon: dotIconObj,
        },
        {
          text: { en: "Contact", de: "Kontakt" },
          link: "/contact",
          icon: dotIconObj,
        },
        {
          text: { en: "Gallery", de: "Galerie" },
          link: "/gallery",
          icon: dotIconObj,
        },
      ],
    }),
    [currentLang, courseSettings],
  );

  const displayItems = useMemo(() => {
    let results = [];
    const seenLinks = new Set();
    const potentialFallbacks = [];

    activeSenses.forEach((senseId) => {
      const visibleForSense = menuData.courses.filter((course) => {
        const courseId = course.link.replace(/\//g, "");
        return (
          course.senses.includes(senseId) &&
          courseVisibility[courseId] !== false
        );
      });

      if (visibleForSense.length > 0) {
        visibleForSense.forEach((c) => {
          if (!seenLinks.has(c.link)) {
            results.push(c);
            seenLinks.add(c.link);
          }
        });
      } else {
        const planetData = planets.find((p) => p.id === senseId);
        if (planetData?.fallback) {
          potentialFallbacks.push(planetData.fallback);
        }
      }
    });

    if (results.length > 0) return results;

    if (potentialFallbacks.length > 0) {
      const randomIndex = Math.floor(Math.random() * potentialFallbacks.length);
      return [potentialFallbacks[randomIndex]];
    }

    return [];
  }, [activeSenses, courseVisibility, menuData.courses]);

  // Restored clean standard overflow locking
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
        {/* DESKTOP CALENDAR PANEL */}
        {!isMobile && isOpen && hasUpcomingEvents && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "360px",
              height: "100dvh",
              // 1. CHANGED: Removed top and bottom padding from the outer wrapper
              padding: "0 0 0 3rem",
              backgroundColor: "rgba(255, 252, 227, 0.85)",
              borderRight: "1px solid rgba(28, 7, 0, 0.05)",
              boxShadow: "10px 0 30px rgba(28, 7, 0, 0.03)",
              animation: "fadeInBlur 1.2s forwards",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            {/* 2. CHANGED: Moved the top and bottom padding here so the container spans 100vh */}
            <div
              className="menu-scroll-container"
              style={{
                flexGrow: 1,
                overflowY: "auto",
                paddingTop: "5.85rem",
                paddingBottom: "3rem",
                paddingRight: "3rem",
              }}
            >
              <Section
                title={currentLang === "en" ? "Upcoming" : "Termine"}
                isOpen={isCalendarOpen}
                toggle={() => setIsCalendarOpen(!isCalendarOpen)}
                isMobile={false}
              >
                <div style={{ paddingTop: "1.5rem" }}>
                  {groupedEvents.map((group, idx) => {
                    const isExpanded = expandedMonths[group.monthYear];
                    return (
                      <div key={idx} style={{ marginBottom: "1rem" }}>
                        <div
                          onClick={() => toggleMonth(group.monthYear)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            borderBottom: "1px solid rgba(153, 96, 168, 0.2)",
                            paddingBottom: "6px",
                            marginBottom: "10px",
                          }}
                        >
                          <h4 style={monthHeaderStyle(isMobile)}>
                            {group.monthYear}
                          </h4>
                          {isExpanded ? (
                            <ChevronDown size={16} color="#9960a8" />
                          ) : (
                            <ChevronRight size={16} color="#9960a8" />
                          )}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateRows: isExpanded ? "1fr" : "0fr",
                            transition: "grid-template-rows 0.3s ease",
                          }}
                        >
                          <div style={{ overflow: "hidden" }}>
                            <AtelierCalendar
                              currentLang={currentLang}
                              isMobile={false}
                              events={group.events}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>
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

        {/* RIGHT DRAWER SCROLL CONTAINER */}
        <div
          className="menu-scroll-container"
          style={{
            flexGrow: 1,
            overflowY: "auto",
            marginRight: isMobile ? "-1.5rem" : "0", // Schiebt den Scroll-Container ganz nach rechts an den Rand
            paddingRight: isMobile ? "1.5rem" : "5px", // Hält die Inhalte weiterhin an der korrekten Position
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

            {displayItems.map((item, i) => (
              <MenuLink
                key={i}
                item={item}
                lang={currentLang}
                isMobile={isMobile}
                onNavigate={(p) => {
                  if (p) {
                    navigate(p);
                    onClose();
                  }
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
                {groupedEvents.map((group, idx) => {
                  const isExpanded = expandedMonths[group.monthYear];
                  return (
                    <div key={idx} style={{ marginBottom: "1rem" }}>
                      <div
                        onClick={() => toggleMonth(group.monthYear)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          borderBottom: "1px solid rgba(153, 96, 168, 0.2)",
                          paddingBottom: "6px",
                          marginBottom: "10px",
                        }}
                      >
                        <h4 style={monthHeaderStyle(isMobile)}>
                          {group.monthYear}
                        </h4>
                        {isExpanded ? (
                          <ChevronDown size={16} color="#9960a8" />
                        ) : (
                          <ChevronRight size={16} color="#9960a8" />
                        )}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateRows: isExpanded ? "1fr" : "0fr",
                          transition: "grid-template-rows 0.3s ease",
                        }}
                      >
                        <div style={{ overflow: "hidden" }}>
                          <AtelierCalendar
                            currentLang={currentLang}
                            isMobile={true}
                            events={group.events}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        <div style={footerStyle}>
          <a
            href="https://www.instagram.com/sinneskueche/"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            instagram
          </a>
          <a href="mailto:salut@sinneskueche.de" className="footer-link">
            salut@sinneskueche.de
          </a>
        </div>
      </div>

      <style>{`
        /* Proper overscroll containment applied purely through CSS */
        .menu-scroll-container { 
          scrollbar-width: thin; 
          scrollbar-color: #caaff3 rgba(28, 7, 0, 0.05); 
          overscroll-behavior: contain; 
          -webkit-overflow-scrolling: touch; 
        }
        .menu-scroll-container::-webkit-scrollbar { width: 4px; }
        .menu-scroll-container::-webkit-scrollbar-track { 
          background: rgba(28, 7, 0, 0.05); 
          border-radius: 10px; 
        }
        .menu-scroll-container::-webkit-scrollbar-thumb { 
          background: #caaff3; 
          border-radius: 10px; 
        }

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

  const isFallback = item.isItalic;

  return (
    <div
      onClick={() => !isFallback && onNavigate(item.link)}
      onMouseEnter={() => !isFallback && setIsActive(true)}
      onMouseLeave={() => !isFallback && setIsActive(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: isMobile ? "6px 0" : "8px 0",
        cursor: isFallback ? "default" : "pointer",
        color: isFallback ? "#1c070099" : isActive ? "#9960a8" : "#4e5f28",
        fontFamily: "Satoshi",
        fontStyle: isFallback ? "italic" : "normal",
        fontSize: isMobile ? "0.9rem" : "1.05rem",
        transition: "all 0.2s ease",
        transform:
          !isFallback && isActive ? "translateX(5px)" : "translateX(0)",
      }}
    >
      {!isFallback && iconSrc && (
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

const monthHeaderStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontWeight: isMobile ? "normal" : "bold",
  fontSize: "1.1rem",
  color: "#9960a8",
  margin: 0,
});

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
