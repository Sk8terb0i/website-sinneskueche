import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PlanetPortrait from "../components/Planet/PlanetPortrait";
import TeamMoonPortrait from "../components/Moon/TeamMoonPortrait";
import SunPortrait from "../components/Sun/SunPortrait";
import Header from "../components/Header/Header";
import { planets } from "../data/teammembers";

export default function TeamPortrait({ currentLang, setCurrentLang }) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(null);
  const [previousIndex, setPreviousIndex] = useState(null);
  const [hasShiftedLeft, setHasShiftedLeft] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrollDirection, setScrollDirection] = useState("down");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const bioPanelRef = useRef(null);

  // --- DYNAMIC SIZING ---
  // Mobile check (typical breakpoint)
  const isMobile = viewport.width <= 768;

  // Exact original sizing for desktop, reduced for mobile
  const planetSize = isMobile ? 70 : 80;
  const sunSize = isMobile ? 120 : 150;

  // Custom offset to push/pull the system
  const verticalOffset = isMobile ? 50 : 0;

  useEffect(() => {
    const handleResize = () => {
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

  const displayPlanets = useMemo(
    () => planets.filter((p) => p.type === "courses"),
    [],
  );

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
    setPreviousIndex(activeIndex); // <--- Remember the current planet for the exit animation
    setActiveIndex(null);
    setTimeout(() => {
      setIsLoaded(true);
      setIsResetting(false);
      setPreviousIndex(null); // <--- Clear it after the animation finishes
    }, 400);
  };

  // Reset bio panel scroll position when changing team members
  useEffect(() => {
    if (bioPanelRef.current) {
      bioPanelRef.current.scrollTop = 0;
    }
  }, [activeIndex]);

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

      // Check if user is hovering the panel AND the panel actually needs scrolling
      if (bioPanelRef.current && bioPanelRef.current.contains(e.target)) {
        const panel = bioPanelRef.current;
        if (panel.scrollHeight > panel.clientHeight) {
          return; // Block planet scroll only if panel is scrollable
        }
      }

      e.preventDefault();
      if (Math.abs(e.deltaY) < 10) return;
      scrollHandler(e.deltaY > 0 ? "down" : "up");
    };

    const handleTouchStart = (e) => {
      if (isMenuOpenRef.current) return;

      if (bioPanelRef.current && bioPanelRef.current.contains(e.target)) {
        const panel = bioPanelRef.current;
        if (panel.scrollHeight > panel.clientHeight) {
          return;
        }
      }

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

      if (bioPanelRef.current && bioPanelRef.current.contains(e.target)) {
        const panel = bioPanelRef.current;
        if (panel.scrollHeight > panel.clientHeight) {
          return;
        }
      }

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
    for (let i = displayPlanets.length - 1; i >= targetIndex; i--) {
      distance += normalGap;
      if (i === targetIndex) distance += planetSize / 2;
      else distance += planetSize;
    }
    return distance * 2;
  };

  const idleTotalHeight =
    displayPlanets.length * planetSize +
    (displayPlanets.length - 1) * normalGap +
    sunSize;

  // Estimate the height of the text block based on screen size
  const introTextHeight = isMobile ? 250 : 200;
  const safeTopMargin = 120 + introTextHeight; // Top offset + text height

  const idleTranslateY = isMobile
    ? viewport.height - (idleTotalHeight - sunSize / 2) - verticalOffset
    : Math.max(
        viewport.height / 2 - idleTotalHeight / 2,
        safeTopMargin, // <--- Ensures planets stop below the text
      );

  // 1. Define the targets first
  const activeTargetY = isMobile
    ? viewport.height * 0.28
    : viewport.height * 0.5;

  const targetCenter = {
    x: isMobile ? viewport.width * 0.5 : viewport.width * 0.4,
    y: activeTargetY,
  };

  // 2. Define the compute function
  const computeTranslateY = () => {
    if (activeIndex === null) {
      return idleTranslateY;
    }
    const getAccumulatedHeight = (idx) => {
      let h = 0;
      for (let i = 0; i < idx; i++) {
        h += getPlanetSize(i) + expandedGap;
      }
      return h;
    };
    return (
      activeTargetY -
      getAccumulatedHeight(activeIndex) -
      getPlanetSize(activeIndex) / 2
    );
  };

  // 3. NOW you can call it safely!
  const translateY = computeTranslateY();

  // 4. Continue with the rest of your calculations
  const sunTopPosition =
    idleTranslateY +
    displayPlanets.length * planetSize +
    displayPlanets.length * normalGap;

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

  const handleNextPlanet = (e) => {
    e.stopPropagation();
    setScrollDirection("down");
    setActiveIndex((prev) => {
      const total = displayPlanets.length;
      const nextIndex = prev === null ? 0 : (prev + 1) % total;
      if (nextIndex !== prev) setPreviousIndex(prev);
      return nextIndex;
    });
  };

  return (
    <div
      onClick={handleReset}
      style={{
        height: "100dvh",
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
          
          /* NEW: Custom Scrollbar */
          .bio-panel::-webkit-scrollbar {
            width: 6px;
          }
          .bio-panel::-webkit-scrollbar-track {
            background: transparent;
            margin: 20px 0; /* Keeps scrollbar away from edges */
          }
          .bio-panel::-webkit-scrollbar-thumb {
            background-color: rgba(28, 7, 0, 0.15);
            border-radius: 10px;
          }
          .bio-panel::-webkit-scrollbar-thumb:hover {
            background-color: rgba(28, 7, 0, 0.3);
          }

          /* NEW: Link Hover Effects */
          .bio-link {
            background-color: #caaff380; /* Lavender */
            color: #1c0700;
            transition: all 0.2s ease;
          }
          .bio-link:hover {
            background-color: #9a60a8d7; /* Dark Purple */
            color: #1c0700;
            transform: translateY(-2px);
          }
            /* NEW: Mobile Next Indicator Bounce */
          @keyframes subtleBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(6px); }
          }
          .bio-link svg {
            transition: transform 0.2s ease;
          }
          .bio-link:hover svg {
            transform: translate(2px, -2px);
          }

          /* NEW: Smooth content transition between team members */
          @keyframes contentFadeIn {
            0% { opacity: 0; transform: translateY(12px); }
            100% { opacity: 1; transform: translateY(0); }
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
        {displayPlanets.map((_, index) => (
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
        {displayPlanets.map((planet, index) => {
          const radius = getOrbitDiameter(index) / 2;
          const possibleAngles = [-90, 90, -180, 45, -45];
          const startAngle = possibleAngles[index % possibleAngles.length];
          const currentAngle = isLoaded ? 0 : startAngle;
          const translateX = hasShiftedLeft && !isMobile ? "-10vw" : "0";
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
                transformOrigin: `center ${radius}px`,
                transform: `rotate(${currentAngle}deg)`,
                translate: `${translateX} 0`,
              }}
            >
              <div
                style={{
                  transform: `rotate(${-currentAngle}deg)`,
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

      {activeIndex !== null &&
        hasShiftedLeft &&
        displayPlanets[activeIndex]?.courses?.map((moon, idx) => (
          <TeamMoonPortrait
            key={`new-${activeIndex}-${idx}`}
            index={idx}
            totalMoons={displayPlanets[activeIndex].courses.length}
            planetId={displayPlanets[activeIndex].id}
            moon={moon}
            orbitRadius={110}
            currentLang={currentLang}
            enterDirection={scrollDirection === "down" ? "top" : "bottom"}
            planetCenter={targetCenter}
            forceLeftSide={!isMobile} /* <--- NEW PROP */
          />
        ))}

      {previousIndex !== null &&
        hasShiftedLeft &&
        displayPlanets[previousIndex]?.courses?.map((moon, idx) => (
          <TeamMoonPortrait
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
            forceLeftSide={!isMobile} /* <--- NEW PROP */
          />
        ))}

      {/* PORTRAIT INTRO TEXT OVERLAY */}
      <div
        style={{
          position: "absolute",
          top: isMobile ? "100px" : "120px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 40px)",
          maxWidth: "600px",
          fontFamily: "Satoshi",
          fontSize: isMobile ? "0.75rem" : "0.85rem",
          lineHeight: "1.4",
          color: "#1c0700",
          opacity: activeIndex === null && isLoaded && !isMenuOpen ? 0.8 : 0,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
          zIndex: 1,
          textAlign: "center",
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
      {/* BIO PANEL */}
      {/* Define target data: If activeIndex is null (closing), use previousIndex 
        so the panel doesn't go blank mid-animation! 
      */}
      {(() => {
        const panelTargetIndex =
          activeIndex !== null ? activeIndex : previousIndex;
        const panelPlanet =
          panelTargetIndex !== null ? displayPlanets[panelTargetIndex] : null;
        const showPanel = activeIndex !== null && hasShiftedLeft;

        return (
          panelPlanet?.bio && (
            <div
              ref={bioPanelRef}
              className="bio-panel"
              style={{
                position: "absolute",
                top: isMobile ? "45%" : "15%",
                bottom: "0",
                left: isMobile ? "0" : "auto",
                right: isMobile ? "0" : "5%",
                width: isMobile ? "100%" : "40%",
                backgroundColor: isMobile ? "#fffce3" : "transparent",
                borderRadius: isMobile ? "30px 30px 0 0" : "0",
                padding: isMobile ? "25px 20px 40px 20px" : "10px 20px 20px 0",
                boxSizing: "border-box",
                boxShadow: isMobile
                  ? "0 -10px 40px rgba(28, 7, 0, 0.05)"
                  : "none",
                overflowY: "auto",
                zIndex: 1500,

                /* NEW: Smooth Opening and Closing Transitions */
                opacity: showPanel ? 1 : 0,
                transform: showPanel ? "translateY(0)" : "translateY(30px)",
                transition:
                  "opacity 0.4s ease, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                pointerEvents: showPanel ? "auto" : "none",

                fontFamily: "Satoshi",
                color: "#1c0700",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                key={`bio-content-${panelTargetIndex}`}
                style={{
                  animation:
                    "contentFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                }}
              >
                {/* Pronoun Tag */}
                {panelPlanet.pronouns && (
                  <div
                    style={{
                      display: "inline-block",
                      backgroundColor: "rgba(28, 7, 0, 0.03)",
                      border: "1px solid rgba(28, 7, 0, 0.1)",
                      color: "rgba(28, 7, 0, 0.6)",
                      padding: isMobile ? "3px 10px" : "4px 12px",
                      borderRadius: "16px",
                      fontSize: isMobile ? "0.65rem" : "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      marginBottom: isMobile ? "16px" : "24px",
                    }}
                  >
                    {panelPlanet.pronouns[currentLang]}
                  </div>
                )}

                {/* Q&A Section */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobile ? "24px" : "35px",
                  }}
                >
                  {panelPlanet.bio[currentLang].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: isMobile ? "8px" : "12px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor: "rgba(78, 95, 40, 0.15)",
                          color: "#4e5f28",
                          padding: isMobile ? "5px 12px" : "6px 14px",
                          borderRadius: "20px",
                          fontSize: isMobile ? "0.75rem" : "0.85rem",
                          fontWeight: "bold",
                          alignSelf: "flex-start",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {item.q}
                      </span>
                      <p
                        style={{
                          fontSize: isMobile ? "0.85rem" : "1rem",
                          lineHeight: isMobile ? "1.5" : "1.6",
                          opacity: 0.9,
                          margin: 0,
                          paddingLeft: "4px",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Links Section */}
                {panelPlanet.links && (
                  <div
                    style={{
                      marginTop: isMobile ? "30px" : "45px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: isMobile ? "8px" : "10px",
                      paddingTop: "20px",
                      paddingBottom: isMobile ? "10px" : "30px",
                      borderTop: "1px solid rgba(28, 7, 0, 0.1)",
                    }}
                  >
                    {panelPlanet.links.map((link, idx) => {
                      const resolvedLabel =
                        typeof link.label === "object"
                          ? link.label[currentLang]
                          : link.label;
                      const resolvedUrl =
                        typeof link.url === "object"
                          ? link.url[currentLang]
                          : link.url;

                      return (
                        <a
                          key={idx}
                          href={resolvedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bio-link"
                          style={{
                            display: "inline-block",
                            textDecoration: "none",
                            fontSize: isMobile ? "0.8rem" : "0.9rem",
                            fontWeight: "600",
                            padding: isMobile ? "6px 14px" : "8px 18px",
                            borderRadius: "30px",
                          }}
                        >
                          {resolvedLabel}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Mobile 'Next' Indicator */}
                {isMobile && (
                  <div
                    style={{
                      marginTop: "20px",
                      paddingBottom: "20px",
                      display: "flex",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <button
                      onClick={handleNextPlanet}
                      style={{
                        background: "none",
                        border: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        color: "rgba(28, 7, 0, 0.4)",
                        cursor: "pointer",
                        fontFamily: "Satoshi",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontWeight: "bold",
                        padding: "10px",
                      }}
                    >
                      {currentLang === "de" ? "Weiter" : "Next"}
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          animation: "subtleBounce 2s ease-in-out infinite",
                        }}
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        );
      })()}
    </div>
  );
}
