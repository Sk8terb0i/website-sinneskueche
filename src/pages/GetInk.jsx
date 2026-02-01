import { useState } from "react";
import Header from "../components/Header/Header";
import { Clock, Users, PenTool } from "lucide-react";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});

const getImage = (filename) => {
  const key = `../assets/planets/${filename}`;
  return planetImages[key]?.default || "";
};

export default function GetInk({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- EASY CONFIG SECTION ---
  const config = {
    desktop: {
      touch: { top: "-35px", left: "-120px" },
      sight: { top: "40px", left: "calc(100% + 60px)" },
      titleSize: "4.5rem",
    },
    mobile: {
      touch: { top: "-10px", left: "-10px" },
      sight: { top: "45px", left: "calc(100% - 55px)" },
      titleSize: "4.5rem",
    },
  };
  // ---------------------------

  const content = {
    en: {
      title: "get ink!",
      welcome: "tattoo art and expression",
      details: [
        { icon: <Clock size={20} />, text: "by appointment" },
        { icon: <Users size={20} />, text: "custom designs" },
        { icon: <PenTool size={20} />, text: "professional studio" },
      ],
    },
    de: {
      title: "get ink!",
      welcome: "tattookunst und ausdruck",
      details: [
        { icon: <Clock size={20} />, text: "nach vereinbarung" },
        { icon: <Users size={20} />, text: "individuelle designs" },
        { icon: <PenTool size={20} />, text: "professionelles studio" },
      ],
    },
  };

  const touchImg = getImage("touch.png");
  const sightImg = getImage("sight.png");

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
    moon: (top, left, delay) => ({
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
              display: flex;
              flex-direction: column;
              align-items: center;
              padding-top: 120px !important;
            }
            .title-wrapper {
              order: 1;
              margin-bottom: 8px !important;
              width: fit-content; 
            }
            .course-title {
              font-size: ${config.mobile.titleSize} !important;
            }
            .welcome-text {
              order: 2;
              margin-bottom: 40px !important;
              font-size: 0.9rem !important;
              width: 50vw;
            }
            .info-grid {
              order: 3;
              flex-direction: column !important;
              gap: 12px !important;
              width: 100%;
            }
            
            .icon-top {
              top: ${config.mobile.touch.top} !important;
              left: ${config.mobile.touch.left} !important;
            }
            .icon-bottom {
              top: ${config.mobile.sight.top} !important;
              left: ${config.mobile.sight.left} !important;
            }

            .info-item:nth-child(1) { transform: translateX(-15px); }
            .info-item:nth-child(2) { transform: translateX(15px); }
            .info-item:nth-child(3) { transform: translateX(-10px); }
          }
        `}
      </style>

      <main style={styles.main} className="main-content">
        <div className="title-wrapper" style={styles.titleWrapper}>
          {touchImg && (
            <img
              src={touchImg}
              alt="Touch"
              className="icon-top"
              style={styles.moon(
                config.desktop.touch.top,
                config.desktop.touch.left,
                0,
              )}
            />
          )}
          <h1 className="course-title" style={styles.title}>
            {content[currentLang].title}
          </h1>
          {sightImg && (
            <img
              src={sightImg}
              alt="Sight"
              className="icon-bottom"
              style={styles.moon(
                config.desktop.sight.top,
                config.desktop.sight.left,
                -3,
              )}
            />
          )}
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
