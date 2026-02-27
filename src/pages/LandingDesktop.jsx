import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import Orbit from "../components/Orbit/Orbit";
import Planet from "../components/Planet/Planet";
import Header from "../components/Header/Header";
import StudioName from "../components/StudioName/StudioName";
import Sun from "../components/Sun/Sun";
import Moon from "../components/Moon/Moon";
import { languages } from "../i18n";
import { planets as initialPlanets } from "../data/planets";

export default function Landing({ currentLang, setCurrentLang }) {
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

  const [isSystemMounted, setIsSystemMounted] = useState(false);
  const [isInitialAnimationDone, setIsInitialAnimationDone] = useState(false);
  const [sunClicked, setSunClicked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [planets, setPlanets] = useState(filteredInitialPlanets);

  const hoverTimeoutRef = useRef(null);
  const requestRef = useRef();
  const globalSpeedRef = useRef(1);

  const orbitSpeeds = { courses: 15, info: 10, action: 7 };
  const ringSlowFactor = 0.1;
  const lang = languages[currentLang];
  const planetBaseSizes = { courses: 128, info: 96, action: 64 };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsSnap = await getDocs(collection(db, "course_settings"));
        const visibilityMap = {};
        settingsSnap.docs.forEach((doc) => {
          visibilityMap[doc.id] = doc.data().isVisible !== false;
        });

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

        setPlanets((prev) =>
          prev.map((p) => {
            let updatedCourses = p.courses
              ? p.courses.filter((course) => {
                  const courseId = course.link?.replace(/\//g, "");
                  return visibilityMap[courseId] !== false;
                })
              : p.courses;

            if (p.id === "events" && fetchedEvents.length > 0) {
              updatedCourses = fetchedEvents.map((e) => ({
                text: e.title,
                link: e.link,
              }));
            }

            return { ...p, courses: updatedCourses };
          }),
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
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
    const grouped = filteredInitialPlanets.reduce((acc, p) => {
      acc[p.type] = [...(acc[p.type] || []), p];
      return acc;
    }, {});

    filteredInitialPlanets.forEach((planet) => {
      const group = grouped[planet.type];
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
        if (p) ringSpeeds[p.type] = ringSlowFactor;
      }

      setPlanetAngles((prev) => {
        const next = { ...prev };
        planets.forEach((planet) => {
          if (prev[planet.id] === undefined) return;
          next[planet.id] =
            (prev[planet.id] -
              orbitSpeeds[planet.type] *
                ringSpeeds[planet.type] *
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

      <StudioName />

      {Object.entries(staticOrbitRadii).map(([type, radius]) => (
        <Orbit
          key={type}
          radius={radius}
          label={lang.orbits[type]}
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
          ? staticOrbitRadii[planet.type]
          : 0;
        const angle = planetAngles[planet.id];
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * targetRadius;
        const y = Math.sin(rad) * targetRadius;

        const currentFocusPlanet = hoveredPlanet || hoveredMoonPlanet;
        const currentFocusType = currentFocusPlanet
          ? planets.find((p) => p.id === currentFocusPlanet)?.type
          : null;

        let blurValue = "none";
        if (
          (isSystemHovered || isMenuOpen) &&
          planet.id !== currentFocusPlanet
        ) {
          blurValue =
            planet.type === currentFocusType ? "blur(1px)" : "blur(3px)";
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
            onHover={
              isHoverable
                ? (id) => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setHoveredPlanet(id);
                    setFocusedPlanet(id);
                  }
                : undefined
            }
            onHoverEnd={() => {
              setHoveredPlanet(null);
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              hoverTimeoutRef.current = setTimeout(() => {
                setFocusedPlanet((prev) => {
                  return hoveredMoonPlanet === prev ? prev : null;
                });
              }, 200);
            }}
          />
        );
      })}

      {planets.map((planet) => {
        if (focusedPlanet !== planet.id) return null;

        // CHANGED: Logic to handle fallback if courses list is empty
        const moonsToDisplay =
          planet.courses && planet.courses.length > 0
            ? planet.courses
            : planet.fallback
              ? [planet.fallback]
              : [];

        if (moonsToDisplay.length === 0) return null;

        const radius = staticOrbitRadii[planet.type];
        const angle = planetAngles[planet.id] || 0;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        let baseMoonRadius = 110;
        if (planet.type === "info") baseMoonRadius -= 20;
        if (planet.type === "action") baseMoonRadius -= 40;
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
                zIndex: 1999,
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

            {moonsToDisplay.map((moon, index) => (
              <Moon
                key={`${planet.id}-moon-${index}`}
                planetId={planet.id}
                moon={moon}
                index={index}
                totalMoons={moonsToDisplay.length}
                planetType={planet.type}
                planetPosition={{ x, y }}
                windowSize={windowSize}
                currentLang={currentLang}
                scaleFactor={scaleFactor}
                onHoverStart={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                  }
                  setHoveredMoonPlanet(planet.id);
                }}
                onHoverEnd={() => {
                  setHoveredMoonPlanet(null);
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                  }
                  hoverTimeoutRef.current = setTimeout(() => {
                    setFocusedPlanet((prev) => {
                      if (
                        hoveredPlanet === planet.id ||
                        hoveredMoonPlanet === planet.id
                      ) {
                        return prev;
                      }
                      return null;
                    });
                  }, 200);
                }}
              />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}
