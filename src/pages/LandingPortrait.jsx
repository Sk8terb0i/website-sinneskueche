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
  const [planetSize] = useState(80);
  const [sunSize] = useState(150);
  const [hasShiftedLeft, setHasShiftedLeft] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrollDirection, setScrollDirection] = useState("down");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Menu State lifted from Header
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMenuOpenRef = useRef(false);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  const coursePlanets = planets.filter((p) => p.type === "courses");
  const touchStartY = useRef(null);
  const touchLocked = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleReset = () => {
    // Blocks reset interaction if menu is open
    if (activeIndex === null || isResetting || isMenuOpenRef.current) return;
    setIsResetting(true);
    setIsLoaded(false);
    setPreviousIndex(null);
    setActiveIndex(null);
    setTimeout(() => {
      setIsLoaded(true);
      setIsResetting(false);
    }, 400);
  };

  useEffect(() => {
    const scrollHandler = (direction) => {
      if (isMenuOpenRef.current) return;
      setScrollDirection(direction);
      setActiveIndex((prev) => {
        let nextIndex;
        if (direction === "down") {
          nextIndex = prev === null ? 0 : (prev + 1) % coursePlanets.length;
        } else {
          nextIndex =
            prev === null
              ? 0
              : (prev - 1 + coursePlanets.length) % coursePlanets.length;
        }
        if (nextIndex !== prev) setPreviousIndex(prev);
        return nextIndex;
      });
    };

    const handleWheel = (e) => {
      if (isMenuOpenRef.current) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 10) return;
      scrollHandler(e.deltaY > 0 ? "down" : "up");
    };

    const handleTouchStart = (e) => {
      if (isMenuOpenRef.current) return;
      touchStartY.current = e.touches[0].clientY;
      touchLocked.current = false;
    };

    const handleTouchMove = (e) => {
      if (
        isMenuOpenRef.current ||
        touchStartY.current === null ||
        touchLocked.current
      )
        return;
      const deltaY = touchStartY.current - e.touches[0].clientY;
      if (Math.abs(deltaY) < 50) return;
      scrollHandler(deltaY > 0 ? "down" : "up");
      touchStartY.current = null;
      touchLocked.current = true;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [coursePlanets.length]);

  const normalGap = planetSize * 0.2;
  const expandedGap = planetSize * 1.1;

  const getPlanetSize = (index) => {
    if (activeIndex === null) return planetSize;
    return activeIndex === index ? planetSize * 2 : planetSize / 3;
  };

  const getOrbitDiameter = (targetIndex) => {
    let distance = sunSize / 2;
    for (let i = coursePlanets.length - 1; i >= targetIndex; i--) {
      distance += normalGap;
      if (i === targetIndex) distance += planetSize / 2;
      else distance += planetSize;
    }
    return distance * 2;
  };

  const getAccumulatedHeight = (index, isIdle = false) => {
    let height = 0;
    const gap = !isIdle && activeIndex !== null ? expandedGap : normalGap;
    for (let i = 0; i < index; i++) {
      const size = isIdle ? planetSize : getPlanetSize(i);
      height += size + gap;
    }
    return height;
  };

  const computeTranslateY = () => {
    if (activeIndex === null) {
      const totalHeight =
        coursePlanets.reduce((sum, _, i) => sum + getPlanetSize(i), 0) +
        (coursePlanets.length - 1) * normalGap +
        sunSize;
      return Math.max(
        window.innerHeight / 2 - totalHeight / 2,
        window.innerHeight * 0.07,
      );
    }
    return (
      window.innerHeight / 2 -
      getAccumulatedHeight(activeIndex) -
      getPlanetSize(activeIndex) / 2
    );
  };

  const translateY = computeTranslateY();

  const idleTotalHeight =
    coursePlanets.length * planetSize +
    (coursePlanets.length - 1) * normalGap +
    sunSize;
  const idleTranslateY = Math.max(
    window.innerHeight / 2 - idleTotalHeight / 2,
    window.innerHeight * 0.07,
  );
  const sunTopPosition =
    idleTranslateY +
    coursePlanets.length * planetSize +
    coursePlanets.length * normalGap;

  const springEase = "cubic-bezier(0.34, 1.56, 0.64, 1)";
  const smoothEase = "cubic-bezier(0.4, 0, 0.2, 1)";
  const currentEase = previousIndex === null ? springEase : smoothEase;
  const movementDuration = activeIndex === null ? "1.5s" : "0.8s";

  useEffect(() => {
    if (activeIndex !== null && !hasShiftedLeft) {
      setTimeout(() => setHasShiftedLeft(true), 200);
    } else if (activeIndex === null) {
      setHasShiftedLeft(false);
    }
  }, [activeIndex]);

  const targetCenter = {
    x: window.innerWidth * 0.4,
    y: window.innerHeight * 0.5,
  };

  return (
    <div
      onClick={handleReset}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0",
        overflow: "hidden",
        position: "relative",
        cursor: activeIndex !== null ? "pointer" : "default",
        // Blocks pointer events on the background when menu is open
        pointerEvents: isMenuOpen ? "none" : "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", zIndex: 4000, pointerEvents: "auto" }}
      >
        <Header
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          isPlanetActive={activeIndex !== null}
          isMenuOpen={isMenuOpen}
          onMenuToggle={setIsMenuOpen}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: `${sunTopPosition}px`,
          left: "50%",
          width: sunSize,
          height: sunSize,
          transform: "translateX(-50%)",
          transition: `opacity 0.3s ease-out`,
          opacity: activeIndex === null && isLoaded ? 1 : 0,
          pointerEvents: activeIndex === null && !isMenuOpen ? "auto" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleReset();
        }}
      >
        {coursePlanets.map((_, index) => (
          <div
            key={`orbit-${index}`}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${getOrbitDiameter(index)}px`,
              height: `${getOrbitDiameter(index)}px`,
              border: "1px solid rgba(28, 7, 0, 0.15)",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              boxSizing: "border-box",
              zIndex: -1,
              pointerEvents: "none",
            }}
          />
        ))}
        <SunPortrait style={{ width: "100%", height: "100%", zIndex: 1 }} />
      </div>

      <div
        onClick={(e) =>
          e.target === e.currentTarget ? handleReset() : e.stopPropagation()
        }
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: activeIndex !== null ? expandedGap : normalGap,
          transform: `translateY(${translateY}px)`,
          transition: `transform ${movementDuration} ${currentEase}, gap 0.5s`,
          width: "fit-content",
          zIndex: 2,
        }}
      >
        {coursePlanets.map((planet, index) => {
          const radius = getOrbitDiameter(index) / 2;
          const possibleAngles = [-90, 90, -180, 45, -45];
          let startAngle =
            index === coursePlanets.length - 1
              ? 180
              : possibleAngles[index % possibleAngles.length];
          const currentAngle = isLoaded ? 0 : startAngle;
          let translateX = hasShiftedLeft ? "-10vw" : "0";

          const isVisible =
            activeIndex === null || Math.abs(index - activeIndex) <= 2;

          return (
            <div
              key={planet.id}
              onClick={(e) => e.stopPropagation()}
              style={{
                zIndex: 2,
                opacity: isLoaded && isVisible ? 1 : 0,
                pointerEvents: isVisible && !isMenuOpen ? "auto" : "none",
                transition: `transform ${movementDuration} ${currentEase}, translate ${movementDuration} ${currentEase}, opacity 0.5s ease`,
                transformOrigin: `center ${radius}px`,
                transform: `rotate(${currentAngle}deg)`,
                translate: `${translateX} 0`,
                position: "relative",
              }}
            >
              <div
                style={{
                  transition: "transform 0.3s ease",
                  transform:
                    hoveredIndex === index ? "scale(1.15)" : "scale(1)",
                }}
              >
                <PlanetPortrait
                  planet={planet}
                  language={currentLang}
                  size={getPlanetSize(index)}
                  onActivate={() => {
                    if (isMenuOpen) return;
                    setPreviousIndex(activeIndex);
                    setActiveIndex(activeIndex === index ? null : index);
                  }}
                  onMouseEnter={() => !isMenuOpen && setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {activeIndex !== null &&
        hasShiftedLeft &&
        coursePlanets[activeIndex].courses?.map((moon, idx) => (
          <MoonPortrait
            key={`new-${activeIndex}-${idx}`}
            moon={moon}
            orbitRadius={120}
            currentLang={currentLang}
            enterDirection={scrollDirection === "down" ? "top" : "bottom"}
            planetCenter={targetCenter}
          />
        ))}

      {previousIndex !== null &&
        hasShiftedLeft &&
        coursePlanets[previousIndex].courses?.map((moon, idx) => (
          <MoonPortrait
            key={`old-${previousIndex}-${idx}`}
            moon={moon}
            orbitRadius={120}
            currentLang={currentLang}
            exitOnly
            exitDirection={scrollDirection === "down" ? "bottom" : "top"}
            planetCenter={targetCenter}
          />
        ))}
    </div>
  );
}
