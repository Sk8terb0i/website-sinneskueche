import React, { useState } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import { MapPin, Info, Navigation } from "lucide-react";

// Local Assets
import buildingImg from "../assets/location/building.png";
import doorImg from "../assets/location/door.png";

// --- ADJUST MOBILE OVERLAP & WIDTHS HERE ---
const MOBILE_LAYOUT = {
  buildingWidth: "85vw",
  doorWidth: "45%",
  doorRight: "1%",
  doorVerticalShift: "0px",
};

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const getImage = (filename) =>
  planetImages[`../assets/planets/${filename}`]?.default || "";

export default function Location({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const icons = [getImage("icon_sign.png"), getImage("icon_pin.png")];

  const titleConfig = {
    desktop: {
      topIcon: { top: "-35px", left: "-70px" },
      bottomIcon: { top: "40px", left: "170px" },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-20px", left: "-70px" },
      bottomIcon: { top: "15px", left: "calc(100% - 35px)" },
      titleSize: "2.8rem",
    },
  };

  const content = {
    en: {
      title: "location",
      welcome: "How to find our creative space",
      address: "Sägestrasse 11, 8952 Schlieren",
      entrance: "Rear entrance (blue door)",
      getDirections: "Get Directions",
      description:
        "When you arrive at the building, walk around it to the back and enter the blue door.",
    },
    de: {
      title: "standort",
      welcome: "So findest du zu unserem Studio",
      address: "Sägestrasse 11, 8952 Schlieren",
      entrance: "Hintereingang (blaue Tür)",
      getDirections: "Route planen",
      description:
        "Wenn du am Gebäude ankommst, laufe bitte einmal hinten herum und benutze die blaue Tür als Eingang.",
    },
  };

  const current = content[currentLang];

  const openGoogleMaps = () => {
    window.open(
      "https://maps.google.com/?q=Sägestrasse+11,+8952+Schlieren",
      "_blank",
    );
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
      marginBottom: "40px",
      flexWrap: "wrap",
    },
    infoItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 24px",
      background: "#caaff31e", // Restored original pill color
      borderRadius: "100px",
      color: "#1c0700",
      whiteSpace: "nowrap",
    },
    infoLabel: { fontSize: "0.85rem", lineHeight: "1.4", fontWeight: "500" },

    // The Map Card Section
    locationCard: {
      width: "100%",
      maxWidth: "900px",
      backgroundColor: "#fdf8e1",
      borderRadius: "32px",
      padding: "2rem",
      border: "1px solid rgba(153, 96, 168, 0.15)",
      boxShadow: "0 20px 40px rgba(0,0,0,0.03)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.5rem",
      marginBottom: "60px",
    },
    mapWrapper: {
      width: "100%",
      height: "400px",
      borderRadius: "20px",
      border: "1px solid rgba(28, 7, 0, 0.08)",
      overflow: "hidden",
      backgroundColor: "rgba(202, 175, 243, 0.08)", // No pure white
    },
    btnRoute: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "14px 28px",
      backgroundColor: "#caaff3", // Lavender
      color: "#1c0700", // Dark text for contrast against lavender
      border: "none",
      borderRadius: "100px",
      fontSize: "1rem",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "transform 0.2s, opacity 0.2s",
    },

    // Visual Images Section
    visualGroup: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
    },
    imageSection: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "30px",
      width: "100%",
      position: "relative",
    },
    image: {
      height: "400px",
      width: "auto",
      display: "block",
      objectFit: "contain",
      borderRadius: "0px",
      boxShadow: "0 10px 30px rgba(28, 7, 0, 0.05)",
    },
    instructionText: {
      fontSize: "1.05rem",
      lineHeight: "1.6",
      color: "#1c0700",
      margin: "20px 0 0 0",
      padding: "15px 0px",
      maxWidth: "700px",
      fontStyle: "italic",
      opacity: 0.8,
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
          @media (max-width: 768px) {
            .location-image-section { 
              display: flex !important;
              justify-content: center;
              align-items: center; 
              width: 100% !important;
              height: 280px !important;
              margin: 0 auto !important;
              position: relative;
            }
            .img-left {
              width: ${MOBILE_LAYOUT.buildingWidth} !important;
              height: auto !important;
              position: relative !important;
              z-index: 1;
            }
            .img-right {
              width: ${MOBILE_LAYOUT.doorWidth} !important;
              height: auto !important;
              position: absolute !important;
              right: ${MOBILE_LAYOUT.doorRight} !important;
              margin-top: ${MOBILE_LAYOUT.doorVerticalShift} !important;
              z-index: 2;
              box-shadow: -10px 10px 30px rgba(0,0,0,0.15) !important;
            }
            .instruction-text {
                width: ${MOBILE_LAYOUT.buildingWidth} !important;
                max-width: ${MOBILE_LAYOUT.buildingWidth} !important;
                font-size: 0.95rem !important;
                padding: 0px 0px 15px 0px !important; /* Removed top padding */
                margin-top: 0px !important; /* Pulled up against the images */
                box-sizing: border-box;
            }
            .location-card {
                padding: 1.5rem !important;
                border-radius: 24px !important;
                width: 95% !important;
            }
            .info-grid {
              flex-direction: column !important;
              gap: 8px !important;
              width: 100%;
            }
            .map-container {
              height: 300px !important;
            }
            .btn-route {
              width: 100%;
              justify-content: center;
            }
          }
          .google-map-iframe {
            filter: grayscale(0.2) contrast(1.1) brightness(0.95);
            width: 100%;
            height: 100%;
            border: 0;
          }
          .btn-route:hover {
            transform: translateY(-2px);
            opacity: 0.9;
          }
        `}
      </style>

      <main style={styles.main}>
        <div className="course-title-wrapper">
          <CourseTitle
            title={current.title}
            config={titleConfig}
            icons={icons}
          />
        </div>

        <p style={styles.welcomeText}>{current.welcome}</p>

        {/* 1. INFO PILLS (Restored to their original place) */}
        <div className="info-grid" style={styles.infoGrid}>
          <div className="info-item" style={styles.infoItem}>
            <div style={{ display: "flex", opacity: 0.7 }}>
              <MapPin size={18} />
            </div>
            <span style={styles.infoLabel}>{current.address}</span>
          </div>
          <div className="info-item" style={styles.infoItem}>
            <div style={{ display: "flex", opacity: 0.7 }}>
              <Info size={18} />
            </div>
            <span style={styles.infoLabel}>{current.entrance}</span>
          </div>
        </div>

        {/* 2. MAP & DIRECTIONS FIRST */}
        <div className="location-card" style={styles.locationCard}>
          <div className="map-container" style={styles.mapWrapper}>
            <iframe
              title="Studio Map"
              className="google-map-iframe"
              src="https://maps.google.com/maps?q=Sägestrasse+11,+8952+Schlieren&t=&z=15&ie=UTF8&iwloc=&output=embed"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

          <button
            className="btn-route"
            style={styles.btnRoute}
            onClick={openGoogleMaps}
          >
            <Navigation size={18} />
            {current.getDirections}
          </button>
        </div>

        {/* 3. VISUAL GUIDE BELOW */}
        <div style={styles.visualGroup}>
          <div className="location-image-section" style={styles.imageSection}>
            <img
              src={buildingImg}
              alt="Building Exterior"
              className="location-img img-left"
              style={styles.image}
            />
            <img
              src={doorImg}
              alt="Blue Entrance Door"
              className="location-img img-right"
              style={styles.image}
            />
          </div>

          <p className="instruction-text" style={styles.instructionText}>
            {current.description}
          </p>
        </div>
      </main>
    </div>
  );
}
