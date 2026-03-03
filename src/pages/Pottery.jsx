import { useState, useRef } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import PriceDisplay from "../components/PriceDisplay/PriceDisplay";
import CourseDescription from "../components/CourseDescription/CourseDescription";
import RegisterShortcut from "../components/RegisterShortcut/RegisterShortcut";
import { Clock, Users, Coffee } from "lucide-react";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const getImage = (filename) =>
  planetImages[`../assets/planets/${filename}`]?.default || "";

export default function Pottery({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBookingExpanded, setIsBookingExpanded] = useState(false); // ADDED STATE
  const bookingRef = useRef(null);

  const config = {
    desktop: {
      topIcon: { top: "-35px", left: "-80px" },
      bottomIcon: { top: "60px", left: "400px" },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-10px", left: "-10px" },
      bottomIcon: { top: "15px", left: "calc(100% - 35px)" },
      titleSize: "2.8rem",
    },
  };

  const content = {
    en: {
      title: "pottery tuesdays",
      welcome: "Make Tuesdays your creative sanctuary",
      ctaFloating: "register now",
      details: [
        { icon: <Clock size={18} />, text: "18:30 - 21:30" },
        { icon: <Users size={18} />, text: "All skill levels" },
        { icon: <Coffee size={18} />, text: "Small, cozy groups" },
      ],
      description:
        "Discover the art of hand-building pottery in our inspiring studio! In a relaxed atmosphere, you can practice the fundamentals of traditional hand-forming techniques, from kneading and shaping to refining your own ceramic pieces.\n\nWhether you want to create bowls, vases, or unique decorative objects – this workshop lets your creativity flow freely. No prior experience is needed. All materials are provided, and at the end, you'll take home your own handmade masterpiece.",
    },
    de: {
      title: "pottery tuesdays",
      welcome: "Mach den Dienstag zu deiner kreativen Auszeit",
      ctaFloating: "jetzt buchen",
      details: [
        { icon: <Clock size={18} />, text: "18:30 - 21:30" },
        { icon: <Users size={18} />, text: "Alle Level willkommen" },
        { icon: <Coffee size={18} />, text: "Kleine, gemütliche Gruppen" },
      ],
      description:
        "Entdecke die Kunst des Töpferns von Hand in unserem inspirierenden Studio! In entspannter Atmosphäre kannst du die Grundlagen traditioneller Aufbautechniken üben, vom Kneten und Formen bis hin zum Verfeinern deiner eigenen Keramikstücke.\n\nOb du Schalen, Vasen oder einzigartige Deko-Objekte kreieren möchtest – in diesem Workshop kann deine Kreativität frei fließen. Es sind keine Vorkenntnisse erforderlich. Alle Materialien werden gestellt, und am Ende nimmst du dein eigenes, handgefertigtes Meisterwerk mit nach Hause.",
    },
  };

  const icons = [getImage("touch.png"), getImage("sight.png")];
  const current = content[currentLang];

  const styles = {
    main: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "160px 20px 80px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      position: "relative",
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
    infoLabel: { fontSize: "0.85rem", lineHeight: "1.4", fontWeight: "500" },
  };

  return (
    <div className="course-container">
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <RegisterShortcut
        bookingRef={bookingRef}
        ctaText={current.ctaFloating}
        planetImage={getImage("pottery_register.png")}
        onClick={() => setIsBookingExpanded(true)} // TRIGGER EXPANSION
      />

      <style>
        {`
          html { scroll-behavior: smooth; }
          @media (max-width: 768px) {
            .main-content { 
              display: flex !important; 
              flex-direction: column !important; 
              align-items: center; 
              padding-top: 100px !important; 
              padding-bottom: 40px !important;
            }
            .course-title-wrapper { 
              order: -1; 
              margin-bottom: 10px;
              font-weight: 500 !important; 
            }
            .welcome-text { 
              margin-bottom: 25px !important; 
              font-size: 0.85rem !important; 
              width: 80vw !important; 
            }
            .info-grid { 
              flex-direction: column !important; 
              gap: 8px !important; 
              width: 100%; 
              margin-top: 10px !important;
            }
            .info-item {
              padding: 8px 20px !important;
            }
          }
        `}
      </style>

      <main style={styles.main} className="main-content">
        <div className="course-title-wrapper">
          <CourseTitle title={current.title} config={config} icons={icons} />
        </div>

        <p className="welcome-text" style={styles.welcomeText}>
          {current.welcome}
        </p>

        <div className="info-grid" style={styles.infoGrid}>
          {current.details.map((item, index) => (
            <div key={index} className="info-item" style={styles.infoItem}>
              <div style={{ display: "flex", opacity: 0.7 }}>{item.icon}</div>
              <span style={styles.infoLabel}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Restore Description Component */}
        <CourseDescription text={current.description} />

        <div
          ref={bookingRef}
          className="booking-section"
          style={{ width: "100%", marginTop: "40px" }}
        >
          <PriceDisplay
            coursePath="/pottery"
            currentLang={currentLang}
            forceExpand={isBookingExpanded} // PASS STATE
          />
        </div>
      </main>
    </div>
  );
}
