import { useState } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import { Clock, Users, PenTool } from "lucide-react";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const getImage = (filename) =>
  planetImages[`../assets/planets/${filename}`]?.default || "";

export default function GetInk({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const config = {
    desktop: {
      topIcon: { top: "-35px", left: "-120px" },
      bottomIcon: { top: "40px", left: "calc(100% + 60px)" },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-10px", left: "-10px" },
      bottomIcon: { top: "45px", left: "calc(100% - 55px)" },
      titleSize: "4.5rem",
    },
  };

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

  const icons = [getImage("touch.png"), getImage("sight.png")];

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
            .main-content { display: flex; flex-direction: column; alignItems: center; padding-top: 120px !important; }
            .welcome-text { margin-bottom: 40px !important; font-size: 0.9rem !important; width: 50vw; }
            .info-grid { flex-direction: column !important; gap: 12px !important; width: 100%; }
            .info-item:nth-child(1) { transform: translateX(-15px); }
            .info-item:nth-child(2) { transform: translateX(15px); }
            .info-item:nth-child(3) { transform: translateX(-10px); }
          }
        `}
      </style>

      <main style={styles.main} className="main-content">
        <CourseTitle
          title={content[currentLang].title}
          config={config}
          icons={icons}
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
