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
  const [sunSize] = useState(200);
  const [hasShiftedLeft, setHasShiftedLeft] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrollDirection, setScrollDirection] = useState("down");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const coursePlanets = planets.filter((p) => p.type === "courses");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleReset = () => {
    if (activeIndex === null || isResetting) return;
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
      e.preventDefault();
      if (Math.abs(e.deltaY) < 10) return;
      scrollHandler(e.deltaY > 0 ? "down" : "up");
    };

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
      touchLocked.current = false;
    };

    const handleTouchMove = (e) => {
      if (touchStartY.current === null || touchLocked.current) return;
      const deltaY = touchStartY.current - e.touches[0].clientY;
      if (Math.abs(deltaY) < 50) return;
      scrollHandler(deltaY > 0 ? "down" : "up");
      touchStartY.current = null;
      touchLocked.current = true;
    };

    const touchStartY = { current: null };
    const touchLocked = { current: false };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [coursePlanets.length]);

  const normalGap = planetSize * 0.5;
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

  // Helper to calculate the accumulated height up to a certain index
  const getAccumulatedHeight = (index) => {
    let height = 0;
    const gap = activeIndex !== null ? expandedGap : normalGap;
    for (let i = 0; i < index; i++) {
      height += getPlanetSize(i) + gap;
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
    // We want the center of the active planet to be at the center of the screen
    return (
      window.innerHeight / 2 -
      getAccumulatedHeight(activeIndex) -
      getPlanetSize(activeIndex) / 2
    );
  };

  const translateY = computeTranslateY();
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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", zIndex: 4000 }}
      >
        <Header
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          isPlanetActive={activeIndex !== null}
        />
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

          return (
            <div
              key={planet.id}
              onClick={(e) => e.stopPropagation()}
              style={{
                zIndex: 2,
                opacity: isLoaded ? 1 : 0,
                transition: `transform ${movementDuration} ${currentEase}, translate ${movementDuration} ${currentEase}, opacity ${movementDuration} ease`,
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
                    setPreviousIndex(activeIndex);
                    setActiveIndex(activeIndex === index ? null : index);
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </div>
            </div>
          );
        })}

        <div
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          style={{
            position: "relative",
            width: sunSize,
            height: sunSize,
            transition: `opacity 1.5s ease`,
            opacity: activeIndex === null && isLoaded ? 1 : 0,
            pointerEvents: activeIndex === null ? "auto" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
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
