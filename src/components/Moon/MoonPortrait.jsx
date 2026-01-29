import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import moonImage from "../../assets/planets/moon.png";

export default function MoonPortrait({
  moon,
  index,
  totalMoons = 1, // Added to calculate even spacing
  planetId,
  orbitRadius = 100,
  currentLang,
  exitOnly = false,
  enterDirection = "top",
  exitDirection = "bottom",
  planetCenter,
  onHoverStart,
  onHoverEnd,
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  let content = "";
  let href = null;
  if (typeof moon === "object") {
    content =
      typeof moon.text === "object" ? moon.text[currentLang] : moon.text;
    href = moon.link || null;
  } else {
    content = moon;
  }

  const centerX = planetCenter?.x ?? window.innerWidth * 0.3;
  const centerY = planetCenter?.y ?? window.innerHeight * 0.5;

  // --- START OF DYNAMIC ANGLE LOGIC ---
  // We define a range (in radians) to spread the moons.
  // Math.PI / 1.5 is roughly 120 degrees.
  const arcRange = Math.PI / 1.5;
  const startAngle = -arcRange / 2;

  // Calculate the specific angle for this moon index
  const targetAngle =
    totalMoons > 1 ? startAngle + index * (arcRange / (totalMoons - 1)) : 0; // Center if only one moon
  // --- END OF DYNAMIC ANGLE LOGIC ---

  const entryAngle =
    enterDirection === "top" ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5;
  const exitAngle =
    exitDirection === "bottom" ? Math.PI / 2 + 1 : -Math.PI / 2 - 1;

  const [animatedAngle, setAnimatedAngle] = useState(
    exitOnly ? targetAngle : entryAngle,
  );
  const [animatedOpacity, setAnimatedOpacity] = useState(exitOnly ? 1 : 0);
  const [animatedScale, setAnimatedScale] = useState(1);
  const [state, setState] = useState(exitOnly ? "exit" : "enter");

  const moveDuration = exitOnly ? 1200 : 800;
  const fadeOutDuration = 600;
  const startTimeRef = useRef(null);
  const startAngleRef = useRef(animatedAngle);

  useEffect(() => {
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const moveT = Math.min(elapsed / moveDuration, 1);
      const easedMoveT = easeOutCubic(moveT);
      let targetA = targetAngle;
      let targetS = 1;

      if (state === "exit") {
        targetA = exitAngle;
        targetS = 0;
        const fadeT = Math.min(elapsed / fadeOutDuration, 1);
        setAnimatedOpacity(1 - easeOutCubic(fadeT));
      } else if (state === "enter") {
        targetA = targetAngle;
        targetS = 1;
        setAnimatedOpacity(easedMoveT);
      }

      setAnimatedAngle(
        startAngleRef.current + (targetA - startAngleRef.current) * easedMoveT,
      );
      setAnimatedScale(1 + (targetS - 1) * easedMoveT);

      if (moveT < 1) requestAnimationFrame(step);
      else if (state === "enter") setState("idle");
    };
    startTimeRef.current = null;
    startAngleRef.current = animatedAngle;
    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [state, targetAngle, exitAngle]);

  const handleTap = (e) => {
    e.stopPropagation();
    if (state === "exit") return;

    setIsHovered(true);
    onHoverStart?.();

    if (!href) {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setIsHovered(false);
        onHoverEnd?.();
      }, 400);
      return;
    }

    setTimeout(() => {
      if (href.startsWith("http")) {
        window.open(href, "_blank", "noreferrer");
      } else {
        navigate(href);
      }
      setIsHovered(false);
      onHoverEnd?.();
    }, 200);
  };

  const moonX = Math.cos(animatedAngle) * orbitRadius;
  const moonY = Math.sin(animatedAngle) * orbitRadius;

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%); }
          20%, 60% { transform: translate(-55%, -50%); }
          40%, 80% { transform: translate(-45%, -50%); }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          left: centerX + moonX,
          top: centerY + moonY,
          transform: "translate(-50%, -50%)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: state !== "exit" ? "auto" : "none",
          cursor: href ? "pointer" : "default",
          WebkitTapHighlightColor: "transparent",
          animation: isShaking ? "shake 0.4s ease-in-out" : "none",
        }}
        onClick={handleTap}
        onMouseEnter={() => {
          if (href && state !== "exit") {
            setIsHovered(true);
            onHoverStart?.();
          }
        }}
        onMouseLeave={() => {
          if (href) {
            setIsHovered(false);
            onHoverEnd?.();
          }
        }}
      >
        <img
          src={moonImage}
          alt="moon"
          style={{
            width: "24px",
            height: "24px",
            objectFit: "contain",
            transition:
              "filter 0.2s ease, transform 0.2s ease, opacity 0.2s ease",
            transform: `scale(${isHovered ? 1.3 : animatedScale})`,
            opacity: animatedOpacity,
            filter: isShaking
              ? "brightness(1.5) opacity(0.7)"
              : href && isHovered
                ? "drop-shadow(0 0 8px #9960a8) drop-shadow(0 0 2px #9960a8)"
                : "none",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "100%",
            marginLeft: "6px",
            transform: "translateY(-50%)",
            display: "block",

            // The Fix:
            width: "max-content",
            maxWidth: `calc(${100 - ((centerX + moonX) / windowWidth) * 100}vw - 40px)`,
            whiteSpace: "normal",
            overflowWrap: "break-word",

            fontSize: isHovered ? "12px" : "10px",
            fontWeight: isHovered ? "bold" : "normal",
            fontStyle: href ? "normal" : "italic",
            color: isShaking ? "rgba(28, 7, 0, 0.5)" : "#1c0700",
            textDecoration: href && isHovered ? "underline" : "none",
            opacity: animatedOpacity,
            lineHeight: "1.2",
            transition: "all 0.2s ease",
          }}
        >
          {content}
        </span>
      </div>
    </>
  );
}
