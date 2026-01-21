import { useState, useEffect, useRef } from "react";
import PlanetPortrait from "../components/Planet/PlanetPortrait";
import MoonPortrait from "../components/Moon/MoonPortrait";
import SunPortrait from "../components/Sun/SunPortrait";
import Header from "../components/Header/Header";
import { planets } from "../data/planets";
import { defaultLang } from "../i18n";

export default function LandingPortrait() {
  const [activeIndex, setActiveIndex] = useState(null);
  const [previousIndex, setPreviousIndex] = useState(null);
  const [currentLang, setCurrentLang] = useState(defaultLang);
  const [planetSize, setPlanetSize] = useState(80);
  const [sunSize, setSunSize] = useState(200);
  const [hasShiftedLeft, setHasShiftedLeft] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrollDirection, setScrollDirection] = useState("down");
  const [activePlanetCenter, setActivePlanetCenter] = useState({ x: 0, y: 0 });

  const activePlanetRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);

  const coursePlanets = planets.filter((p) => p.type === "courses");

  // ---------------- Scroll logic (wheel + touch) ----------------
  useEffect(() => {
    let scrollLocked = false;

    const scrollHandler = (direction, steps = 1) => {
      setScrollDirection(direction);

      setActiveIndex((prev) => {
        if (prev === null && !scrollLocked) {
          scrollLocked = true;
          return direction === "down" ? 0 : coursePlanets.length - 1;
        }

        const startIndex = prev ?? 0;
        let nextIndex;
        if (direction === "down") {
          nextIndex = Math.min(startIndex + steps, coursePlanets.length - 1);
        } else {
          nextIndex = Math.max(startIndex - steps, 0);
        }

        if (nextIndex !== startIndex) setPreviousIndex(startIndex);
        return nextIndex;
      });
    };

    // Desktop: wheel
    const handleWheel = (e) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? "down" : "up";
      scrollHandler(direction);
    };

    // Mobile: touch
    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = e.timeStamp;
    };

    const handleTouchMove = (e) => {
      if (touchStartY.current === null || touchStartTime.current === null)
        return;

      const deltaY = touchStartY.current - e.touches[0].clientY;
      const elapsed = e.timeStamp - touchStartTime.current;

      // Minimum swipe distance
      const minSwipe = 30;
      if (Math.abs(deltaY) < minSwipe) return;

      // Determine steps based on swipe velocity
      const velocity = Math.abs(deltaY) / elapsed; // px/ms
      const steps = Math.min(
        Math.floor(Math.abs(deltaY) / 80 + velocity * 5),
        coursePlanets.length,
      );

      const direction = deltaY > 0 ? "down" : "up";
      scrollHandler(direction, steps);

      // Reset for next swipe
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = e.timeStamp;
    };

    const handleTouchEnd = () => {
      touchStartY.current = null;
      touchStartTime.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [coursePlanets.length]);

  // ---------------- Horizontal shift ----------------
  useEffect(() => {
    if (activeIndex !== null && !hasShiftedLeft) {
      const timeout = setTimeout(() => setHasShiftedLeft(true), 200);
      return () => clearTimeout(timeout);
    }
    if (activeIndex === null) setHasShiftedLeft(false);
  }, [activeIndex, hasShiftedLeft]);

  const normalGap = planetSize * 0.5;
  const expandedGap = planetSize * 1.1;

  const getPlanetSize = (index) => {
    if (activeIndex === null) return planetSize;
    return activeIndex === index ? planetSize * 2.5 : planetSize / 2;
  };

  const computeTranslateY = () => {
    if (activeIndex === null) {
      const totalHeight =
        coursePlanets.reduce((sum, _, i) => sum + getPlanetSize(i), 0) +
        (coursePlanets.length - 1) * normalGap +
        sunSize;
      return window.innerHeight / 2 - totalHeight / 2;
    }

    let offsetAbove = 0;
    for (let i = 0; i < activeIndex; i++) {
      offsetAbove += getPlanetSize(i) + expandedGap;
    }
    const activePlanetCenterOffset =
      offsetAbove + getPlanetSize(activeIndex) / 2;
    return window.innerHeight * 0.48 - activePlanetCenterOffset;
  };

  const translateY = computeTranslateY();

  // ---------------- Update active planet center ----------------
  useEffect(() => {
    if (activePlanetRef.current) {
      const rect = activePlanetRef.current.getBoundingClientRect();
      setActivePlanetCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, [activeIndex, translateY, planetSize]);

  // ---------------- Clear old moons ----------------
  useEffect(() => {
    if (previousIndex !== null) {
      const exitDuration = 4000;
      const timeout = setTimeout(() => setPreviousIndex(null), exitDuration);
      return () => clearTimeout(timeout);
    }
  }, [previousIndex]);

  return (
    <div
      onClick={() => setActiveIndex(null)}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Header currentLang={currentLang} setCurrentLang={setCurrentLang} />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: activeIndex !== null ? expandedGap : normalGap,
          transform: `translateY(${translateY}px) translateX(${
            hasShiftedLeft ? "-30vw" : "0"
          })`,
          transition: "transform 1s cubic-bezier(0.22, 1, 0.36, 1), gap 0.5s",
          width: "100%",
        }}
      >
        {coursePlanets.map((planet, index) => (
          <PlanetPortrait
            key={planet.id}
            ref={activeIndex === index ? activePlanetRef : null}
            planet={planet}
            language={currentLang}
            size={getPlanetSize(index)}
            onActivate={() => {
              const newIndex = activeIndex === index ? null : index;
              if (newIndex !== activeIndex) setPreviousIndex(activeIndex);
              setActiveIndex(newIndex);
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              transition: "transform 0.3s ease",
              transform: hoveredIndex === index ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}

        <div
          style={{
            transition: "opacity 0.8s ease",
            opacity: activeIndex === null ? 1 : 0,
            pointerEvents: activeIndex === null ? "auto" : "none",
          }}
        >
          <SunPortrait style={{ width: sunSize, height: sunSize }} />
        </div>
      </div>

      {/* ---------------- Old moons ---------------- */}
      {previousIndex !== null &&
        hasShiftedLeft &&
        coursePlanets[previousIndex].courses?.map((moon, idx) => (
          <MoonPortrait
            key={`old-${previousIndex}-${idx}`}
            moon={moon}
            index={idx}
            totalMoons={coursePlanets[previousIndex].courses.length}
            orbitRadius={150}
            currentLang={currentLang}
            exitOnly
            exitDirection={scrollDirection === "down" ? "bottom" : "top"}
            planetCenter={activePlanetCenter}
          />
        ))}

      {/* ---------------- New moons ---------------- */}
      {activeIndex !== null &&
        hasShiftedLeft &&
        coursePlanets[activeIndex].courses?.map((moon, idx) => (
          <MoonPortrait
            key={`new-${activeIndex}-${idx}`}
            moon={moon}
            index={idx}
            totalMoons={coursePlanets[activeIndex].courses.length}
            orbitRadius={150}
            currentLang={currentLang}
            enterDirection={scrollDirection === "down" ? "top" : "bottom"}
            planetCenter={activePlanetCenter}
          />
        ))}
    </div>
  );
}
