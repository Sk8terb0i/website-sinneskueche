import { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import PriceDisplay from "../components/PriceDisplay/PriceDisplay";
import CourseDescription from "../components/CourseDescription/CourseDescription";
import RegisterShortcut from "../components/RegisterShortcut/RegisterShortcut";
import {
  Clock,
  Users,
  Coffee,
  ChevronDown,
  ChevronUp,
  Ticket,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const getImage = (filename) =>
  planetImages[`../assets/planets/${filename}`]?.default || "";

// Import pottery gallery images dynamically
const potteryGallery = import.meta.glob(
  "../assets/pottery/*.{jpg,JPG,jpeg,png,webp}",
  { eager: true },
);
const galleryImages = Object.values(potteryGallery).map(
  (module) => module.default,
);

export default function Pottery({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBookingExpanded, setIsBookingExpanded] = useState(false);
  const bookingRef = useRef(null);
  const [customTitle, setCustomTitle] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Gallery State
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [galleryDirection, setGalleryDirection] = useState(0); // NEW: Track glide direction
  const totalImages = galleryImages.length;
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchCustomTitle = async () => {
      try {
        const snap = await getDoc(doc(db, "course_settings", "pottery"));
        if (snap.exists()) {
          const data = snap.data();
          setCustomTitle({
            en: data.nameEn,
            de: data.nameDe,
          });
        }
      } catch (err) {
        console.error("Could not fetch custom course title:", err);
      }
    };
    fetchCustomTitle();
  }, []);

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
      title: "Töpferküche",
      welcome: "Join our creative kitchen",
      ctaFloating: "register now",
      details: [
        { icon: <Clock size={18} />, text: "18:30 - 21:15" },
        { icon: <Users size={18} />, text: "All skill levels" },
        { icon: <Coffee size={18} />, text: "Small, cozy groups" },
      ],
      description: `In our pottery kitchen, you can try your hand at pottery in a welcoming atmosphere and hone your skills. It doesn't matter how much experience you bring, everyone is welcome.\n\nClay, tools, and rollers are ready for you. You drop by, work on your own project, or get inspired by the materials and other participants. If you need help, we are here. Whether you come regularly or just want to get a taste of it.\n\nWith us, you don't need to book a course in advance and don't need to bring anything except your love for pottery.`,
      tabs: [
        {
          title: "How it works",
          content:
            "Pick a date, drop by, get started. If it's your first time, you'll get a brief introduction to the studio, materials, processes, and basic techniques. After that, you work freely at your own pace.\n\nEverything is included in the price: clay, glazes, the firing of your pieces, and the use of all tools. You only need to bring your ideas.",
        },
        {
          title: "Four options to choose from",
          content: (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <strong>Single ticket:</strong> For a spontaneous visit.
              </div>
              <div>
                <strong>Session pass (2, 5, or 10):</strong> Flexible
                scheduling. Credits are saved to your profile and can be
                redeemed later. They are valid for 1 year.
              </div>
            </div>
          ),
        },
        {
          title: "Fancy the pottery wheel?",
          content:
            "For an additional charge, you can book an introduction to the pottery wheel on a separate day, as well as individual 1-hour slots.",
        },
      ],
    },
    de: {
      title: "Töpferküche",
      welcome: "Gönn dir eine kreative Auszeit",
      ctaFloating: "jetzt buchen",
      details: [
        { icon: <Clock size={18} />, text: "18:30 - 21:15" },
        { icon: <Users size={18} />, text: "Alle Level willkommen" },
        { icon: <Coffee size={18} />, text: "Kleine, gemütliche Gruppen" },
      ],
      description: `In unserer Töpferküche kannst du dich in vertrauter Atmosphäre im Töpfern versuchen und deine Fähigkeiten schärfen. Es spielt keine Rolle wieviel Erfahrung du mitbringst, jede*r ist willkommen.\n\nTon, Werkzeug, Walze stehen für dich bereit. Du kommst vorbei, arbeitest an deinem eigenen Projekt oder lässt dich vom Material und den anderen Teilnehmer:innen inspirieren. Wenn du Hilfe brauchst, sind wir da.\n\nEgal ob du regelmässig kommst oder einfach mal reinschnuppern willst. Bei uns musst du keinen Kurs vorab buchen und nichts mitbringen ausser Lust am Töpfern.`,
      tabs: [
        {
          title: "So funktioniert’s",
          content:
            "Termin aussuchen, vorbeikommen, loslegen. Wer zum ersten Mal da ist, bekommt eine kurze Einführung in Werkstatt, Material, Abläufe und grundlegende Techniken. Danach arbeitest du frei in deinem Tempo.\n\nIm Preis ist alles drin: Ton, Glasuren, das Brennen deiner Werke, sowie die Nutzung sämtlicher Werkzeuge. Du bringst nur deine Ideen mit.",
        },
        {
          title: "Vier Karten zur Auswahl",
          content: (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <strong>Einzelkarte:</strong> Für den spontanen Besuch.
              </div>
              <div>
                <strong>Abo (2er, 5er, 10er):</strong> Mit freier Terminwahl.
                Die Guthaben werden deinem Profil gutgeschrieben und du kannst
                sie auch später einlösen. Sie sind 1 Jahr gültig.
              </div>
            </div>
          ),
        },
        {
          title: "Lust auf die Drehscheibe?",
          content:
            "Gegen Aufpreis kannst du an einem separaten Tag eine Einführung an der Drehscheibe sowie einzelne 1-Stunden-Slots dazubuchen.",
        },
      ],
    },
  };

  const icons = [getImage("touch.png"), getImage("sight.png")];
  const current = content[currentLang];
  const displayTitle = customTitle?.[currentLang] || current.title;

  // NEW: Update the browser tab title dynamically
  useEffect(() => {
    document.title = `${displayTitle} | Atelier Sinnesküche`;
  }, [displayTitle]);

  // --- ANIMATION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 50, damping: 15 },
    },
  };

  // NEW: Directional Slide Variants for Feature Card Slider
  const gallerySlideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? "100%" : direction < 0 ? "-100%" : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction > 0 ? "-100%" : direction < 0 ? "100%" : 0,
      opacity: 0,
    }),
  };

  // --- Swipe Handlers for the Main Image ---
  const handleNextImage = () => {
    setGalleryDirection(1);
    setActiveGalleryIndex((prev) => (prev + 1) % totalImages);
  };

  const handlePrevImage = () => {
    setGalleryDirection(-1);
    setActiveGalleryIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const handleTouchMove = (e) => (touchEndX.current = e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) handleNextImage();
    if (distance < -50) handlePrevImage();
    touchStartX.current = null;
    touchEndX.current = null;
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
      zIndex: 2,
    },
    welcomeText: {
      fontSize: "0.95rem",
      fontStyle: "italic",
      letterSpacing: "0.15em",
      color: "#1c0700",
      opacity: 0.7,
      marginBottom: "12px",
      fontWeight: "500",
    },
    infoGrid: {
      display: "flex",
      justify欣Center: "center",
      alignItems: "center",
      gap: "16px",
      marginTop: "25px",
      marginBottom: "40px",
      flexWrap: "wrap",
    },
    infoItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 28px",
      background: "rgba(202, 175, 243, 0.15)",
      border: "1px solid rgba(202, 175, 243, 0.3)",
      borderRadius: "100px",
      color: "#1c0700",
      whiteSpace: "nowrap",
      cursor: "default",
      boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
    },
    infoLabel: { fontSize: "0.85rem", lineHeight: "1.4", fontWeight: "600" },
    accordionContainer: {
      marginTop: "32px",
      textAlign: "left",
      width: "100%",
    },
    accordionItem: {
      border: "1px solid rgba(202, 175, 243, 0.25)",
      borderRadius: "14px",
      marginBottom: "14px",
      overflow: "hidden",
      background: "rgba(202, 175, 243, 0.03)",
    },
    accordionHeader: {
      width: "100%",
      padding: "18px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(202, 175, 243, 0.06)",
      border: "none",
      cursor: "pointer",
      color: "#1c0700",
      fontFamily: "inherit",
      fontSize: isMobile ? "0.85rem" : "1.05rem",
      fontWeight: "600",
      textAlign: "left",
    },
    accordionContent: {
      padding: "20px 24px",
      color: "#1c0700",
      opacity: 0.9,
      lineHeight: "1.65",
      whiteSpace: "pre-line",
      fontSize: isMobile ? "0.85rem" : "0.95rem",
    },
  };

  return (
    <div
      className="course-container"
      style={{ position: "relative", overflow: "hidden", minHeight: "100vh" }}
    >
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
        onClick={() => setIsBookingExpanded(true)}
      />

      <style>
        {`
          html { scroll-behavior: smooth; }

          /* Feature Card Layout */
          .feature-gallery-container {
            width: 100%;
            margin-top: 20px;
            margin-bottom: 40px; 
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }

          .feature-main-wrapper {
            width: 100%;
            height: 480px; 
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            touch-action: pan-y;
          }

          .feature-main-image {
            max-width: 100%;
            max-height: 100%;
            border-radius: 12px;
            object-fit: contain;
            box-shadow: 0 12px 35px rgba(0,0,0,0.15);
            position: absolute; 
          }

          .feature-thumbnail-strip {
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: nowrap;
            width: 100%;
            padding: 0 5px;
          }

          .feature-thumbnail {
            width: 32px; /* Fixed back to 32px on Desktop */
            height: 32px;
            flex-shrink: 0;
            border-radius: 50%;
            object-fit: cover;
            cursor: pointer;
            opacity: 0.45;
            transition: all 0.3s ease;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            border: 2px solid transparent;
          }

          .feature-thumbnail:hover {
            opacity: 0.8;
            transform: scale(1.05);
          }

          .feature-thumbnail.active {
            opacity: 1;
            transform: scale(1.1);
            border-color: #caaff3;
            box-shadow: 0 6px 15px rgba(202, 175, 243, 0.4);
          }

          .desc-wrapper {
            margin-bottom: 40px;
          }

          @media (max-width: 768px) {
            .main-content { 
              display: flex !important; 
              flex-direction: column !important; 
              align-items: center; 
              padding-top: 120px !important; 
              padding-bottom: 40px !important;
            }
            .course-title-wrapper { 
              order: -1; 
              margin-bottom: 15px;
              font-weight: 500 !important; 
            }
            .welcome-text { 
              margin-bottom: 25px !important; 
              font-size: 0.85rem !important; 
              width: 85vw !important; 
              line-height: 1.5;
            }
            
            /* FORCE COMPACT SINGLE LINE PILLS ON MOBILE */
            .info-grid { 
              flex-direction: row !important; 
              flex-wrap: nowrap !important; 
              justify-content: center !important;
              gap: 6px !important; 
              width: 100vw !important;
              max-width: 100vw !important;
              margin-top: 10px !important; 
              margin-bottom: 20px !important; 
              overflow-x: auto;
              scrollbar-width: none; 
              padding: 0 15px !important;
            }
            .info-grid::-webkit-scrollbar { display: none; }
            .info-item { flex-shrink: 0; padding: 6px 12px !important; }
            
            .feature-gallery-container {
              margin-top: 10px;
              margin-bottom: 25px;
              gap: 12px;
            }
            .feature-main-wrapper {
              height: 220px;
            }
            .feature-thumbnail-strip {
              gap: 8px;
            }
            .feature-thumbnail {
              width: 20px; /* Locked to exactly 20px on Mobile */
              height: 20px;
            }

            .desc-wrapper {
              padding: 0 5px;
              margin-bottom: 20px !important;
            }
            .desc-wrapper, .desc-wrapper * {
              text-align: left !important;
              line-height: 1.65 !important;
            }
          }
        `}
      </style>

      <motion.main
        style={styles.main}
        className="main-content"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="course-title-wrapper">
          <CourseTitle title={displayTitle} config={config} icons={icons} />
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="welcome-text"
          style={styles.welcomeText}
        >
          {current.welcome}
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="info-grid"
          style={styles.infoGrid}
        >
          {/* Dynamically slice the details array down to 2 elements on mobile */}
          {(isMobile ? current.details.slice(0, 2) : current.details).map(
            (item, index) => (
              <motion.div
                key={index}
                className="info-item"
                style={styles.infoItem}
                whileHover={{
                  scale: 1.03,
                  backgroundColor: "rgba(202, 175, 243, 0.25)",
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div style={{ display: "flex", color: "#caaff3" }}>
                  {item.icon}
                </div>
                <span style={styles.infoLabel}>{item.text}</span>
              </motion.div>
            ),
          )}
        </motion.div>

        {/* --- INLINE RENDERING KEEPS Snapshots/Tab Titles Reacting perfectly --- */}

        {/* Mobile Gallery (Gallery first on mobile) */}
        {isMobile && galleryImages.length > 0 && (
          <motion.div
            className="feature-gallery-container"
            variants={itemVariants}
          >
            <div
              className="feature-main-wrapper"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence initial={false} custom={galleryDirection}>
                <motion.img
                  key={activeGalleryIndex}
                  custom={galleryDirection}
                  variants={gallerySlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  src={galleryImages[activeGalleryIndex]}
                  alt={`Featured Pottery ${activeGalleryIndex + 1}`}
                  className="feature-main-image"
                />
              </AnimatePresence>
            </div>
            <div className="feature-thumbnail-strip">
              {galleryImages.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`Thumbnail ${index + 1}`}
                  className={`feature-thumbnail ${activeGalleryIndex === index ? "active" : ""}`}
                  onClick={() => {
                    setGalleryDirection(index > activeGalleryIndex ? 1 : -1);
                    setActiveGalleryIndex(index);
                  }}
                  loading="lazy"
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Description Block */}
        <motion.div
          variants={itemVariants}
          className="desc-wrapper"
          style={{
            width: "100%",
            maxWidth: "800px",
            margin: "0 auto",
            textWrap: "pretty",
          }}
        >
          <CourseDescription text={current.description} />
        </motion.div>

        {/* Desktop Gallery (Description first on Desktop) */}
        {!isMobile && galleryImages.length > 0 && (
          <motion.div
            className="feature-gallery-container"
            variants={itemVariants}
          >
            <div
              className="feature-main-wrapper"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence initial={false} custom={galleryDirection}>
                <motion.img
                  key={activeGalleryIndex}
                  custom={galleryDirection}
                  variants={gallerySlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  src={galleryImages[activeGalleryIndex]}
                  alt={`Featured Pottery ${activeGalleryIndex + 1}`}
                  className="feature-main-image"
                />
              </AnimatePresence>
            </div>
            <div className="feature-thumbnail-strip">
              {galleryImages.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`Thumbnail ${index + 1}`}
                  className={`feature-thumbnail ${activeGalleryIndex === index ? "active" : ""}`}
                  onClick={() => {
                    setGalleryDirection(index > activeGalleryIndex ? 1 : -1);
                    setActiveGalleryIndex(index);
                  }}
                  loading="lazy"
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Dynamic Accordion Tabs Section */}
        <motion.div
          variants={itemVariants}
          className="tabs-wrapper"
          style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}
        >
          <div style={styles.accordionContainer}>
            {current.tabs.map((tab, idx) => {
              const isOpen = activeTab === idx;
              return (
                <div key={idx} style={styles.accordionItem}>
                  <button
                    onClick={() => setActiveTab(isOpen ? null : idx)}
                    style={styles.accordionHeader}
                  >
                    <span>{tab.title}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "flex", color: "#caaff3" }}
                    >
                      <ChevronUp size={20} />
                    </motion.div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: isOpen ? "auto" : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={styles.accordionContent}>{tab.content}</div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          ref={bookingRef}
          className="booking-section"
          style={{ width: "100%", marginTop: isMobile ? "-15px" : "20px" }}
        >
          <PriceDisplay
            coursePath="/pottery"
            currentLang={currentLang}
            forceExpand={isBookingExpanded}
          />
        </motion.div>
      </motion.main>
    </div>
  );
}
