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
  const [activePlanetCenter, setActivePlanetCenter] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  const activePlanetRef = useRef(null);
  const touchStartY = useRef(null);
  const touchLocked = useRef(false);

  const coursePlanets = planets.filter((p) => p.type === "courses");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ---------------- Scroll logic ----------------
  useEffect(() => {
    const scrollHandler = (direction) => {
      setScrollDirection(direction);
      setActiveIndex((prev) => {
        let nextIndex;

        if (direction === "down") {
          // If nothing is active, start "before" the first element so +1 equals 0
          const startIndex = prev ?? -1;
          nextIndex = (startIndex + 1) % coursePlanets.length;
        } else {
          // If nothing is active, start at the end so -1 goes to the last planet
          const startIndex = prev ?? 0;
          nextIndex =
            (startIndex - 1 + coursePlanets.length) % coursePlanets.length;
        }

        if (nextIndex !== prev) setPreviousIndex(prev);
        return nextIndex;
      });
    };

    const handleWheel = (e) => {
      e.preventDefault();
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

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [coursePlanets.length]);

  // ---------------- UI Calculations ----------------
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

  const computeTranslateY = () => {
    if (activeIndex === null) {
      const totalHeight =
        coursePlanets.reduce((sum, _, i) => sum + getPlanetSize(i), 0) +
        (coursePlanets.length - 1) * normalGap +
        sunSize;

      // 1. Calculate the ideal centered position
      const centeredY = window.innerHeight / 2 - totalHeight / 2;

      // 2. Define the minimum top margin (0.07 =7vh)
      const minTopMargin = window.innerHeight * 0.07;

      // 3. Return whichever is larger (ensures it never goes above 7vh)
      return Math.max(centeredY, minTopMargin);
    }

    // ... existing logic for activeIndex !== null
    let offsetAbove = 0;
    for (let i = 0; i < activeIndex; i++) {
      offsetAbove += getPlanetSize(i) + expandedGap;
    }
    return (
      window.innerHeight * 0.48 - (offsetAbove + getPlanetSize(activeIndex) / 2)
    );
  };

  const translateY = computeTranslateY();

  // ---------------- Easing Constant ----------------
  // This curve creates the overshoot (the 1.56 value)
  const springEase = "cubic-bezier(0.34, 1.56, 0.64, 1)";

  useEffect(() => {
    if (activeIndex !== null && !hasShiftedLeft) {
      setTimeout(() => setHasShiftedLeft(true), 200);
    } else if (activeIndex === null) {
      setHasShiftedLeft(false);
    }
  }, [activeIndex]);

  useEffect(() => {
    const updatePosition = () => {
      if (activePlanetRef.current) {
        const rect = activePlanetRef.current.getBoundingClientRect();
        setActivePlanetCenter({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 1000);
    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
    };
  }, [activeIndex, translateY, hasShiftedLeft, isLoaded]);

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
          isPlanetActive={activeIndex !== null} // Pass the active state here
        />
      </div>

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setActiveIndex(null);
          } else {
            e.stopPropagation();
          }
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: activeIndex !== null ? expandedGap : normalGap,
          transform: `translateY(${translateY}px)`,
          // Container Y-movement now uses the springEase
          transition: `transform 1s ${springEase}, gap 0.5s`,
          width: "fit-content",
        }}
      >
        {coursePlanets.map((planet, index) => {
          const radius = getOrbitDiameter(index) / 2;
          const speedFactor = 0.0016;
          const circumference = 2 * Math.PI * radius;

          const possibleAngles = [-90, 90, -180, 45, -45];
          let startAngle =
            index === coursePlanets.length - 1
              ? 180
              : possibleAngles[index % possibleAngles.length];

          const arcFraction = Math.abs(startAngle) / 360;
          const orbitDuration =
            circumference * arcFraction * speedFactor + 0.25;
          const currentAngle = isLoaded ? 0 : startAngle;

          let translateX = "0";
          if (hasShiftedLeft) {
            translateX = activeIndex === index ? "-20vw" : "-40vw";
          }

          return (
            <div
              key={planet.id}
              onClick={(e) => e.stopPropagation()}
              style={{
                zIndex: 2,
                // Rotation and Horizontal shift now use springEase
                transition: `transform ${orbitDuration}s ${springEase}, 
                             translate 1s ${springEase}`,
                transformOrigin: `center ${radius}px`,
                transform: `rotate(${currentAngle}deg)`,
                translate: `${translateX} 0`,
              }}
            >
              <div
                ref={activeIndex === index ? activePlanetRef : null}
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
                    const newIndex = activeIndex === index ? null : index;
                    if (newIndex !== activeIndex) setPreviousIndex(activeIndex);
                    setActiveIndex(newIndex);
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </div>
            </div>
          );
        })}

        {/* Sun & Orbits */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveIndex(null);
          }}
          style={{
            position: "relative",
            width: sunSize,
            height: sunSize,
            transition: `opacity 0.8s ease, transform 1s ${springEase}`,
            opacity: activeIndex === null ? 1 : 0,
            transform: hasShiftedLeft ? "translateX(-40vw)" : "translateX(0)",
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

      {/* Moons Logic */}
      {activeIndex !== null &&
        hasShiftedLeft &&
        coursePlanets[activeIndex].courses?.map((moon, idx) => (
          <div
            key={`new-${activeIndex}-${idx}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoonPortrait
              moon={moon}
              index={idx}
              totalMoons={coursePlanets[activeIndex].courses.length}
              orbitRadius={120}
              currentLang={currentLang}
              enterDirection={scrollDirection === "down" ? "top" : "bottom"}
              planetCenter={activePlanetCenter}
            />
          </div>
        ))}

      {previousIndex !== null &&
        hasShiftedLeft &&
        coursePlanets[previousIndex].courses?.map((moon, idx) => (
          <div
            key={`old-${previousIndex}-${idx}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoonPortrait
              moon={moon}
              index={idx}
              totalMoons={coursePlanets[previousIndex].courses.length}
              orbitRadius={120}
              currentLang={currentLang}
              exitOnly
              exitDirection={scrollDirection === "down" ? "bottom" : "top"}
              planetCenter={activePlanetCenter}
            />
          </div>
        ))}
    </div>
  );
}
