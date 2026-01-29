import { useState } from "react";
import Header from "../components/Header/Header";
import { Clock, Users, BookOpen } from "lucide-react";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});

const getImage = (filename) => {
  const key = `../assets/planets/${filename}`;
  return planetImages[key]?.default || "";
};

export default function PerformingWords({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const content = {
    en: {
      title: "performing words",
      welcome: "where literature meets movement",
      details: [
        { icon: <Clock size={20} />, text: "bi-weekly sessions" },
        { icon: <Users size={20} />, text: "all speakers & movers" },
        { icon: <BookOpen size={20} />, text: "performance practice" },
      ],
    },
    de: {
      title: "performing words",
      welcome: "wo literatur auf bewegung trifft",
      details: [
        { icon: <Clock size={20} />, text: "zweiwöchentlich" },
        { icon: <Users size={20} />, text: "alle sprecher & beweger" },
        { icon: <BookOpen size={20} />, text: "performance-praxis" },
      ],
    },
  };

  const sightImg = getImage("hearing_mic.png");
  const hearingImg = getImage("hearing.png");

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
    },
    title: {
      fontSize: "3.5rem",
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
              left: -10px !important; 
              top: -10px !important;
            }
            .icon-bottom {
              left: calc(100% - 55px) !important;
              top: 45px !important;
            }
            .info-item:nth-child(1) { transform: translateX(-15px); }
            .info-item:nth-child(2) { transform: translateX(15px); }
            .info-item:nth-child(3) { transform: translateX(-10px); }
          }
        `}
      </style>

      <main style={styles.main} className="main-content">
        <div className="title-wrapper" style={styles.titleWrapper}>
          {sightImg && (
            <img
              src={sightImg}
              alt=""
              className="icon-top"
              style={styles.moon("-35px", "-120px", 0)}
            />
          )}
          <h1 className="course-title" style={styles.title}>
            {content[currentLang].title}
          </h1>
          {hearingImg && (
            <img
              src={hearingImg}
              alt=""
              className="icon-bottom"
              style={styles.moon("40px", "calc(100% + 60px)", -3)}
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
