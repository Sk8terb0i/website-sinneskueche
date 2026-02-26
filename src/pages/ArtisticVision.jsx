import { useState } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import { Clock, Users, Sparkles } from "lucide-react";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const getImage = (filename) =>
  planetImages[`../assets/planets/${filename}`]?.default || "";

export default function ArtisticVision({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Note: Added 'dynamicBase' for the complex animation math
  const config = {
    desktop: {
      topIcon: { top: "-35px", left: "-100px" },
      bottomIcon: { top: "30px", left: "calc(100% + 40px)" },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-10px", left: "-10px" },
      bottomIcon: { top: "45px", left: "calc(100% - 55px)" },
      titleSize: "4rem",
    },
    dynamicBase: {
      top: { t: -35, l: -100 },
      bottom: { t: 30, l: 40 },
    },
  };

  const allPlanets = [
    getImage("sight.png"),
    getImage("smell.png"),
    getImage("touch.png"),
    getImage("hearing.png"),
    getImage("taste.png"),
  ];

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
    infoLabel: { fontSize: "0.9rem", lineHeight: "1.4", fontWeight: "500" },
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
          @media (max-width: 768px) {
            .main-content { padding-top: 120px !important; }
            .welcome-text { margin-bottom: 40px !important; width: 50vw; }
            .info-grid { flex-direction: column !important; width: 100%; }
          }
        `}
      </style>

      <main style={styles.main} className="main-content">
        <CourseTitle
          title={content[currentLang].title}
          config={config}
          icons={allPlanets}
        />

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
