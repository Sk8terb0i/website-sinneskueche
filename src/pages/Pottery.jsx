import { useState, useRef, useEffect } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import PriceDisplay from "../components/PriceDisplay/PriceDisplay";
import RegisterShortcut from "../components/RegisterShortcut/RegisterShortcut";
import KulturlegiUpload from "../components/KulturlegiUpload/KulturlegiUpload";

import {
  Clock,
  Users,
  Coffee,
  ChevronDown,
  ChevronUp,
  Ticket,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Serves planet images on-demand from public/planets/ (downloads ~600 KB instead of 9 MB)
const getImage = (filename) => `/planets/${filename}`;

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
  const [activeTab, setActiveTab] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Gallery States
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dynamic SEO Metadata & Canonical Tag
  useEffect(() => {
    const isEn = currentLang === "en";

    document.title = isEn
      ? "Pottery Studio | Töpferküche | Sinnesküche Schlieren"
      : "Töpferwerkstatt | Töpferküche | Sinnesküche Schlieren";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        isEn
          ? "Open pottery studio and pottery wheel workshops in Schlieren, Zurich. All skill levels welcome."
          : "Offene Töpferwerkstatt und Drehscheiben-Kurse in Schlieren, Zürich. Alle Level willkommen.",
      );
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://sinneskueche.ch/pottery/");
  }, [currentLang]);

  // Schema.org Structured Data (JSON-LD)
  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: "Töpferküche",
      description:
        "Open pottery studio sessions and pottery wheel workshops in Schlieren.",
      provider: {
        "@type": "Organization",
        name: "Sinnesküche",
        sameAs: "https://sinneskueche.ch",
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "OnSite",
        location: "Atelier Sinnesküche, Schlieren, Switzerland",
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.innerHTML = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const config = {
    desktop: {
      topIcon: { top: "-35px", left: "-80px" },
      bottomIcon: { top: "60px", left: "300px" },
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
      welcome: "Cook up your own masterpiece",
      ctaFloating: "register now",
      details: [
        {
          icon: <Ticket size={18} />,
          text: "49.- / Single Session, All inclusive",
        },
        { icon: <Clock size={18} />, text: "Tuesday, Thursday & Sunday" },
        { icon: <Users size={18} />, text: "All skill levels" },
        { icon: <Coffee size={18} />, text: "Small, cozy groups" },
      ],
      description: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            In our Töpferküche, you can try your hand at pottery in a welcoming
            atmosphere. <strong>All experience levels are welcome.</strong>
          </div>
          <div>
            Clay, tools, and rollers are ready for you. Work on your own project
            or get inspired by other participants. We are always here if you
            need help.
          </div>
          <div>
            Simply <strong>book a single session</strong> whenever you want to
            create and bring your love for pottery.
          </div>
        </div>
      ),
      tabs: [
        {
          title: "How it works",
          content: (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div>
                Book a date, drop by, and get started. First-timers receive a
                brief intro to the studio and basic techniques.
              </div>
              <div>
                <strong>All-inclusive:</strong> Clay, glazes, firing, and the
                use of all tools. You only need to bring your ideas.
              </div>
            </div>
          ),
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
                redeemed whenever you like.
              </div>
              <div>
                <strong>Validity:</strong> All passes are valid for 1 year.
              </div>
            </div>
          ),
        },
        {
          title: "Fancy the pottery wheel?",
          content: (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div>
                First, complete the mandatory general pottery studio intro.
                Next, attend the dedicated pottery wheel intro session.
              </div>
              <div>
                Once completed, you can freely book open wheel slots for an
                additional charge whenever you come by.
              </div>
              <div>
                <strong>Please note:</strong> The wheel intro strictly covers
                equipment safety and handling; it does not include open practice
                time.
              </div>
            </div>
          ),
        },
      ],
    },
    de: {
      title: "Töpferküche",
      welcome: "Gönn dir eine kreative Auszeit",
      ctaFloating: "jetzt buchen",
      details: [
        {
          icon: <Ticket size={18} />,
          text: "49.- / Einzeltermin, Alles inklusive",
        },
        { icon: <Clock size={18} />, text: "Dienstag, Donnerstag & Sonntag" },
        { icon: <Users size={18} />, text: "Alle Level willkommen" },
        { icon: <Coffee size={18} />, text: "Kleine, gemütliche Gruppen" },
      ],
      description: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            In unserer Töpferküche kannst du dich in vertrauter Atmosphäre im
            Töpfern versuchen.{" "}
            <strong>
              Jede:r ist willkommen, unabhängig von deinen Vorkenntnissen.
            </strong>
          </div>
          <div>
            Ton, Werkzeug und Walze stehen bereit. Du arbeitest an deinem
            eigenen Projekt oder lässt dich inspirieren. Wenn du Hilfe brauchst,
            sind wir da.
          </div>
          <div>
            <strong>Buche einfach deinen Termin</strong> nach Lust und Laune und
            bring Freude am Töpfern mit.
          </div>
        </div>
      ),
      tabs: [
        {
          title: "So funktioniert’s",
          content: (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div>
                Termin buchen, vorbeikommen, loslegen. Wer zum ersten Mal da
                ist, bekommt eine kurze Einführung in Werkstatt und grundlegende
                Techniken.
              </div>
              <div>
                <strong>Alles inklusive:</strong> Ton, Glasuren, das Brennen
                deiner Werke und sämtliche Werkzeuge.
              </div>
            </div>
          ),
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
                sie flexibel einlösen.
              </div>
              <div>
                <strong>Gültigkeit:</strong> Alle Abos sind 1 Jahr gültig.
              </div>
            </div>
          ),
        },
        {
          title: "Lust auf die Drehscheibe?",
          content: (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div>
                Besuche zuerst den obligatorischen Werkstatt-Einführungskurs und
                absolviere anschliessend die Einführung für die Drehscheibe.
              </div>
              <div>
                Sobald du diese abgeschlossen hast, kannst du jederzeit gegen
                Aufpreis eigene Drehscheiben-Slots buchen.
              </div>
              <div>
                <strong>Bitte beachte:</strong> Die Einführung dient
                ausschliesslich dem Kennenlernen des Geräts und beinhaltet keine
                freie Übungszeit.
              </div>
            </div>
          ),
        },
      ],
    },
  };

  const icons = [getImage("touch.png"), getImage("sight.png")];
  const current = content[currentLang];

  const visibleGalleryCount = isMobile ? 1 : 3;
  const maxGalleryIndex = Math.max(
    0,
    galleryImages.length - visibleGalleryCount,
  );

  const nextGallerySlide = () => {
    setGalleryIndex((prev) => Math.min(prev + 1, maxGalleryIndex));
  };
  const prevGallerySlide = () => {
    setGalleryIndex((prev) => Math.max(prev - 1, 0));
  };

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
      marginBottom: "40px",
      fontWeight: "500",
    },
    galleryContainer: {
      width: "100%",
      maxWidth: "800px",
      marginBottom: "3rem",
      position: "relative",
    },
    galleryBtn: {
      background: "transparent",
      border: "none",
      width: "40px",
      height: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#9960a8",
      cursor: "pointer",
      transition: "transform 0.2s ease, opacity 0.2s ease",
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 10,
    },
    courseCard: {
      backgroundColor: "rgba(202, 175, 243, 0.05)",
      border: "1px solid rgba(202, 175, 243, 0.2)",
      borderRadius: "24px",
      padding: isMobile ? "1.5rem" : "2.5rem",
      width: "100%",
      maxWidth: "800px",
      marginBottom: "2rem",
      textAlign: "left",
    },
    infoGrid: {
      display: "flex",
      justifyContent: "center",
      gap: "12px",
      flexWrap: "wrap",
      maxWidth: "650px",
      margin: "0 auto 1.5rem auto",
    },
    infoItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      background: "rgba(202, 175, 243, 0.15)",
      borderRadius: "100px",
      color: "#1c0700",
      fontSize: "0.85rem",
      fontWeight: "600",
    },
    description: {
      color: "#1c0700",
      opacity: 0.9,
      lineHeight: "1.6",
      fontSize: "0.95rem",
      textAlign: "center",
      maxWidth: "680px",
      margin: "0 auto 1.75rem auto",
    },
    accordionContainer: { marginTop: "24px", textAlign: "left", width: "100%" },
    accordionItem: {
      border: "1px solid rgba(202, 175, 243, 0.25)",
      borderRadius: "14px",
      marginBottom: "10px",
      overflow: "hidden",
      background: "rgba(202, 175, 243, 0.03)",
    },
    accordionHeader: {
      width: "100%",
      padding: "16px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(202, 175, 243, 0.06)",
      border: "none",
      cursor: "pointer",
      color: "#1c0700",
      fontSize: isMobile ? "0.85rem" : "0.95rem",
      fontWeight: "600",
      textAlign: "left",
    },
    accordionContent: {
      padding: "16px 20px",
      color: "#1c0700",
      opacity: 0.9,
      lineHeight: "1.6",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
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

      <style>{`
        @media (max-width: 768px) {
          .main-content { padding-top: 120px !important; padding-bottom: 40px !important; }
          .course-title-wrapper { order: -1; margin-bottom: 15px; }
          .welcome-text { margin-bottom: 25px !important; font-size: 0.85rem !important; width: 85vw !important; line-height: 1.5; }
        }
        .gallery-image-hover:hover {
          transform: scale(1.05);
        }
      `}</style>

      <motion.main
        style={styles.main}
        className="main-content"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="course-title-wrapper">
          <CourseTitle title={current.title} config={config} icons={icons} />
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="welcome-text"
          style={styles.welcomeText}
        >
          {current.welcome}
        </motion.p>

        {galleryImages.length > 0 && (
          <motion.div variants={itemVariants} style={styles.galleryContainer}>
            <button
              onClick={prevGallerySlide}
              disabled={galleryIndex === 0}
              style={{
                ...styles.galleryBtn,
                left: isMobile ? "-35px" : "-50px",
                opacity: galleryIndex === 0 ? 0 : 1,
                pointerEvents: galleryIndex === 0 ? "none" : "auto",
              }}
            >
              <ChevronLeft size={32} strokeWidth={1.5} />
            </button>

            <div
              style={{ overflow: "hidden", padding: "10px 0", width: "100%" }}
            >
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset }) => {
                  if (offset.x < -50 && galleryIndex < maxGalleryIndex)
                    nextGallerySlide();
                  else if (offset.x > 50 && galleryIndex > 0)
                    prevGallerySlide();
                }}
                animate={{
                  x: `calc(-${(galleryIndex * 100) / visibleGalleryCount}% - ${(galleryIndex * 15) / visibleGalleryCount}px)`,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ display: "flex", gap: "15px", width: "100%" }}
              >
                {galleryImages.map((src) => (
                  <div
                    key={src}
                    onClick={() => setLightboxImage(src)}
                    style={{
                      flex: `0 0 calc((100% - ${(visibleGalleryCount - 1) * 15}px) / ${visibleGalleryCount})`,
                      aspectRatio: "4/3",
                      borderRadius: "16px",
                      overflow: "hidden",
                      cursor: "zoom-in",
                      boxShadow: "0 4px 15px rgba(28, 7, 0, 0.05)",
                      border: "1px solid rgba(28, 7, 0, 0.05)",
                      boxSizing: "border-box",
                      position: "relative",
                    }}
                  >
                    <img
                      src={src}
                      alt="Gallery preview"
                      className="gallery-image-hover"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s ease",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                ))}
              </motion.div>
            </div>

            <button
              onClick={nextGallerySlide}
              disabled={galleryIndex >= maxGalleryIndex}
              style={{
                ...styles.galleryBtn,
                right: isMobile ? "-35px" : "-50px",
                opacity: galleryIndex >= maxGalleryIndex ? 0 : 1,
                pointerEvents:
                  galleryIndex >= maxGalleryIndex ? "none" : "auto",
              }}
            >
              <ChevronRight size={32} strokeWidth={1.5} />
            </button>
          </motion.div>
        )}

        <motion.div variants={itemVariants} style={styles.courseCard}>
          <div style={styles.infoGrid}>
            {current.details.map((item, dIdx) => (
              <div key={dIdx} style={styles.infoItem}>
                <div style={{ color: "#caaff3", display: "flex" }}>
                  {item.icon}
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div style={styles.description}>{current.description}</div>

          {current.tabs && current.tabs.length > 0 && (
            <div style={styles.accordionContainer}>
              {current.tabs.map((tab, tIdx) => {
                const isOpen = activeTab === tIdx;
                return (
                  <div key={tIdx} style={styles.accordionItem}>
                    <button
                      onClick={() => setActiveTab(isOpen ? null : tIdx)}
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
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          ref={bookingRef}
          style={{ width: "100%" }}
        >
          <KulturlegiUpload currentLang={currentLang} />
          <PriceDisplay
            coursePath="/pottery"
            currentLang={currentLang}
            forceExpand={isBookingExpanded}
          />
        </motion.div>
      </motion.main>

      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              backgroundColor: "rgba(28, 7, 0, 0.85)",
              backdropFilter: "blur(5px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setLightboxImage(null)}
          >
            <button
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                color: "#fffce3",
                cursor: "pointer",
                padding: "8px",
                zIndex: 2,
              }}
            >
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={lightboxImage}
              alt="Expanded view"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
