import React, { useState, useEffect, useRef } from "react";

const CONFIG_ANIM = {
  TRANSITION_SPEED: 1400,
  EMPTY_PAUSE: 1000,
  MIN_WAIT: 8000,
  RANDOM_WAIT: 4000,
};

export default function CourseTitle({ title, config, icons = [] }) {
  // If more than 2 icons are passed, we activate the Artistic Vision dynamic swapping
  const isDynamic = icons.length > 2;
  const topImgStatic = icons.length > 0 ? icons[0] : null;
  const bottomImgStatic = icons.length > 1 ? icons[1] : null;

  // --- DYNAMIC STATE (Only runs if isDynamic is true) ---
  const leftIdxRef = useRef(0);
  const rightIdxRef = useRef(1);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  const [leftPos, setLeftPos] = useState({
    t: config.dynamicBase?.top?.t || -35,
    l: config.dynamicBase?.top?.l || -100,
    s: 1,
  });
  const [rightPos, setRightPos] = useState({
    t: config.dynamicBase?.bottom?.t || 30,
    l: config.dynamicBase?.bottom?.l || 40,
    s: 1,
  });

  const getRandomIndex = (excludeIdx) => {
    let newIdx;
    do {
      newIdx = Math.floor(Math.random() * icons.length);
    } while (newIdx === excludeIdx);
    return newIdx;
  };

  const getRandomPos = (side) => {
    const base =
      side === "left"
        ? config.dynamicBase?.top || { t: -35, l: -100 }
        : config.dynamicBase?.bottom || { t: 30, l: 40 };
    return {
      t: base.t + (Math.floor(Math.random() * 20) - 10),
      l: base.l + (Math.floor(Math.random() * 20) - 10),
      s: 0.8 + Math.random() * 0.4,
    };
  };

  useEffect(() => {
    if (!isDynamic) return;
    let timeoutId;
    const swapLeft = () => {
      setShowLeft(false);
      timeoutId = setTimeout(() => {
        const nextIdx = getRandomIndex(rightIdxRef.current);
        leftIdxRef.current = nextIdx;
        setLeftIndex(nextIdx);
        setLeftPos(getRandomPos("left"));
        timeoutId = setTimeout(() => {
          setShowLeft(true);
          timeoutId = setTimeout(
            swapLeft,
            CONFIG_ANIM.MIN_WAIT + Math.random() * CONFIG_ANIM.RANDOM_WAIT,
          );
        }, CONFIG_ANIM.EMPTY_PAUSE);
      }, CONFIG_ANIM.TRANSITION_SPEED);
    };
    timeoutId = setTimeout(swapLeft, CONFIG_ANIM.MIN_WAIT);
    return () => clearTimeout(timeoutId);
  }, [isDynamic, icons]);

  useEffect(() => {
    if (!isDynamic) return;
    let timeoutId;
    const swapRight = () => {
      setShowRight(false);
      timeoutId = setTimeout(() => {
        const nextIdx = getRandomIndex(leftIdxRef.current);
        rightIdxRef.current = nextIdx;
        setRightIndex(nextIdx);
        setRightPos(getRandomPos("right"));
        timeoutId = setTimeout(() => {
          setShowRight(true);
          timeoutId = setTimeout(
            swapRight,
            CONFIG_ANIM.MIN_WAIT +
              2000 +
              Math.random() * CONFIG_ANIM.RANDOM_WAIT,
          );
        }, CONFIG_ANIM.EMPTY_PAUSE);
      }, CONFIG_ANIM.TRANSITION_SPEED);
    };
    timeoutId = setTimeout(swapRight, CONFIG_ANIM.MIN_WAIT + 5000);
    return () => clearTimeout(timeoutId);
  }, [isDynamic, icons]);

  // --- STYLES ---
  const styles = {
    titleWrapper: {
      position: "relative",
      display: "inline-block",
      marginBottom: "40px",
      lineHeight: 1,
    },
    title: {
      fontSize: config.desktop.titleSize,
      margin: 0,
      zIndex: 2,
      position: "relative",
      color: "#1c0700",
      lineHeight: "1.1",
    },
    staticMoon: (top, left, delay) => ({
      position: "absolute",
      width: "65px",
      height: "65px",
      top: top,
      left: left,
      objectFit: "contain",
      pointerEvents: "none",
      zIndex: 1,
      animation: `drift 12s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }),
    dynamicMoon: (pos, side, duration, isVisible) => ({
      position: "absolute",
      width: "65px",
      height: "65px",
      top: `${pos.t}px`,
      left: side === "left" ? `${pos.l}px` : `calc(100% + ${pos.l}px)`,
      objectFit: "contain",
      pointerEvents: "none",
      zIndex: 1,
      animation: `drift ${duration}s ease-in-out infinite`,
      opacity: isVisible ? 1 : 0,
      transform: isVisible
        ? `scale(${pos.s}) rotate(0deg)`
        : `scale(0) rotate(${side === "left" ? -45 : 45}deg)`,
      filter: isVisible ? "blur(0px)" : "blur(15px)",
      transition: `
        transform ${CONFIG_ANIM.TRANSITION_SPEED}ms cubic-bezier(0.175, 0.885, 0.32, 1.275), 
        opacity ${CONFIG_ANIM.TRANSITION_SPEED - 400}ms ease-in-out, 
        filter ${CONFIG_ANIM.TRANSITION_SPEED}ms ease-out, 
        top 2s ease-in-out, 
        left 2s ease-in-out
      `,
    }),
  };

  const topImg = isDynamic ? icons[leftIndex] : topImgStatic;
  const bottomImg = isDynamic ? icons[rightIndex] : bottomImgStatic;

  return (
    <>
      <style>
        {`
          @keyframes drift {
            0%, 100% { transform: translate(0, 0) rotate(-3deg); }
            50% { transform: translate(15px, -15px) rotate(4deg); }
          }

          @media (max-width: 768px) {
            .title-wrapper {
              order: 1;
              margin-bottom: 8px !important;
              width: fit-content;
            }
            .course-title {
              font-size: ${config.mobile.titleSize} !important;
            }
            .icon-top {
              top: ${config.mobile.topIcon.top} !important;
              left: ${config.mobile.topIcon.left} !important;
            }
            .icon-bottom {
              top: ${config.mobile.bottomIcon.top} !important;
              left: ${config.mobile.bottomIcon.left} !important;
            }
          }
        `}
      </style>
      <div className="title-wrapper" style={styles.titleWrapper}>
        {topImg && (
          <img
            src={topImg}
            alt="Decoration"
            className="icon-top"
            style={
              isDynamic
                ? styles.dynamicMoon(leftPos, "left", 14, showLeft)
                : styles.staticMoon(
                    config.desktop.topIcon.top,
                    config.desktop.topIcon.left,
                    0,
                  )
            }
          />
        )}
        <h1 className="course-title" style={styles.title}>
          {title}
        </h1>
        {bottomImg && (
          <img
            src={bottomImg}
            alt="Decoration"
            className="icon-bottom"
            style={
              isDynamic
                ? styles.dynamicMoon(rightPos, "right", 19, showRight)
                : styles.staticMoon(
                    config.desktop.bottomIcon.top,
                    config.desktop.bottomIcon.left,
                    -3,
                  )
            }
          />
        )}
      </div>
    </>
  );
}
