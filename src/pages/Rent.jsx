import { useState, useEffect, useRef } from "react";
import Header from "../components/Header/Header";
import RentalForm from "../components/Rental/RentalForm";
import {
  Info,
  MapPin,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CONFIG = {
  TRANSITION_SPEED: 1400,
  EMPTY_PAUSE: 1000,
  MIN_WAIT: 8000,
  RANDOM_WAIT: 4000,
};

const planetImages = import.meta.glob("../assets/atelier/*.png", {
  eager: true,
});

const getImage = (filename) => {
  const key = `../assets/atelier/${filename}`;
  return planetImages[key]?.default || "";
};

export default function Rent({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const formRef = useRef(null);

  const leftIdxRef = useRef(0);
  const rightIdxRef = useRef(1);

  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  const [leftPos, setLeftPos] = useState({ t: -35, l: -100, s: 1 });
  const [rightPos, setRightPos] = useState({ t: 30, l: 40, s: 1 });

  const allPlanets = [
    "icon_1.png",
    "icon_2.png",
    "icon_3.png",
    "icon_4.png",
    "icon_5.png",
  ];

  const getRandomIndex = (excludeIdx) => {
    let newIdx;
    do {
      newIdx = Math.floor(Math.random() * allPlanets.length);
    } while (newIdx === excludeIdx);
    return newIdx;
  };

  const getRandomPos = (side) => {
    if (side === "left") {
      return {
        t: Math.floor(Math.random() * 30) - 50,
        l: Math.floor(Math.random() * 40) - 120,
        s: 0.8 + Math.random() * 0.4,
      };
    }
    return {
      t: Math.floor(Math.random() * 40) + 10,
      l: Math.floor(Math.random() * 40) + 20,
      s: 0.8 + Math.random() * 0.4,
    };
  };

  // Planet Animation Effects
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
            CONFIG.MIN_WAIT + Math.random() * CONFIG.RANDOM_WAIT,
          );
        }, CONFIG.EMPTY_PAUSE);
      }, CONFIG.TRANSITION_SPEED);
    };
    timeoutId = setTimeout(swapLeft, CONFIG.MIN_WAIT);
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
            CONFIG.MIN_WAIT + 2000 + Math.random() * CONFIG.RANDOM_WAIT,
          );
        }, CONFIG.EMPTY_PAUSE);
      }, CONFIG.TRANSITION_SPEED);
    };
    timeoutId = setTimeout(swapRight, CONFIG.MIN_WAIT + 5000);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleTransitionEnd = (e) => {
    // We target max-height because that determines the final size of the container
    if (e.propertyName === "max-height" && isCalendarOpen && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const content = {
    en: {
      title: "Rent the Atelier",
      welcome: "a creative oasis for your independent projects",
      ctaOpen: "Show Calendar",
      ctaClose: "Hide Calendar",
      details: [
        { icon: <MapPin size={18} />, text: "Central Location" },
        { icon: <Sparkles size={18} />, text: "Full Equipment" },
        { icon: <Info size={18} />, text: "By Request" },
      ],
    },
    de: {
      title: "Atelier mieten",
      welcome: "Ein kreativer Rückzugsort für deine Projekte",
      ctaOpen: "Kalender zeigen",
      ctaClose: "Kalender ausblenden",
      details: [
        { icon: <MapPin size={18} />, text: "Zentrale Lage" },
        { icon: <Sparkles size={18} />, text: "Voll ausgestattet" },
        { icon: <Info size={18} />, text: "Auf Anfrage" },
      ],
    },
  };

  const styles = {
    main: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "140px 20px 40px 20px",
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
      marginBottom: "25px",
      fontWeight: "500",
    },
    titleWrapper: {
      position: "relative",
      display: "inline-block",
      marginBottom: "30px",
    },
    title: {
      fontSize: "3.5rem",
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
      transition: `transform ${CONFIG.TRANSITION_SPEED}ms cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                    opacity ${CONFIG.TRANSITION_SPEED - 400}ms ease-in-out, 
                    top 2s ease-in-out, left 2s ease-in-out`,
      filter: isVisible ? "blur(0px)" : "blur(8px)",
    }),
    infoGrid: {
      display: "flex",
      justifyContent: "center",
      gap: "10px",
      marginBottom: "40px",
      flexWrap: "wrap",
    },
    infoItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      background: "#caaff31e",
      borderRadius: "100px",
      fontSize: "0.8rem",
      color: "#1c0700",
    },
    toggleButton: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px 28px",
      background: "#4e5f28",
      color: "#fff",
      border: "none",
      borderRadius: "100px",
      cursor: "pointer",
      fontSize: "0.9rem",
      fontWeight: "500",
      transition: "all 0.3s ease",
      marginBottom: "30px",
    },
    formContainer: {
      width: "100%",
      display: "flex",
      justifyContent: "center",
      maxHeight: isCalendarOpen ? "1000px" : "0px", // Reduced from 1500 to minimize transition "overhang"
      opacity: isCalendarOpen ? 1 : 0,
      overflow: "hidden",
      transition:
        "max-height 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease",
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
            50% { transform: translate(10px, -15px) rotate(4deg); }
          }
          
          .toggle-btn:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(28, 7, 0, 0.15);
          }

          @media (max-width: 768px) {
            .course-title { font-size: 2.5rem !important; }
            .icon-touch { 
              left: -40px !important; 
              top: -30px !important; 
              width: 50px !important; 
              height: 50px !important; 
            }
            .icon-sight { 
              left: calc(100% - 10px) !important; 
              top: 30px !important; 
              width: 50px !important; 
              height: 50px !important; 
            }
            
            .welcome-text {
              width: 90% !important;
              max-width: 320px !important;
              margin: 0 auto 25px auto !important;
              line-height: 1.4 !important;
            }

            .info-grid {
              display: flex !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 12px !important;
              width: 100% !important;
              max-width: 170px !important;
              margin: 0 auto 40px auto !important;
            }
            .info-item { width: fit-content !important; }
            .info-item:nth-child(even) { align-self: flex-end !important; }
          }
        `}
      </style>

      <main style={styles.main}>
        <div className="title-wrapper" style={styles.titleWrapper}>
          <img
            src={getImage(allPlanets[leftIndex])}
            alt=""
            className="icon-touch"
            style={styles.moon(leftPos, "left", 14, showLeft)}
          />
          <h1 className="course-title" style={styles.title}>
            {content[currentLang].title}
          </h1>
          <img
            src={getImage(allPlanets[rightIndex])}
            alt=""
            className="icon-sight"
            style={styles.moon(rightPos, "right", 19, showRight)}
          />
        </div>

        <p className="welcome-text" style={styles.welcomeText}>
          {content[currentLang].welcome}
        </p>

        <div className="info-grid" style={styles.infoGrid}>
          {content[currentLang].details.map((item, i) => (
            <div key={i} className="info-item" style={styles.infoItem}>
              <span style={{ opacity: 0.6 }}>{item.icon}</span>
              <span style={{ fontWeight: "500" }}>{item.text}</span>
            </div>
          ))}
        </div>

        <button
          className="toggle-btn"
          style={styles.toggleButton}
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          <Calendar size={18} />
          {isCalendarOpen
            ? content[currentLang].ctaClose
            : content[currentLang].ctaOpen}
          {isCalendarOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <div
          ref={formRef}
          style={styles.formContainer}
          onTransitionEnd={handleTransitionEnd}
        >
          <RentalForm lang={currentLang} />
        </div>
      </main>
    </div>
  );
}
