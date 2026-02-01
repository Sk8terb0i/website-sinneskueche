import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PlanetPortrait from "../components/Planet/PlanetPortrait";
import MoonPortrait from "../components/Moon/MoonPortrait";
import SunPortrait from "../components/Sun/SunPortrait";
import Header from "../components/Header/Header";
import { planets } from "../data/planets";

export default function LandingPortrait({ currentLang, setCurrentLang }) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(null);
  const [previousIndex, setPreviousIndex] = useState(null);
  const [planetSize] = useState(80);
  const [sunSize] = useState(150);
  const [hasShiftedLeft, setHasShiftedLeft] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrollDirection, setScrollDirection] = useState("down");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- NEW: Stable Viewport State ---
  // This prevents the "jump" when mobile address bars hide/show
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      // We only update if the width changes (orientation change)
      // or if the height change is significant (not just address bar)
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMenuOpenRef = useRef(false);
  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  const coursePlanetsOnly = useMemo(
    () => planets.filter((p) => p.type === "courses"),
    [],
  );
  const atelierPlanet = useMemo(
    () => planets.find((p) => p.id === "atelier"),
    [],
  );

  const displayPlanets =
    activeIndex !== null
      ? [...coursePlanetsOnly, atelierPlanet].filter(Boolean)
      : coursePlanetsOnly;

  const touchStartY = useRef(null);
  const touchLocked = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleReset = () => {
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
        const total = displayPlanets.length;
        if (direction === "down") {
          nextIndex = prev === null ? 0 : (prev + 1) % total;
        } else {
          nextIndex = prev === null ? 0 : (prev - 1 + total) % total;
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
  }, [displayPlanets.length]);

  const normalGap = planetSize * 0.2;
  const expandedGap = planetSize * 1.1;

  const getPlanetSize = (index) => {
    if (activeIndex === null) return planetSize;
    return activeIndex === index ? planetSize * 2 : planetSize / 3;
  };

  const getOrbitDiameter = (targetIndex) => {
    let distance = sunSize / 2;
    for (let i = coursePlanetsOnly.length - 1; i >= targetIndex; i--) {
      distance += normalGap;
      if (i === targetIndex) distance += planetSize / 2;
      else distance += planetSize;
    }
    return distance * 2;
  };

  // --- UPDATED: Calculations now use stable viewport state ---
  const computeTranslateY = () => {
    const vh = viewport.height;
    if (activeIndex === null) {
      const totalHeight =
        coursePlanetsOnly.reduce((sum, _, i) => sum + getPlanetSize(i), 0) +
        (coursePlanetsOnly.length - 1) * normalGap +
        sunSize;
      return Math.max(vh / 2 - totalHeight / 2, vh * 0.07);
    }
    const getAccumulatedHeight = (idx) => {
      let h = 0;
      for (let i = 0; i < idx; i++) {
        h += getPlanetSize(i) + expandedGap;
      }
      return h;
    };
    return (
      vh / 2 -
      getAccumulatedHeight(activeIndex) -
      getPlanetSize(activeIndex) / 2
    );
  };

  const translateY = computeTranslateY();

  const idleTotalHeight =
    coursePlanetsOnly.length * planetSize +
    (coursePlanetsOnly.length - 1) * normalGap +
    sunSize;

  const idleTranslateY = Math.max(
    viewport.height / 2 - idleTotalHeight / 2,
    viewport.height * 0.07,
  );

  const sunTopPosition =
    idleTranslateY +
    coursePlanetsOnly.length * planetSize +
    coursePlanetsOnly.length * normalGap;

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
    x: viewport.width * 0.4,
    y: viewport.height * 0.5,
  };

  return (
    <div
      onClick={handleReset}
      style={{
        height: "100dvh", // Modern unit: Dynamic Viewport Height
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        cursor: activeIndex !== null ? "pointer" : "default",
        pointerEvents: isMenuOpen ? "none" : "auto",
        touchAction: "none",
      }}
    >
      <style>
        {`
          @keyframes microTension {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(var(--tx), var(--ty)) rotate(var(--tr)); }
            66% { transform: translate(calc(var(--tx) * -0.7), calc(var(--ty) * 0.5)) rotate(calc(var(--tr) * -0.8)); }
          }
          .tethered-float {
            animation: microTension var(--fdur) ease-in-out infinite;
            animation-delay: var(--fdelay);
          }
        `}
      </style>

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

      {/* Sun and Orbits */}
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
          zIndex: 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleReset();
        }}
      >
        {coursePlanetsOnly.map((_, index) => (
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

      {/* Planets Container */}
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
        {displayPlanets.map((planet, index) => {
          const isAtelier = planet.id === "atelier";
          const radius = !isAtelier ? getOrbitDiameter(index) / 2 : 0;
          const possibleAngles = [-90, 90, -180, 45, -45];
          let startAngle =
            index === coursePlanetsOnly.length - 1
              ? 180
              : possibleAngles[index % possibleAngles.length];
          const currentAngle = isLoaded ? 0 : startAngle;
          let translateX = hasShiftedLeft ? "-10vw" : "0";
          const isVisible =
            activeIndex === null || Math.abs(index - activeIndex) <= 2;
          const isIconOnly = activeIndex !== null && activeIndex !== index;

          const dur = 7 + (index % 4);
          const delay = index * -1.8;
          const tx = 1.5 + (index % 2);
          const ty = 2.5 + (index % 3);
          const tr = 0.8 + (index % 2) * 0.4;

          return (
            <div
              key={planet.id}
              onClick={(e) => e.stopPropagation()}
              style={{
                zIndex: 2,
                opacity: isLoaded && isVisible ? 1 : 0,
                pointerEvents: isVisible && !isMenuOpen ? "auto" : "none",
                transition: `transform ${movementDuration} ${currentEase}, translate ${movementDuration} ${currentEase}, opacity 0.5s ease`,
                position: "relative",
                transformOrigin: !isAtelier
                  ? `center ${radius}px`
                  : "center center",
                transform: !isAtelier ? `rotate(${currentAngle}deg)` : "none",
                translate: `${translateX} 0`,
              }}
            >
              <div
                style={{
                  transform: !isAtelier
                    ? `rotate(${-currentAngle}deg)`
                    : "none",
                  transition: `transform ${movementDuration} ${currentEase}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className={activeIndex === null ? "tethered-float" : ""}
                  style={{
                    transition: "transform 0.4s ease",
                    "--fdur": `${dur}s`,
                    "--fdelay": `${delay}s`,
                    "--tx": `${tx}px`,
                    "--ty": `${ty}px`,
                    "--tr": `${tr}deg`,
                    transform:
                      hoveredIndex === index ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  <PlanetPortrait
                    planet={planet}
                    language={currentLang}
                    size={getPlanetSize(index)}
                    isIconOnly={isIconOnly}
                    onActivate={() => {
                      if (isMenuOpen) return;
                      const isCurrentlyActive = activeIndex === index;
                      const moonCount = planet.courses?.length || 0;

                      if (isCurrentlyActive && moonCount === 1) {
                        const targetLink = planet.courses[0].link;
                        if (targetLink) {
                          navigate(targetLink);
                          return;
                        }
                      }

                      if (isCurrentlyActive) {
                        handleReset();
                      } else {
                        setPreviousIndex(activeIndex);
                        setActiveIndex(index);
                      }
                    }}
                    onMouseEnter={() => !isMenuOpen && setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orbit Circle */}
      {activeIndex !== null && hasShiftedLeft && (
        <svg
          style={{
            position: "fixed",
            left: targetCenter.x,
            top: targetCenter.y,
            width: 110 * 2 + 4,
            height: 110 * 2 + 4,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 1999,
            transition: "opacity 0.5s ease",
          }}
        >
          <circle
            cx={110 + 2}
            cy={110 + 2}
            r={110}
            fill="none"
            stroke="#1c070045"
            strokeWidth="0.4"
            strokeDasharray="4 4"
          />
        </svg>
      )}

      {/* Moons Logic */}
      {activeIndex !== null &&
        hasShiftedLeft &&
        displayPlanets[activeIndex]?.courses?.map((moon, idx) => (
          <MoonPortrait
            key={`new-${activeIndex}-${idx}`}
            index={idx}
            totalMoons={displayPlanets[activeIndex].courses.length}
            planetId={displayPlanets[activeIndex].id}
            moon={moon}
            orbitRadius={110}
            currentLang={currentLang}
            enterDirection={scrollDirection === "down" ? "top" : "bottom"}
            planetCenter={targetCenter}
          />
        ))}

      {previousIndex !== null &&
        hasShiftedLeft &&
        displayPlanets[previousIndex]?.courses?.map((moon, idx) => (
          <MoonPortrait
            key={`old-${previousIndex}-${idx}`}
            index={idx}
            totalMoons={displayPlanets[previousIndex].courses.length}
            planetId={displayPlanets[previousIndex].id}
            moon={moon}
            orbitRadius={110}
            currentLang={currentLang}
            exitOnly
            exitDirection={scrollDirection === "down" ? "bottom" : "top"}
            planetCenter={targetCenter}
          />
        ))}
    </div>
  );
}
