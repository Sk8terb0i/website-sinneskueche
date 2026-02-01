import { useState, useEffect, useRef } from "react";
import Header from "../components/Header/Header";
import { Clock, Users, Sparkles } from "lucide-react";

const CONFIG_ANIM = {
  TRANSITION_SPEED: 1400,
  EMPTY_PAUSE: 1000,
  MIN_WAIT: 8000,
  RANDOM_WAIT: 4000,
};

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});

const getImage = (filename) => {
  const key = `../assets/planets/${filename}`;
  return planetImages[key]?.default || "";
};

export default function ArtisticVision({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- EASY CONFIG SECTION ---
  const config = {
    desktop: {
      topIcon: { top: -35, left: -100 },
      bottomIcon: { top: 30, left: 40 },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-10px", left: "-10px" },
      bottomIcon: { top: "45px", left: "calc(100% - 55px)" },
      titleSize: "4rem",
    },
  };
  // ---------------------------

  const leftIdxRef = useRef(0);
  const rightIdxRef = useRef(1);

  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // Initialize positions from desktop config
  const [leftPos, setLeftPos] = useState({
    t: config.desktop.topIcon.top,
    l: config.desktop.topIcon.left,
    s: 1,
  });
  const [rightPos, setRightPos] = useState({
    t: config.desktop.bottomIcon.top,
    l: config.desktop.bottomIcon.left,
    s: 1,
  });

  const allPlanets = [
    "sight.png",
    "smell.png",
    "touch.png",
    "hearing.png",
    "taste.png",
  ];

  const getRandomIndex = (excludeIdx) => {
    let newIdx;
    do {
      newIdx = Math.floor(Math.random() * allPlanets.length);
    } while (newIdx === excludeIdx);
    return newIdx;
  };

  // Logic now uses config values as base for random variance
  const getRandomPos = (side) => {
    const base =
      side === "left" ? config.desktop.topIcon : config.desktop.bottomIcon;
    return {
      t: base.top + (Math.floor(Math.random() * 20) - 10),
      l: base.left + (Math.floor(Math.random() * 20) - 10),
      s: 0.8 + Math.random() * 0.4,
    };
  };

  useEffect(() => {
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
  }, []);

  useEffect(() => {
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
  }, []);

  const content = {
    en: {
      title: "artistic vision",
      welcome: "expand your creative perspective",
      details: [
        { icon: <Clock size={20} />, text: "weekend intensive" },
        { icon: <Users size={20} />, text: "all creatives" },
        { icon: <Sparkles size={20} />, text: "multi-sensory approach" },
      ],
    },
    de: {
      title: "artistic vision",
      welcome: "erweitere deine kreative perspektive",
      details: [
        { icon: <Clock size={20} />, text: "wochenend-intensivkurs" },
        { icon: <Users size={20} />, text: "für alle kreativen" },
        { icon: <Sparkles size={20} />, text: "multi-sensorischer ansatz" },
      ],
    },
  };

  const styles = {
    main: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "160px 20px 80px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
    },
    welcomeText: {
      fontSize: "0.9rem",
      fontStyle: "italic",
      textTransform: "lowercase",
      letterSpacing: "0.15em",
      color: "#1c0700",
      opacity: 0.6,
      marginBottom: "12px",
      fontWeight: "500",
    },
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
    moon: (pos, side, duration, isVisible) => ({
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
    infoGrid: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      marginTop: "20px",
      flexWrap: "wrap",
    },
    infoItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 24px",
      background: "#caaff31e",
      borderRadius: "100px",
      color: "#1c0700",
      whiteSpace: "nowrap",
    },
    infoLabel: {
      fontSize: "0.9rem",
      lineHeight: "1.4",
      fontWeight: "500",
    },
  };

  return (
    <div className="course-container">
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <style>
        {`
          @keyframes drift {
            0%, 100% { transform: translate(0, 0) rotate(-3deg); }
            50% { transform: translate(15px, -15px) rotate(4deg); }
          }

          @media (max-width: 768px) {
            .main-content {
              padding-top: 120px !important;
            }
            .title-wrapper {
              width: fit-content;
              margin-bottom: 8px !important;
            }
            .course-title {
              font-size: ${config.mobile.titleSize} !important;
            }
            .welcome-text {
              margin-bottom: 40px !important;
              width: 50vw;
            }
            .info-grid {
              flex-direction: column !important;
              width: 100%;
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

      <main style={styles.main} className="main-content">
        <div className="title-wrapper" style={styles.titleWrapper}>
          <img
            src={getImage(allPlanets[leftIndex])}
            alt=""
            className="icon-top"
            style={styles.moon(leftPos, "left", 14, showLeft)}
          />
          <h1 className="course-title" style={styles.title}>
            {content[currentLang].title}
          </h1>
          <img
            src={getImage(allPlanets[rightIndex])}
            alt=""
            className="icon-bottom"
            style={styles.moon(rightPos, "right", 19, showRight)}
          />
        </div>

        <p className="welcome-text" style={styles.welcomeText}>
          {content[currentLang].welcome}
        </p>

        <div className="info-grid" style={styles.infoGrid}>
          {content[currentLang].details.map((item, index) => (
            <div key={index} className="info-item" style={styles.infoItem}>
              <div style={{ display: "flex", opacity: 0.7 }}>{item.icon}</div>
              <span style={styles.infoLabel}>{item.text}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
