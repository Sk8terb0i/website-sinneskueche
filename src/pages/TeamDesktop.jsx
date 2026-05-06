import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";

// Components
import Orbit from "../components/Orbit/Orbit";
import Planet from "../components/Planet/PlanetTeam";
import Header from "../components/Header/Header";
// Removed StudioName import since we are using a custom local version
import Sun from "../components/Sun/Sun";
import Moon from "../components/Moon/Moon";

// Data & Helpers
import { languages } from "../i18n";
import { planets as initialPlanets } from "../data/teammembers";

export default function Teams({ currentLang, setCurrentLang }) {
  const navigate = useNavigate();

  const filteredInitialPlanets = initialPlanets.filter(
    (p) => p.type !== "home",
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePlanet, setActivePlanet] = useState(null);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [focusedPlanet, setFocusedPlanet] = useState(null);
  const [hoveredMoonPlanet, setHoveredMoonPlanet] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [isBioPanelHovered, setIsBioPanelHovered] = useState(false);
  const bioPanelRef = useRef(null);

  const handleClosePanel = (e) => {
    if (e) e.stopPropagation();
    setFocusedPlanet(null);
    setActivePlanet(null);
    setIsBioPanelHovered(false);
  };

  const [dynamicWidth, setDynamicWidth] = useState(380);
  const [isCalculating, setIsCalculating] = useState(false);

  // 1. Reset to base width immediately when a new planet is focused
  useEffect(() => {
    setDynamicWidth(380);
    if (focusedPlanet) {
      setIsCalculating(true);
    }
  }, [focusedPlanet]);

  // 2. The "Invisible" Calculation
  // This runs and re-renders BEFORE the browser paints the screen
  useLayoutEffect(() => {
    if (bioPanelRef.current && focusedPlanet && isCalculating) {
      const panel = bioPanelRef.current;

      // If content is too tall, jump up in large increments (100px)
      // to find the fit faster
      if (panel.scrollHeight > panel.clientHeight && dynamicWidth < 650) {
        setDynamicWidth((prev) => Math.min(prev + 100, 650));
      } else {
        // Calculation is done; turn transitions back on
        setIsCalculating(false);
      }
    }
  }, [focusedPlanet, dynamicWidth, isCalculating]);

  const [isSystemMounted, setIsSystemMounted] = useState(false);
  const [isInitialAnimationDone, setIsInitialAnimationDone] = useState(false);
  const [sunClicked, setSunClicked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Re-implemented your exact distribution logic within the planets state
  const [planets, setPlanets] = useState(() => {
    const orbitOrder = ["courses", "info", "action"];
    const assigned = [];

    filteredInitialPlanets.forEach((planet, index) => {
      const count = index + 1;
      let orbit;

      if (count <= 3) {
        orbit = "courses";
      } else if (count === 4) {
        if (assigned[1]) assigned[1].assignedOrbit = "info";
        if (assigned[2]) assigned[2].assignedOrbit = "info";
        orbit = "courses";
      } else if (count === 5 || count === 6) {
        orbit = "action";
      } else {
        orbit = orbitOrder[index % orbitOrder.length];
      }

      assigned.push({ ...planet, assignedOrbit: orbit });
    });
    return assigned;
  });

  const hoverTimeoutRef = useRef(null);
  const requestRef = useRef();
  const globalSpeedRef = useRef(1);

  const orbitSpeeds = { courses: 15, info: 10, action: 7 };
  const ringSlowFactor = 0.1;
  const planetBaseSizes = { courses: 128, info: 96, action: 64 };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, "events");
        const q = query(eventsCollection, orderBy("date", "asc"));
        const querySnapshot = await getDocs(q);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const fetchedEvents = querySnapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((event) => {
            if (!event.date || !event.title) return false;
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return event.type === "event" && eventDate >= today;
          });

        if (fetchedEvents.length > 0) {
          setPlanets((prev) =>
            prev.map((p) =>
              p.id === "events"
                ? {
                    ...p,
                    courses: fetchedEvents.map((e) => ({
                      text: e.title,
                      link: e.link,
                    })),
                  }
                : p,
            ),
          );
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  const handleLink = (link) => {
    if (!link) return;
    const isExternal = /^https?:\/\/|www\.|\.com|\.de/.test(link);
    if (isExternal) {
      const url = link.startsWith("http") ? link : `https://${link}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      navigate(link.startsWith("/") ? link : `/${link}`);
    }
  };

  const [planetAngles, setPlanetAngles] = useState(() => {
    const initialAngles = {};
    const grouped = planets.reduce((acc, p) => {
      acc[p.assignedOrbit] = [...(acc[p.assignedOrbit] || []), p];
      return acc;
    }, {});

    planets.forEach((planet) => {
      const group = grouped[planet.assignedOrbit];
      const index = group.findIndex((p) => p.id === planet.id);
      const base = (360 / group.length) * index;
      initialAngles[planet.id] =
        (base + (Math.random() - 0.5) * 30 + 360) % 360;
    });
    return initialAngles;
  });

  useEffect(() => {
    const mountTimer = setTimeout(() => setIsSystemMounted(true), 50);
    const animTimer = setTimeout(() => setIsInitialAnimationDone(true), 1600);
    return () => {
      clearTimeout(mountTimer);
      clearTimeout(animTimer);
    };
  }, []);

  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      const targetSpeed = isPaused ? 0 : 1;
      globalSpeedRef.current += (targetSpeed - globalSpeedRef.current) * 0.08;

      const ringSpeeds = { courses: 1, info: 1, action: 1 };
      if (focusedPlanet) {
        const p = planets.find((p) => p.id === focusedPlanet);
        if (p) ringSpeeds[p.assignedOrbit] = ringSlowFactor;
      }

      setPlanetAngles((prev) => {
        const next = { ...prev };
        planets.forEach((planet) => {
          if (prev[planet.id] === undefined) return;
          next[planet.id] =
            (prev[planet.id] -
              orbitSpeeds[planet.assignedOrbit] *
                ringSpeeds[planet.assignedOrbit] *
                globalSpeedRef.current *
                delta +
              360) %
            360;
        });
        return next;
      });
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPaused, focusedPlanet, planets]);

  const safeWidth = windowSize.width || 1200;
  const safeHeight = windowSize.height || 800;
  const baseRadius = Math.min(safeWidth, safeHeight) / 5;
  const scaleFactor = Math.max(0.4, Math.min(1, baseRadius / 250));
  const staticOrbitRadii = {
    action: baseRadius,
    info: baseRadius * 1.5,
    courses: baseRadius * 2,
  };
  const sunSize = 200 * scaleFactor;
  const isSystemHovered = hoveredPlanet || hoveredMoonPlanet;

  return (
    <div
      className="landing"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        pointerEvents: isMenuOpen ? "none" : "auto",
      }}
      onClick={() => {
        if (!isMenuOpen) {
          setFocusedPlanet(null);
          setActivePlanet(null);
        }
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <Header
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          isMenuOpen={isMenuOpen}
          onMenuToggle={setIsMenuOpen}
        />
      </div>

      <style>
        {`
          @keyframes contentFadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .bio-panel::-webkit-scrollbar { width: 4px; }
          .bio-panel::-webkit-scrollbar-track { background: transparent; }
          .bio-panel::-webkit-scrollbar-thumb { 
            background-color: rgba(28, 7, 0, 0.1); 
            border-radius: 10px; 
          }
          .bio-link {
            background-color: #caaff380;
            color: #1c0700;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
            border-radius: 30px;
          }
          .bio-link:hover {
            background-color: #9a60a8d7;
            color: #1c0700;
            transform: translateY(-2px);
          }
        `}
      </style>

      <Sun
        sunClicked={sunClicked}
        size={sunSize}
        style={{
          filter: isSystemHovered || isMenuOpen ? "blur(7px)" : "none",
          transition: "filter 0.3s ease",
          cursor: isMenuOpen ? "default" : "pointer",
        }}
        onClick={() => {
          if (!isMenuOpen) {
            setSunClicked(true);
            setTimeout(() => setSunClicked(false), 200);
            setIsPaused(!isPaused);
          }
        }}
      />

      {Object.entries(staticOrbitRadii).map(([type, radius]) => (
        <Orbit
          key={type}
          radius={radius}
          label={type === "courses" ? "Teams" : ""}
          scaleFactor={scaleFactor}
          style={{
            filter: isSystemHovered || isMenuOpen ? "blur(7px)" : "none",
            transition: "filter 0.3s ease",
          }}
        />
      ))}

      {planets.map((planet) => {
        if (planetAngles[planet.id] === undefined) return null;
        const targetRadius = isSystemMounted
          ? staticOrbitRadii[planet.assignedOrbit]
          : 0;
        const angle = planetAngles[planet.id];
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * targetRadius;
        const y = Math.sin(rad) * targetRadius;

        const currentFocusPlanet = hoveredPlanet || hoveredMoonPlanet;
        const currentFocusType = currentFocusPlanet
          ? planets.find((p) => p.id === currentFocusPlanet)?.assignedOrbit
          : null;

        let blurValue = "none";
        if (
          (isSystemHovered || isMenuOpen) &&
          planet.id !== currentFocusPlanet
        ) {
          blurValue =
            planet.assignedOrbit === currentFocusType
              ? "blur(1px)"
              : "blur(3px)";
        }

        const isHoverable =
          !isMenuOpen && (!isSystemHovered || planet.id === currentFocusPlanet);
        const currentSize = (planetBaseSizes[planet.type] || 64) * scaleFactor;

        return (
          <Planet
            key={planet.id}
            planet={planet}
            language={currentLang}
            size={currentSize}
            isFocused={focusedPlanet === planet.id}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
              zIndex: 10,
              filter: blurValue,
              opacity: isSystemMounted ? 1 : 0,
              willChange: "transform, filter",
              transition: isInitialAnimationDone
                ? "filter 0.2s ease, opacity 0.8s ease"
                : isSystemMounted
                  ? "transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease"
                  : "none",
            }}
            onActivate={(id) => {
              if (isMenuOpen) return;
              const pData = planets.find((p) => p.id === id);
              if (pData.courses?.length === 1 && pData.courses[0].link) {
                handleLink(pData.courses[0].link);
              } else {
                setActivePlanet(id);
                setFocusedPlanet(id);
              }
            }}
            onHover={(id) => {
              if (isMenuOpen) return;
              // We only set the focus; we no longer clear it on leave
              setHoveredPlanet(id);
              setFocusedPlanet(id);
              setActivePlanet(id);
            }}
            onHoverEnd={() => {
              setHoveredPlanet(null);
              // REMOVED: The timeout that clears focusedPlanet is gone!
            }}
          />
        );
      })}

      {planets.map((planet) => {
        if (focusedPlanet !== planet.id || !planet.courses) return null;

        const radius = staticOrbitRadii[planet.assignedOrbit];
        const angle = planetAngles[planet.id] || 0;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        let baseMoonRadius = 110;
        const moonOrbitRadius = baseMoonRadius * scaleFactor;

        return (
          <React.Fragment key={`moons-group-${planet.id}`}>
            <svg
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
                width: moonOrbitRadius * 2 + 10,
                height: moonOrbitRadius * 2 + 10,
                pointerEvents: "none",
                zIndex: 4001,
                overflow: "visible",
              }}
            >
              <circle
                cx="50%"
                cy="50%"
                r={moonOrbitRadius}
                fill="none"
                stroke="#1c070052"
                strokeWidth="0.4"
                strokeDasharray="4 4"
              />
            </svg>

            {planet.courses.map((moon, index) => (
              <Moon
                key={`${planet.id}-moon-${index}`}
                planetId={planet.id}
                moon={moon}
                index={index}
                totalMoons={planet.courses.length}
                planetType={planet.assignedOrbit}
                planetPosition={{ x, y }}
                windowSize={windowSize}
                currentLang={currentLang}
                scaleFactor={scaleFactor}
                orbitRadius={moonOrbitRadius}
                onHoverStart={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                  }
                  setHoveredMoonPlanet(planet.id);
                }}
                onHoverEnd={() => {
                  setHoveredMoonPlanet(null);
                  // REMOVED: No more auto-clearing here either
                }}
              />
            ))}
          </React.Fragment>
        );
      })}
      {/* DESKTOP INTRO TEXT OVERLAY */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "40px",
          width: "350px",
          fontFamily: "Satoshi",
          fontSize: "0.85rem",
          lineHeight: "1.4",
          color: "#1c0700",
          opacity: focusedPlanet || isMenuOpen ? 0 : 0.8,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
          zIndex: 1,
          textAlign: "left",
        }}
      >
        <p style={{ margin: "0 0 10px 0" }}>
          {currentLang === "de"
            ? "Die Sinnesküche ist ein kreativer Gemeinschaftsort. Wir nehmen wahr über unsere Sinne und gehen in Kontakt miteinander. Hier wollen wir unsere Sinne bewusst füttern und uns mit Eindrücken, Erfahrungen und Fähigkeiten bereichern. Vokalist*in und Künstler*in Luca Koch hat die Sinnesküche im Februar 2024 gegründet und gestaltet seither mit Freunden ein breites, multisensuelles Kurs- und Eventangebot. Lerne hier unsere Facilitator kennen."
            : "The Sinnesküche is a creative community space. We perceive through our senses and connect with one another. Here, we want to consciously feed our senses and enrich ourselves with impressions, experiences, and skills. Vocalist and artist Luca Koch founded the Sinnesküche in February 2024 and has since been shaping a broad, multisensory range of courses and events with friends. Get to know our facilitators here."}
        </p>
        <p style={{ margin: 0 }}>
          {currentLang === "de"
            ? "Um zu erfahren und zu lernen, schaffen wir einen Safe Space, in dem keine Form von Diskriminierung geduldet wird. Die Sinnesküche ist im Dachgeschoss und deshalb leider nicht rollstuhlgängig."
            : "To experience and learn, we create a safe space where no form of discrimination is tolerated. The Sinnesküche is located on the top floor and is therefore unfortunately not wheelchair accessible."}
        </p>
      </div>
      {/* BIO PANEL INTEGRATION */}
      {(() => {
        const planet = planets.find((p) => p.id === focusedPlanet);
        const isVisible =
          focusedPlanet && planet?.bio?.[currentLang] && !isMenuOpen;

        return (
          <div
            ref={bioPanelRef}
            onMouseEnter={() => setIsBioPanelHovered(true)}
            onMouseLeave={() => setIsBioPanelHovered(false)}
            style={{
              position: "absolute",
              right: isVisible ? "40px" : "-100px",
              top: "15%",
              bottom: "15%",
              width: `${dynamicWidth}px`,
              padding: "45px 25px 30px 25px",
              zIndex: 5000,
              overflowY: "auto",
              opacity: isVisible ? 1 : 0,
              pointerEvents: isVisible ? "auto" : "none",

              /* Disable transitions while calculating so the user doesn't see the "jump" */
              transition: isCalculating
                ? "none"
                : "opacity 0.5s ease, transform 0.5s ease, right 0.5s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s ease-out",

              fontFamily: "Satoshi",
              color: "#1c0700",
              backgroundColor: "rgba(255, 252, 230, 0.6)",
              backdropFilter: "blur(12px)",
              borderRadius: "24px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
            }}
          >
            {planet?.bio?.[currentLang] && (
              <>
                {/* CLOSE BUTTON - Persistent and static */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClosePanel();
                  }}
                  style={{
                    position: "absolute",
                    top: "15px",
                    right: "15px",
                    background: "#fffce3",
                    color: "#1c0700",
                    border: "none",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    zIndex: 10,
                  }}
                >
                  ✕
                </button>

                {/* ANIMATED CONTENT WRAPPER */}
                <div
                  key={`content-${planet.id}`}
                  style={{
                    animation: isCalculating
                      ? "none"
                      : "contentFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                  }}
                >
                  {/* Pronoun Tag */}
                  {planet.pronouns?.[currentLang] && (
                    <div
                      style={{
                        display: "inline-block",
                        backgroundColor: "rgba(28, 7, 0, 0.03)",
                        border: "1px solid rgba(28, 7, 0, 0.1)",
                        color: "rgba(28, 7, 0, 0.6)",
                        padding: "4px 12px",
                        borderRadius: "16px",
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        marginBottom: "20px",
                      }}
                    >
                      {planet.pronouns[currentLang]}
                    </div>
                  )}

                  {/* Q&A Section */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "30px",
                    }}
                  >
                    {planet.bio[currentLang].map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: "rgba(78, 95, 40, 0.12)",
                            color: "#4e5f28",
                            padding: "5px 12px",
                            borderRadius: "20px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            alignSelf: "flex-start",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.q}
                        </span>
                        <p
                          style={{
                            fontSize: "0.95rem",
                            lineHeight: "1.6",
                            margin: 0,
                            opacity: 0.9,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Links Section */}
                  {planet.links && (
                    <div
                      style={{
                        marginTop: "35px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        paddingTop: "20px",
                        borderTop: "1px solid rgba(28, 7, 0, 0.1)",
                      }}
                    >
                      {planet.links.map((link, idx) => {
                        const label =
                          typeof link.label === "object"
                            ? link.label[currentLang]
                            : link.label;
                        const url =
                          typeof link.url === "object"
                            ? link.url[currentLang]
                            : link.url;
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="bio-link"
                            style={{
                              padding: "8px 16px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              borderRadius: "30px",
                            }}
                          >
                            {label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
