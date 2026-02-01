import { useState, useEffect } from "react";
import Header from "../components/Header/Header";
import {
  Music,
  Layers,
  Languages,
  User,
  Monitor,
  MapPin,
  Wallet,
  BookOpen,
  GraduationCap,
  Star,
  Heart,
  Send,
  Calendar,
  ExternalLink,
} from "lucide-react";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});

const getImage = (filename) => {
  const key = `../assets/planets/${filename}`;
  return planetImages[key]?.default || "";
};

export default function Singing({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isIdle, setIsIdle] = useState(false);

  // --- EASY CONFIG SECTION ---
  const config = {
    desktop: {
      touch: { top: "-30px", left: "-35px" },
      sight: { top: "50px", left: "calc(100% - 60px)" },
      titleSize: "4.5rem",
    },
    mobile: {
      touch: { top: "-15px", left: "-10px" },
      sight: { top: "45px", left: "calc(100% - 40px)" },
      titleSize: "3.5rem",
    },
  };
  // ---------------------------

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) setIsVisible(false);
      else setIsVisible(true);
      setIsIdle(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let timeout;
    const startTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsIdle(true), 7000);
    };
    const resetEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "touchstart",
      "scroll",
    ];
    const handleActivity = () => startTimer();
    resetEvents.forEach((event) =>
      window.addEventListener(event, handleActivity),
    );
    startTimer();
    return () => {
      clearTimeout(timeout);
      resetEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
    };
  }, []);

  const content = {
    en: {
      title: "Singing and Songwriting",
      welcome:
        "Find your unique sound through a blend of technical precision and creative freedom",
      priceTitle: "Price",
      priceAmount: "990",
      pricePerLesson: "99.— / lesson",
      priceInfo: "Package of 10 lessons (45 min each)",
      locationTitle: "Location",
      locationDetail: "Sägestrasse 11, 8952 Schlieren",
      locationSub: "View on Google Maps",
      teachingTitle: "What I teach you",
      teachingList: [
        "Exploring new vocal expressions",
        "Extended vocal techniques (Overtone, Throat singing, Beatbox)",
        "Healthy vocal technique",
        "Developing an artistic vision",
        "Studio preparation",
        "Song- and Lyricwriting",
      ],
      educationTitle: "Education",
      educationList: [
        "Lucerne University of Applied Sciences and Arts, Bachelor in Jazz Vocals (Susanne Abbuehl, Lauren Newton, Sarah Büechi)",
        "Lucerne University of Applied Sciences and Arts, Master in Music & Art Performance (Gerry Hemingway, Kristin Berardi, Magda Mayas)",
      ],
      projectsTitle: "Projects",
      projectsDetail:
        "Paper Crane, Brassmaster Flash, Pistache, VanKoch, High D",
      repertoireTitle: "Favorite Repertoire",
      repertoireDetail:
        "Radiohead, David Bowie, Björk, Queen, Cole Porter, George Gershwin, Anthony Braxton",
      ctaFloating: "register now",
      ctaRegisterTitle: "start your journey",
      ctaRegisterButton: "register now",
      ctaSub: "for a non-binding trial lesson",
      ctaContact: "Ask Luca a question",
      details: [
        {
          icon: <Music size={20} />,
          text: "Pop, Jazz, Free Improv & Contemporary",
        },
        { icon: <Layers size={20} />, text: "Beginners, Advanced & Master" },
        { icon: <Languages size={20} />, text: "German, English & French" },
        { icon: <User size={20} />, text: "Ages 18+" },
        {
          icon: <Monitor size={20} />,
          text: "Remote lessons",
          link: "https://www.instrumentor.ch/de/fernunterricht",
          isSpecial: true,
        },
      ],
    },
    de: {
      title: "Gesang und Songwriting",
      welcome:
        "Finde deinen eigenen Klang durch eine Mischung aus technischer Präzision und kreativer Freiheit",
      priceTitle: "Preis",
      priceAmount: "990",
      pricePerLesson: "99.— / Lektion",
      priceInfo: "10er-Abo à 45 Minuten",
      locationTitle: "Standort",
      locationDetail: "Sägestrasse 11, 8952 Schlieren",
      locationSub: "Auf Google Maps ansehen",
      teachingTitle: "Das bringe ich dir bei",
      teachingList: [
        "Neue stimmliche Ausdrucksmittel suchen",
        "Extended Gesangstechniken wie Oberton- und Kehlkopfgesang oder Beatbox",
        "Gesunde Stimmtechnik",
        "eine künstlerische Vision entwickeln",
        "Studiovorbereitung",
        "Song- und Lyricswriting",
      ],
      educationTitle: "Ausbildung",
      educationList: [
        "Hochschule Luzern, Bachelor in Jazz Gesang bei Susanne Abbuehl, Lauren Newton, Sarah Büechi",
        "Hochschule Luzern, Master in Music & Art Performance bei Gerry Hemingway, Kristin Berardi, Magda Mayas",
      ],
      projectsTitle: "Projekte",
      projectsDetail:
        "Paper Crane, Brassmaster Flash, Pistache, VanKoch, High D",
      repertoireTitle: "Lieblings-Repertoire",
      repertoireDetail:
        "Radiohead, David Bowie, Björk, Queen, Cole Porter, George Gershwin und Anthony Braxton",
      ctaFloating: "jetzt anmelden",
      ctaRegisterTitle: "dein weg zur musik",
      ctaRegisterButton: "jetzt anmelden",
      ctaSub: "für unverbindliche Probelektion",
      ctaContact: "Eine Frage an Luca Koch stellen",
      details: [
        {
          icon: <Music size={20} />,
          text: "Pop, Jazz, Improvisation & Zeitgenössisch",
        },
        {
          icon: <Layers size={20} />,
          text: "Anfänger, Fortgeschrittene & Master",
        },
        {
          icon: <Languages size={20} />,
          text: "Deutsch, Englisch & Französisch",
        },
        { icon: <User size={20} />, text: "Ab 18 Jahren" },
        {
          icon: <Monitor size={20} />,
          text: "Fernunterricht",
          link: "https://www.instrumentor.ch/de/fernunterricht",
          isSpecial: true,
        },
      ],
    },
  };

  const touchImg = getImage("hearing.png");
  const sightImg = getImage("hearing_mic.png");
  const planetShortcutImg = getImage("sing.png");
  const current = content[currentLang];

  const scrollToRegister = (e) => {
    e.preventDefault();
    const isMobile = window.innerWidth <= 768;
    const targetId = isMobile ? "register-mobile" : "register-desktop";
    const element = document.getElementById(targetId);
    if (element) {
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offset = isMobile ? 280 : 120;
      window.scrollTo({ top: elementPosition - offset, behavior: "smooth" });
    }
  };

  const styles = {
    main: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "160px 20px 0px 20px",
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
      lineHeight: 1, // Locks icons to box
    },
    title: {
      fontSize: config.desktop.titleSize,
      margin: 0,
      zIndex: 2,
      position: "relative",
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
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "12px",
      marginTop: "20px",
      width: "100%",
      marginBottom: "60px",
      maxWidth: "1000px",
    },
    infoItem: (isSpecial) => ({
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 24px",
      background: isSpecial ? "#9a60a83a" : "#caaff31e",
      borderRadius: "100px",
      color: "#1c0700",
      whiteSpace: "nowrap",
      textDecoration: "none",
      transition: "all 0.2s ease",
      width: "fit-content",
    }),
    infoLabel: { fontSize: "0.9rem", lineHeight: "1.4", fontWeight: "500" },
    contentGrid: {
      display: "grid",
      gridTemplateColumns: "0.8fr 1.2fr",
      gap: "60px",
      width: "100%",
      textAlign: "left",
      marginTop: "40px",
    },
    lucaImage: {
      width: "100%",
      maxHeight: "450px",
      borderRadius: "15px",
      objectFit: "cover",
      objectPosition: "center 0%",
      marginBottom: "30px",
    },
    sectionTitle: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#1c0700",
      marginBottom: "15px",
      borderBottom: "1px solid #caaff34e",
      paddingBottom: "5px",
    },
    bodyText: {
      fontSize: "0.95rem",
      color: "#1c0700",
      lineHeight: "1.6",
      marginBottom: "25px",
    },
    priceCard: {
      background: "#caaff312",
      borderRadius: "18px",
      padding: "20px",
      marginBottom: "30px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    priceTag: {
      display: "flex",
      alignItems: "baseline",
      gap: "4px",
      color: "#4e5f28",
      fontWeight: "700",
    },
    priceAmount: { fontSize: "1.8rem", lineHeight: "1" },
    priceCurrency: { fontSize: "0.9rem" },
    priceSubText: { fontSize: "0.8rem", opacity: 0.7, fontWeight: "500" },
    locationCard: {
      background: "#caaff312",
      borderRadius: "18px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      textDecoration: "none",
      transition: "background 0.2s ease",
      cursor: "pointer",
      color: "inherit",
    },
    locationAddress: {
      fontSize: "0.95rem",
      fontWeight: "600",
      color: "#1c0700",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    locationSub: {
      fontSize: "0.8rem",
      opacity: 0.6,
      textDecoration: "underline",
      textDecorationColor: "#caaff3",
    },
    ctaBox: {
      padding: "30px",
      background: "#caaff324",
      borderRadius: "20px",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      height: "185px",
      marginTop: "50px",
    },
    floatingPlanetWrapper: {
      position: "fixed",
      bottom: "30px",
      right: "30px",
      width: "100px",
      height: "100px",
      cursor: "pointer",
      zIndex: 1000,
      background: "none",
      border: "none",
      padding: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "float-pulse 6s ease-in-out infinite",
      transition:
        "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.6s ease",
    },
    planetCenter: {
      width: "45px",
      height: "45px",
      objectFit: "contain",
      position: "absolute",
      zIndex: 2,
    },
    svgText: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      animation: "rotate-slow 15s linear infinite",
      zIndex: 1,
    },
  };

  const RegisterBox = ({ className, id }) => (
    <div id={id} style={styles.ctaBox} className={className}>
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: "1.6rem",
            margin: 0,
            color: "#1c0700",
            lineHeight: "1.1",
          }}
        >
          {current.ctaRegisterTitle}
        </h2>
        <p style={{ opacity: 0.6, fontSize: "0.85rem", margin: "6px 0 0 0" }}>
          {current.ctaSub}
        </p>
      </div>
      <a
        href="https://www.instrumentor.ch/de/luca-koch/anmelden"
        target="_blank"
        rel="noreferrer"
        className="cta-main-btn"
        style={{
          background: "#4e5f28",
          color: "white",
          padding: "12px 40px",
          borderRadius: "100px",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "0.95rem",
          display: "flex",
          alignItems: "center",
          marginTop: "5px",
          transition: "all 0.2s ease",
        }}
      >
        <Calendar size={18} style={{ marginRight: "8px" }} />
        {current.ctaRegisterButton}
      </a>
      <a
        href="https://www.instrumentor.ch/de/luca-koch/frage-stellen"
        target="_blank"
        rel="noreferrer"
        className="cta-contact-link"
        style={{
          color: "#1c0700",
          fontSize: "0.8rem",
          opacity: 0.5,
          marginTop: "4px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          textDecoration: "none",
          transition: "opacity 0.2s ease",
        }}
      >
        <Send size={12} /> {current.ctaContact}
      </a>
    </div>
  );

  return (
    <div className="course-container">
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <style>{`
          html { scroll-behavior: smooth; }
          @keyframes drift {
            0%, 100% { transform: translate(0, 0) rotate(-3deg); }
            50% { transform: translate(15px, -15px) rotate(4deg); }
          }
          @keyframes float-pulse {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes rotate-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .register-box-mobile { display: none !important; }

          @media (max-width: 768px) {
            .main-content { padding-top: 120px !important; }
            .welcome-text { margin-bottom: 40px !important; width: 70vw; }
            .info-grid { 
              flex-direction: column !important; 
              align-items: center !important;
              gap: 15px !important; 
            }
            .info-item:nth-child(odd) { transform: translateX(-15px); }
            .info-item:nth-child(even) { transform: translateX(15px); }
            .content-grid { grid-template-columns: 1fr !important; }
            .register-box-desktop { display: none !important; }
            .register-box-mobile { 
                display: flex !important;
                margin: 40px 0 !important;
                height: auto !important; 
                padding: 40px 20px !important; 
                width: 100% !important;
                box-sizing: border-box !important;
            }

            /* Config Injection */
            .course-title { font-size: ${config.mobile.titleSize} !important; }
            .icon-touch {
              top: ${config.mobile.touch.top} !important;
              left: ${config.mobile.touch.left} !important;
            }
            .icon-sight {
              top: ${config.mobile.sight.top} !important;
              left: ${config.mobile.sight.left} !important;
            }

            .luca-image { display: none !important; }
          }
          
          .info-item-link:hover { opacity: 0.9; transform: translateY(-2px); }
          .location-card:hover { background: #caaff324 !important; }
          .floating-shortcut:hover .planet-center { transform: scale(1.1); transition: transform 0.3s ease; }
          .cta-main-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
          .cta-contact-link:hover { opacity: 1 !important; }
        `}</style>

      <button
        onClick={scrollToRegister}
        style={{
          ...styles.floatingPlanetWrapper,
          opacity: isVisible || isIdle ? 1 : 0,
          visibility: isVisible || isIdle ? "visible" : "hidden",
          pointerEvents: isVisible || isIdle ? "auto" : "none",
        }}
        className="floating-shortcut"
      >
        <svg viewBox="0 0 100 100" style={styles.svgText}>
          <defs>
            <path
              id="circlePath"
              d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
            />
          </defs>
          <text
            fill="#1c0700"
            style={{
              fontSize: "9px",
              fontWeight: "500",
              opacity: 0.5,
              textTransform: "lowercase",
              letterSpacing: "0.1em",
            }}
          >
            <textPath href="#circlePath" startOffset="0%">
              {current.ctaFloating} • {current.ctaFloating} •{" "}
              {current.ctaFloating} •
            </textPath>
          </text>
        </svg>
        <img
          src={planetShortcutImg}
          alt="planet"
          style={styles.planetCenter}
          className="planet-center"
        />
      </button>

      <main style={styles.main} className="main-content">
        <div className="title-wrapper" style={styles.titleWrapper}>
          {touchImg && (
            <img
              src={touchImg}
              alt="Deco"
              style={styles.moon(
                config.desktop.touch.top,
                config.desktop.touch.left,
                0,
              )}
              className="icon-touch"
            />
          )}
          <h1 className="course-title" style={styles.title}>
            {current.title}
          </h1>
          {sightImg && (
            <img
              src={sightImg}
              alt="Deco"
              style={styles.moon(
                config.desktop.sight.top,
                config.desktop.sight.left,
                -3,
              )}
              className="icon-sight"
            />
          )}
        </div>

        <p style={styles.welcomeText} className="welcome-text">
          {current.welcome}
        </p>

        <div className="info-grid" style={styles.infoGrid}>
          {current.details.map((item, index) => {
            const isLink = !!item.link;
            const Component = isLink ? "a" : "div";
            return (
              <Component
                key={index}
                className={`info-item ${isLink ? "info-item-link" : ""}`}
                style={styles.infoItem(item.isSpecial)}
                {...(isLink
                  ? {
                      href: item.link,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {})}
              >
                <div
                  style={{ display: "flex", opacity: item.isSpecial ? 1 : 0.7 }}
                >
                  {item.icon}
                </div>
                <span style={styles.infoLabel}>{item.text}</span>
              </Component>
            );
          })}
        </div>

        <div className="content-grid" style={styles.contentGrid}>
          <section>
            <img
              src="https://s3.instrumentor.ch/p/o/32519/luca-koch_pb5ec2.jpg"
              alt="Luca Koch"
              style={styles.lucaImage}
              className="luca-image"
            />
            <h3 style={styles.sectionTitle}>
              <Wallet size={18} /> {current.priceTitle}
            </h3>
            <div style={styles.priceCard}>
              <div style={styles.priceTag}>
                <span style={styles.priceCurrency}>CHF</span>
                <span style={styles.priceAmount}>{current.priceAmount}</span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#1c0700",
                    opacity: 0.5,
                    fontWeight: "normal",
                  }}
                >
                  / {current.pricePerLesson}
                </span>
              </div>
              <div style={styles.priceSubText}>{current.priceInfo}</div>
            </div>
            <h3 style={styles.sectionTitle}>
              <MapPin size={18} /> {current.locationTitle}
            </h3>
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.locationCard}
              className="location-card"
            >
              <div style={styles.locationAddress}>
                {current.locationDetail}{" "}
                <ExternalLink size={14} style={{ opacity: 0.4 }} />
              </div>
              <div style={styles.locationSub}>{current.locationSub}</div>
            </a>
          </section>

          <section>
            <h3 style={styles.sectionTitle}>
              <BookOpen size={18} /> {current.teachingTitle}
            </h3>
            <p style={styles.bodyText}>{current.teachingList.join(", ")}</p>
            <h3 style={styles.sectionTitle}>
              <GraduationCap size={18} /> {current.educationTitle}
            </h3>
            {current.educationList.map((edu, i) => (
              <p
                key={i}
                style={{
                  ...styles.bodyText,
                  fontSize: "0.95rem",
                  marginBottom: "10px",
                }}
              >
                {edu}
              </p>
            ))}
            <h3 style={styles.sectionTitle}>
              <Star size={18} /> {current.projectsTitle}
            </h3>
            <p style={styles.bodyText}>{current.projectsDetail}</p>
            <h3 style={styles.sectionTitle}>
              <Heart size={18} /> {current.repertoireTitle}
            </h3>
            <p style={{ ...styles.bodyText, marginBottom: "0" }}>
              {current.repertoireDetail}
            </p>
            <RegisterBox
              id="register-desktop"
              className="register-box-desktop"
            />
          </section>
        </div>
        <RegisterBox id="register-mobile" className="register-box-mobile" />
      </main>
    </div>
  );
}
