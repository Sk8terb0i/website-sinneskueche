import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import Orbit from "../components/Orbit/Orbit";
import Planet from "../components/Planet/Planet";
import Header from "../components/Header/Header";
import StudioName from "../components/StudioName/StudioName";
import Sun from "../components/Sun/Sun";
import Moon from "../components/Moon/Moon";
import { languages, defaultLang } from "../i18n";
import { planets as initialPlanets } from "../data/planets";

export default function Landing({ currentLang, setCurrentLang }) {
  const navigate = useNavigate();

  // --- State ---
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
  const [isInitialAnimationDone, setIsInitialAnimationDone] = useState(false); // Fix for jitter
  const [sunClicked, setSunClicked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [planets, setPlanets] = useState(initialPlanets);

  const hoverTimeoutRef = useRef(null);
  const requestRef = useRef();
  const globalSpeedRef = useRef(1);

  const orbitSpeeds = { courses: 15, info: 10, action: 7 };
  const ringSlowFactor = 0.1;
  const lang = languages[currentLang];
  const planetBaseSizes = { courses: 128, info: 96, action: 64 };

  // --- Firebase Logic ---
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
          setPlanets((prevPlanets) =>
            prevPlanets.map((p) => {
              if (p.id === "events") {
                return {
                  ...p,
                  courses: fetchedEvents.map((e) => ({
                    text: e.title,
                    link: e.link,
                  })),
                };
              }
              return p;
            }),
          );
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  // --- Link Handler ---
  const handleLink = (link) => {
    if (!link) return;
    const isExternal =
      link.startsWith("http") ||
      link.startsWith("www.") ||
      link.includes(".com") ||
      link.includes(".de");

    if (isExternal) {
      const url = link.startsWith("http") ? link : `https://${link}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      navigate(link.startsWith("/") ? link : `/${link}`);
    }
  };

  // --- Logic for Angles and Offsets ---
  const [planetAngles, setPlanetAngles] = useState(() => {
    const initialAngles = {};
    const grouped = initialPlanets.reduce((acc, p) => {
      acc[p.type] = acc[p.type] || [];
      acc[p.type].push(p);
      return acc;
    }, {});
    initialPlanets.forEach((planet) => {
      const group = grouped[planet.type];
      const index = group.findIndex((p) => p.id === planet.id);
      const base = (360 / group.length) * index;
      initialAngles[planet.id] =
        (base + (Math.random() - 0.5) * 30 + 360) % 360;
    });
    return initialAngles;
  });

  const [moonOffsets, setMoonOffsets] = useState(() => {
    const offsets = {};
    initialPlanets.forEach((planet) => {
      if (planet.courses && planet.courses.length > 0) {
        const moonCount = planet.courses.length;
        offsets[planet.id] = planet.courses.map(
          (_, idx) => (360 / moonCount) * idx + (Math.random() - 0.5) * 15,
        );
      }
    });
    return offsets;
  });

  useEffect(() => {
    const newOffsets = { ...moonOffsets };
    planets.forEach((planet) => {
      if (planet.id === "events" && planet.courses) {
        const moonCount = planet.courses.length;
        newOffsets[planet.id] = planet.courses.map(
          (_, idx) => (360 / moonCount) * idx + (Math.random() - 0.5) * 15,
        );
      }
    });
    setMoonOffsets(newOffsets);
  }, [planets]);

  // Handle mounting and the fly-out animation timing
  useEffect(() => {
    const mountTimer = setTimeout(() => setIsSystemMounted(true), 50);
    const animationTimer = setTimeout(
      () => setIsInitialAnimationDone(true),
      1600,
    );
    return () => {
      clearTimeout(mountTimer);
      clearTimeout(animationTimer);
    };
  }, []);

  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Animation Loop ---
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
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              // Ensure translate3d is used to trigger GPU acceleration
              transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
              zIndex: 10,
              filter: blurValue,
              opacity: isSystemMounted ? 1 : 0,
              // This 'will-change' hint tells the browser to prepare the GPU
              willChange: "transform, filter",
              transition: isInitialAnimationDone
                ? "filter 0.2s ease, opacity 0.8s ease"
                : isSystemMounted
                  ? "transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease"
                  : "none",
            }}
            onActivate={(id) => {
              if (isMenuOpen) return;
              const planetData = planets.find((p) => p.id === id);
              if (
                planetData.courses?.length === 1 &&
                planetData.courses[0].link
              ) {
                handleLink(planetData.courses[0].link);
              } else {
                setActivePlanet(id);
                setFocusedPlanet(id);
              }
            }}
            onHover={
              isHoverable
                ? (id) => {
                    clearTimeout(hoverTimeoutRef.current);
                    setHoveredPlanet(id);
                    setFocusedPlanet(id);
                  }
                : undefined
            }
            onHoverEnd={() => {
              setHoveredPlanet(null);
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = setTimeout(() => {
                setFocusedPlanet((prev) => (hoveredMoonPlanet ? prev : null));
              }, 150);
            }}
          />
        );
      })}

      {planets.map((planet) => {
        if (focusedPlanet !== planet.id || !planet.courses) return null;
        const radius = staticOrbitRadii[planet.type];
        const angle = planetAngles[planet.id] || 0;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        return planet.courses.map((moon, index) => (
          <Moon
            key={`${planet.id}-moon-${index}`}
            planetId={planet.id}
            moon={moon}
            index={index}
            planetType={planet.type}
            moonOffset={moonOffsets[planet.id]?.[index] || 0}
            planetPosition={{ x, y }}
            windowSize={windowSize}
            currentLang={currentLang}
            scaleFactor={scaleFactor}
            style={{
              transform: `scale(${scaleFactor})`,
              zIndex: 20,
              pointerEvents: isMenuOpen ? "none" : "auto",
            }}
            onHoverStart={() => {
              if (isMenuOpen) return;
              clearTimeout(hoverTimeoutRef.current);
              setHoveredMoonPlanet(planet.id);
              setFocusedPlanet(planet.id);
            }}
            onHoverEnd={() => {
              setHoveredMoonPlanet(null);
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = setTimeout(() => {
                setFocusedPlanet((prev) => (hoveredPlanet ? prev : null));
              }, 150);
            }}
            onClick={() => handleLink(moon.link)}
          />
        ));
      })}
    </div>
  );
}
