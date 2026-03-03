import { useState, useRef } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import PriceDisplay from "../components/PriceDisplay/PriceDisplay";
import RegisterShortcut from "../components/RegisterShortcut/RegisterShortcut";
import {
  Music,
  Layers,
  Languages,
  User,
  BookOpen,
  GraduationCap,
  Star,
  Heart,
} from "lucide-react";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const getImage = (filename) =>
  planetImages[`../assets/planets/${filename}`]?.default || "";

export default function Singing({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBookingExpanded, setIsBookingExpanded] = useState(false);
  const bookingRef = useRef(null);

  const config = {
    desktop: {
      topIcon: { top: "-30px", left: "-35px" },
      bottomIcon: { top: "50px", left: "calc(100% - 60px)" },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-15px", left: "-10px" },
      bottomIcon: { top: "45px", left: "calc(100% - 50px)" },
      titleSize: "3.2rem",
    },
  };

  const content = {
    en: {
      title: "singing and songwriting",
      welcome:
        "Find your unique sound through technical precision and creative freedom",
      ctaFloating: "register now",
      teachingTitle: "What I teach you",
      teachingList: [
        "Exploring new vocal expressions",
        "Extended techniques (Overtone, Throat singing, Beatbox)",
        "Healthy vocal technique",
        "Developing an artistic vision",
        "Studio preparation",
        "Song- and Lyricwriting",
      ],
      educationTitle: "Education",
      educationList: [
        "Lucerne University of Applied Sciences and Arts, Bachelor in Jazz Vocals",
        "Lucerne University of Applied Sciences and Arts, Master in Music & Art Performance",
      ],
      projectsTitle: "Projects",
      projectsList: [
        { name: "Paper Crane", url: "https://papercrane.ch/band/" },
        {
          name: "Brassmaster Flash",
          url: "https://linktr.ee/brassmasterflash",
        },
        { name: "Pistache", url: "https://www.instagram.com/pistache.mp3/" },
        { name: "VanKoch", url: "https://www.instagram.com/vankoch_musik/" },
        { name: "High D", url: "https://www.instagram.com/highd_duo/" },
      ],
      repertoireTitle: "Favorite Repertoire",
      repertoireDetail:
        "Radiohead, David Bowie, Björk, Queen, Cole Porter, George Gershwin, Anthony Braxton",
      details: [
        { icon: <Music size={18} />, text: "Pop, Jazz & Contemporary" },
        { icon: <Layers size={18} />, text: "All skill levels" },
        { icon: <Languages size={18} />, text: "DE / EN / FR" },
        { icon: <User size={18} />, text: "Ages 18+" },
      ],
    },
    de: {
      title: "gesang und songwriting",
      welcome:
        "Finde deinen eigenen Klang durch technische Präzision und kreative Freiheit",
      ctaFloating: "jetzt buchen",
      teachingTitle: "Das bringe ich dir bei",
      teachingList: [
        "Neue stimmliche Ausdrucksmittel suchen",
        "Extended Gesangstechniken (Oberton, Kehlkopfgesang, Beatbox)",
        "Gesunde Stimmtechnik",
        "Eine künstlerische Vision entwickeln",
        "Studiovorbereitung",
        "Song- und Lyricswriting",
      ],
      educationTitle: "Ausbildung",
      educationList: [
        "Hochschule Luzern, Bachelor in Jazz Gesang",
        "Hochschule Luzern, Master in Music & Art Performance",
      ],
      projectsTitle: "Projekte",
      projectsList: [
        { name: "Paper Crane", url: "https://papercrane.ch/band/" },
        {
          name: "Brassmaster Flash",
          url: "https://linktr.ee/brassmasterflash",
        },
        { name: "Pistache", url: "https://www.instagram.com/pistache.mp3/" },
        { name: "VanKoch", url: "https://www.instagram.com/vankoch_musik/" },
        { name: "High D", url: "https://www.instagram.com/highd_duo/" },
      ],
      repertoireTitle: "Lieblings-Repertoire",
      repertoireDetail:
        "Radiohead, David Bowie, Björk, Queen, Cole Porter, George Gershwin und Anthony Braxton",
      details: [
        { icon: <Music size={18} />, text: "Pop, Jazz & Zeitgenössisch" },
        { icon: <Layers size={18} />, text: "Alle Level willkommen" },
        { icon: <Languages size={18} />, text: "DE / EN / FR" },
        { icon: <User size={18} />, text: "Ab 18 Jahren" },
      ],
    },
  };

  const current = content[currentLang];
  const icons = [getImage("hearing.png"), getImage("hearing_mic.png")];

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
      gap: "12px",
      marginTop: "20px",
      flexWrap: "wrap",
      marginBottom: "60px",
    },
    infoItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 24px",
      background: "#caaff31e",
      borderRadius: "100px",
      color: "#1c0700",
    },
    infoLabel: { fontSize: "0.85rem", fontWeight: "500" },
    contentGrid: {
      display: "grid",
      gridTemplateColumns: "0.8fr 1.2fr",
      gap: "60px",
      width: "100%",
      textAlign: "left",
      marginTop: "60px",
      marginBottom: "40px",
      alignItems: "center",
    },
    lucaImage: {
      width: "100%",
      height: "auto",
      borderRadius: "15px",
      display: "block",
    },
    sectionTitle: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#1c0700",
      marginBottom: "15px",
      borderBottom: "1px solid rgba(202, 175, 243, 0.3)",
      paddingBottom: "5px",
    },
    bodyText: {
      fontSize: "0.95rem",
      color: "#1c0700",
      lineHeight: "1.6",
      opacity: 0.8,
    },
    ulStyle: {
      listStyle: "none",
      padding: 0,
      margin: "0 0 30px 0",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    liStyle: {
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      fontSize: "0.95rem",
      color: "#1c0700",
      opacity: 0.8,
      lineHeight: "1.4",
    },
    tagContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      marginBottom: "30px",
    },
    tagStyle: {
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "0.85rem",
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

      <RegisterShortcut
        bookingRef={bookingRef}
        ctaText={current.ctaFloating}
        planetImage={getImage("sing.png")}
        onClick={() => setIsBookingExpanded(true)}
      />

      <style>{`
          html { scroll-behavior: smooth; }
          @media (max-width: 768px) {
            .main-content { padding-top: 100px !important; }
            .course-title-wrapper { order: -1; margin-bottom: 10px; }
            .welcome-text { width: 80vw !important; margin-bottom: 25px !important; }
            .info-grid { flex-direction: column !important; align-items: center !important; margin-bottom: 30px !important; }
            .content-grid { grid-template-columns: 1fr !important; gap: 40px !important; margin-bottom: 20px !important; }
            
          }
          .project-tag { background-color: rgba(28, 7, 0, 0.05); color: #1c0700; text-decoration: none; transition: all 0.2s ease; display: inline-block; }
          .project-tag:hover { background-color: #caaff3; color: #fffce3; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(202, 175, 243, 0.3); }
      `}</style>

      <main style={styles.main} className="main-content">
        <div className="course-title-wrapper">
          <CourseTitle title={current.title} config={config} icons={icons} />
        </div>

        <p className="welcome-text" style={styles.welcomeText}>
          {current.welcome}
        </p>

        <div className="info-grid" style={styles.infoGrid}>
          {current.details.map((item, index) => (
            <div key={index} style={styles.infoItem}>
              <div style={{ display: "flex", opacity: 0.7 }}>{item.icon}</div>
              <span style={styles.infoLabel}>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="content-grid" style={styles.contentGrid}>
          <img
            src="https://s3.instrumentor.ch/p/o/32519/luca-koch_pb5ec2.jpg"
            alt="Luca Koch"
            style={styles.lucaImage}
          />
          <section>
            <h3 style={styles.sectionTitle}>
              <BookOpen size={18} /> {current.teachingTitle}
            </h3>
            <ul style={styles.ulStyle}>
              {current.teachingList.map((item, i) => (
                <li key={i} style={styles.liStyle}>
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#caaff3",
                      marginTop: "8px",
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 style={styles.sectionTitle}>
              <GraduationCap size={18} /> {current.educationTitle}
            </h3>
            <ul style={styles.ulStyle}>
              {current.educationList.map((edu, i) => (
                <li key={i} style={styles.liStyle}>
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#caaff3",
                      marginTop: "8px",
                      flexShrink: 0,
                    }}
                  />
                  <span>{edu}</span>
                </li>
              ))}
            </ul>

            <h3 style={styles.sectionTitle}>
              <Star size={18} /> {current.projectsTitle}
            </h3>
            <div style={styles.tagContainer}>
              {current.projectsList.map((project, i) => (
                <a
                  key={i}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-tag"
                  style={styles.tagStyle}
                >
                  {project.name}
                </a>
              ))}
            </div>

            <h3 style={styles.sectionTitle}>
              <Heart size={18} /> {current.repertoireTitle}
            </h3>
            <p
              style={{ ...styles.bodyText, fontStyle: "italic", opacity: 0.6 }}
            >
              {current.repertoireDetail}
            </p>
          </section>
        </div>

        <div
          ref={bookingRef}
          className="booking-section"
          style={{ width: "100%", marginTop: "40px" }}
        >
          <PriceDisplay
            coursePath="/singing"
            currentLang={currentLang}
            forceExpand={isBookingExpanded}
          />
        </div>
      </main>
    </div>
  );
}
