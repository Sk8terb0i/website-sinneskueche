import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Keep track of last used angles globally to avoid overlap
const lastUsedAngles = [];

export default function MoonPortrait({
  moon,
  orbitRadius = 100,
  currentLang,
  exitOnly = false,
  enterDirection = "top", // "top" or "bottom"
  exitDirection = "bottom", // "top" or "bottom"
  onHoverStart,
  onHoverEnd,
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Update width for dynamic label wrapping
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ---------------- Resolve content & link ----------------
  let content = "";
  let href = null;
  if (typeof moon === "object") {
    content =
      typeof moon.text === "object" ? moon.text[currentLang] : moon.text;
    href = moon.link || null;
  } else {
    content = moon;
  }

  // ---------------- 6 fixed positions ----------------
  const possibleAngles = [
    -Math.PI / 4,
    -Math.PI / 6,
    -Math.PI / 12,
    Math.PI / 12,
    Math.PI / 6,
    Math.PI / 4,
  ];

  const targetAngleRef = useRef(null);
  if (targetAngleRef.current === null) {
    const availableAngles = possibleAngles.filter(
      (a) => !lastUsedAngles.slice(-2).includes(a),
    );
    const chosen =
      availableAngles[Math.floor(Math.random() * availableAngles.length)];
    lastUsedAngles.push(chosen);
    targetAngleRef.current = chosen;
  }
  const targetAngle = targetAngleRef.current;

  const entryAngle =
    enterDirection === "top" ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5;
  const exitAngle =
    exitDirection === "bottom" ? Math.PI / 2 + 1 : -Math.PI / 2 - 1;

  // ---------------- Animation State ----------------
  const [animatedAngle, setAnimatedAngle] = useState(
    exitOnly ? targetAngle : entryAngle,
  );
  const [animatedOpacity, setAnimatedOpacity] = useState(exitOnly ? 1 : 0);
  const [animatedScale, setAnimatedScale] = useState(exitOnly ? 1 : 1);
  const [state, setState] = useState(exitOnly ? "exit" : "enter");

  const moveDuration = exitOnly ? 1200 : 800;
  const fadeOutDuration = 600;

  const startTimeRef = useRef(null);
  const startAngleRef = useRef(animatedAngle);
  const startOpacityRef = useRef(animatedOpacity);
  const startScaleRef = useRef(animatedScale);

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
        // Independent label fade
        const fadeT = Math.min(elapsed / fadeOutDuration, 1);
        setAnimatedOpacity(startOpacityRef.current * (1 - easeOutCubic(fadeT)));
      } else if (state === "enter") {
        targetA = targetAngle;
        targetS = 1;
        setAnimatedOpacity(easedMoveT);
      } else {
        return;
      }

      setAnimatedAngle(
        startAngleRef.current + (targetA - startAngleRef.current) * easedMoveT,
      );
      setAnimatedScale(
        startScaleRef.current + (targetS - startScaleRef.current) * easedMoveT,
      );

      if (moveT < 1) {
        requestAnimationFrame(step);
      } else if (state === "enter") {
        setState("idle");
      }
    };

    startTimeRef.current = null;
    startAngleRef.current = animatedAngle;
    startOpacityRef.current = animatedOpacity;
    startScaleRef.current = animatedScale;

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [state, targetAngle, exitAngle, moveDuration, fadeOutDuration]);

  // ---------------- Position & Style ----------------
  const moonX = Math.cos(animatedAngle) * orbitRadius;
  const moonY = Math.sin(animatedAngle) * orbitRadius;

  // Calculate max width for the label so it wraps before hitting screen edge
  const currentLeftPos = windowWidth * 0.1 + moonX;
  const maxLabelWidth = windowWidth - currentLeftPos - 60;

  const moonStyle = {
    position: "fixed",
    left: `calc(10vw + ${moonX}px)`,
    top: `calc(50vh + ${moonY}px)`,
    transform: "translate(-50%, -50%)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: href && state !== "exit" ? "auto" : "none",
    cursor: href ? "pointer" : "default",
    WebkitTapHighlightColor: "transparent", // Clean mobile taps
  };

  const circleStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: href ? (isHovered ? "#9960a8" : "white") : "#ffffff",
    transition: "background 0.2s ease",
    transform: `scale(${isHovered ? 1.2 : animatedScale})`,
    flexShrink: 0,
  };

  const labelStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    whiteSpace: "normal",
    wordWrap: "break-word",
    maxWidth: `${maxLabelWidth}px`,
    width: "max-content",
    minWidth: "120px",
    fontSize: isHovered ? "16px" : "14px",
    fontStyle: href ? "normal" : "italic",
    color: "#1c0700",
    textDecoration: href && isHovered ? "underline" : "none",
    left: "100%",
    marginLeft: "12px",
    opacity: animatedOpacity,
    lineHeight: "1.2",
    pointerEvents: "auto",
    transition: "color 0.2s, font-size 0.2s, text-decoration 0.2s",
  };

  return (
    <div
      style={moonStyle}
      onClick={(e) => {
        if (!href || state === "exit") return;
        e.stopPropagation(); // Prevents background reset
        if (href.startsWith("http")) {
          window.open(href, "_blank", "noreferrer");
        } else {
          navigate(href);
        }
      }}
      // --- Desktop Controls ---
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
      // --- Mobile Controls ---
      onTouchStart={() => {
        if (href && state !== "exit") {
          setIsHovered(true);
          onHoverStart?.();
        }
      }}
      onTouchEnd={() => {
        setTimeout(() => {
          setIsHovered(false);
          onHoverEnd?.();
        }, 150);
      }}
    >
      <div style={circleStyle} />
      <span style={labelStyle}>{content}</span>
    </div>
  );
}
