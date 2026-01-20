import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Orbit from "../components/Orbit/Orbit";
import Planet from "../components/Planet/Planet";
import Header from "../components/Header/Header";
import StudioName from "../components/StudioName/StudioName";
import Sun from "../components/Sun/Sun";
import Moon from "../components/Moon/Moon";
import { languages, defaultLang } from "../i18n";
import { planets } from "../data/planets";

export default function Landing() {
  const navigate = useNavigate(); // <-- added
  const [activePlanet, setActivePlanet] = useState(null);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [focusedPlanet, setFocusedPlanet] = useState(null);
  const [hoveredMoonPlanet, setHoveredMoonPlanet] = useState(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [planetAngles, setPlanetAngles] = useState({});
  const [moonOffsets, setMoonOffsets] = useState({});
  const [sunClicked, setSunClicked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLang, setCurrentLang] = useState(defaultLang);

  const hoverTimeoutRef = useRef(null);
  const requestRef = useRef();
  const globalSpeedRef = useRef(1);

  const orbitSpeeds = { courses: 9, info: 7, action: 5 };
  const ringSlowFactor = 0.1;
  const lang = languages[currentLang];

  /* -------------------- Window Resize -------------------- */
  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* -------------------- Init Angles & Moon Offsets -------------------- */
  useEffect(() => {
    const initialAngles = {};
    const offsets = {};

    const grouped = planets.reduce((acc, p) => {
      acc[p.type] = acc[p.type] || [];
      acc[p.type].push(p);
      return acc;
    }, {});

    planets.forEach((planet) => {
      const group = grouped[planet.type];
      const index = group.findIndex((p) => p.id === planet.id);
      const base = (360 / group.length) * index;

      initialAngles[planet.id] =
        (base + (Math.random() - 0.5) * 30 + 360) % 360;

      if (planet.courses && planet.courses.length > 0) {
        const moonCount = planet.courses.length;
        offsets[planet.id] = planet.courses.map(
          (_, idx) => (360 / moonCount) * idx + (Math.random() - 0.5) * 15,
        );
      }
    });

    setPlanetAngles(initialAngles);
    setMoonOffsets(offsets);
  }, []);

  /* -------------------- Animation Loop -------------------- */
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
        const next = {};
        planets.forEach((planet) => {
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
  }, [isPaused, focusedPlanet]);

  /* -------------------- Radii -------------------- */
  const baseRadius = Math.min(windowSize.width, windowSize.height) / 5;
  const orbitRadii = {
    action: baseRadius,
    info: baseRadius * 1.5,
    courses: baseRadius * 2,
  };

  /* -------------------- Sun Click -------------------- */
  const handleSunClick = () => {
    setSunClicked(true);
    setTimeout(() => setSunClicked(false), 200);
    setIsPaused((prev) => !prev);
  };

  /* -------------------- Render -------------------- */
  return (
    <div
      className="landing"
      style={{ position: "relative" }}
      onClick={() => {
        setFocusedPlanet(null);
        setActivePlanet(null);
      }}
    >
      {/* Header */}
      <Header currentLang={currentLang} setCurrentLang={setCurrentLang} />

      {/* Sun */}
      <Sun
        hovered={hoveredPlanet || hoveredMoonPlanet}
        sunClicked={sunClicked}
        onClick={handleSunClick}
      />
      <StudioName />

      {/* Orbits */}
      {Object.entries(orbitRadii).map(([type, radius]) => (
        <Orbit
          key={type}
          radius={radius}
          label={lang.orbits[type]}
          style={{
            filter: hoveredPlanet || hoveredMoonPlanet ? "blur(7px)" : "none",
          }}
        />
      ))}

      {/* Planets */}
      {planets.map((planet) => {
        const radius = orbitRadii[planet.type];
        const angle = planetAngles[planet.id] || 0;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        const blurActive = hoveredPlanet || hoveredMoonPlanet;
        const currentFocusPlanet = hoveredPlanet || hoveredMoonPlanet;
        const currentFocusType = currentFocusPlanet
          ? planets.find((p) => p.id === currentFocusPlanet)?.type
          : null;

        let blurValue = "none";
        if (blurActive && planet.id !== currentFocusPlanet) {
          blurValue =
            planet.type === currentFocusType ? "blur(1px)" : "blur(3px)";
        }

        const isHoverable = !blurActive || planet.id === currentFocusPlanet;

        return (
          <Planet
            key={planet.id}
            planet={planet}
            language={currentLang}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
              willChange: "transform",
              zIndex: 1,
              filter: blurValue,
              transition: "filter 0.2s ease",
            }}
            isActive={activePlanet === planet.id}
            onActivate={(id) => {
              const planetData = planets.find((p) => p.id === id);
              if (
                planetData.courses &&
                planetData.courses.length === 1 &&
                typeof planetData.courses[0] === "object" &&
                planetData.courses[0].link
              ) {
                // React Router navigation instead of window.open
                navigate(planetData.courses[0].link);
                return;
              }
              setActivePlanet(id);
              setFocusedPlanet(id);
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
            onHoverEnd={
              isHoverable
                ? () => {
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredPlanet(null);
                    }, 150);
                  }
                : undefined
            }
          />
        );
      })}

      {/* Moons */}
      {planets.map((planet) => {
        if (focusedPlanet !== planet.id || !planet.courses) return null;

        const radius = orbitRadii[planet.type];
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
            onHoverStart={() => {
              clearTimeout(hoverTimeoutRef.current);
              setHoveredMoonPlanet(planet.id);
            }}
            onHoverEnd={() => setHoveredMoonPlanet(null)}
          />
        ));
      })}
    </div>
  );
}
