import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import moonImage from "../../assets/planets/moon.png"; // Adjust path if necessary

const lastUsedAngles = [];

export default function MoonPortrait({
  moon,
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

      {/* Orbit SVG */}
      <svg
        style={{
          position: "fixed",
          left: centerX,
          top: centerY,
          width: orbitRadius * 2 + 4,
          height: orbitRadius * 2 + 4,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 1999,
          opacity: 0.4,
        }}
      >
        <circle
          cx={orbitRadius + 2}
          cy={orbitRadius + 2}
          r={orbitRadius}
          fill="none"
          stroke="#1c0700"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

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
        onClick={(e) => {
          e.stopPropagation();
          if (state === "exit") return;
          if (!href) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400);
            return;
          }
          if (href.startsWith("http"))
            window.open(href, "_blank", "noreferrer");
          else navigate(href);
        }}
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
        {/* REPLACED: Image instead of white circle */}
        <img
          src={moonImage}
          alt="moon"
          style={{
            width: "32px",
            height: "32px",
            objectFit: "contain",
            transition:
              "filter 0.2s ease, transform 0.2s ease, opacity 0.2s ease",
            transform: `scale(${isHovered ? 1.2 : animatedScale})`,
            opacity: animatedOpacity,
            // If hovering over a link, we give it a slight purple tint/glow
            // otherwise keep it normal. Shaking makes it slightly transparent.
            filter: isShaking
              ? "brightness(1.5) opacity(0.7)"
              : href && isHovered
                ? "drop-shadow(0 0 5px #9960a8) drop-shadow(0 0 1px #9960a8)"
                : "none",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "100%",
            marginLeft: "12px",
            transform: "translateY(-50%)",
            display: "block",

            // --- GRAMMATICAL BREAKING LOGIC ---
            whiteSpace: "normal",
            wordBreak: "normal", // Avoids the ungrammatical "break-all"
            hyphens: "auto", // Breaks words at syllables (e.g., "en-ve-lope")
            WebkitHyphens: "auto", // Safari support
            textWrap: "pretty", // Prevents single words/letters on new lines
            // ----------------------------------

            maxWidth: `${windowWidth - (centerX + moonX) - 40}px`,
            width: "max-content",
            minWidth: "80px",
            fontSize: isHovered ? "16px" : "14px",
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
