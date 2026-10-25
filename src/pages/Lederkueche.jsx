import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import PriceDisplay from "../components/PriceDisplay/PriceDisplay";
import RegisterShortcut from "../components/RegisterShortcut/RegisterShortcut";
import {
  Clock,
  Users,
  Globe,
  Mail,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Tag,
  Scissors,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getImage = (filename) => `/planets/${filename}`;

// Fetch all images dynamically from the folder
const imageModules = import.meta.glob("../assets/leder/*.{jpg,jpeg,JPG,JPEG}", {
  eager: true,
});
const galleryImages = Object.values(imageModules).map((mod) => mod.default);

export default function Lederkueche({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBookingExpanded, setIsBookingExpanded] = useState(false);
  const bookingRef = useRef(null);
  const [activeTab, setActiveTab] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [coursePrice, setCoursePrice] = useState("");

  // Gallery States
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const docRef = doc(db, "course_settings", "lederkueche-travelers");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const priceVal =
            data.packs?.priceSingle ||
            data.priceSingle ||
            data.singlePrice ||
            data.price;
          if (priceVal) setCoursePrice(`${priceVal} CHF`);
        } else {
          setCoursePrice("100 CHF");
        }
      } catch (err) {
        console.error("Error fetching price:", err);
      }
    };
    fetchPrice();
  }, []);

  useEffect(() => {
    const isEn = currentLang === "en";

    document.title = isEn
      ? "Lederküche Workshop | Sinnesküche Schlieren"
      : "Lederküche Workshop | Sinnesküche Schlieren";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        isEn
          ? "Build and customize your own leather journal in our Traveler's Notebook Workshop. High-quality upcycled materials."
          : "Baue und personalisiere dein eigenes Leder-Notizbuch in unserem Traveler's Notebook Workshop. Hochwertige Upcycling-Materialien.",
      );
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://sinneskueche.ch/lederkueche/");
  }, [currentLang]);

  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: "Traveler's Notebook Workshop",
      description:
        "Build and customize your own leather journal using high-quality deadstock materials.",
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
      topIcon: { top: "-30px", left: "-50px" },
      bottomIcon: { top: "15px", left: "calc(100% - 35px)" },
      titleSize: "2.8rem",
    },
  };

  const content = {
    en: {
      title: "Lederküche",
      welcome: "A creative space to craft and connect.",
      ctaFloating: "register now",
      courses: [
        {
          title: "Traveler's Notebook Workshop",
          details: [
            { icon: <Clock size={18} />, text: "2.5 Hours" },
            { icon: <Tag size={18} />, text: coursePrice || "100,-" },
            {
              icon: <Users size={18} />,
              text: "Beginners",
            },
            {
              icon: <Scissors size={18} />,
              text: "All tools provided",
            },
            {
              icon: <Globe size={18} />,
              text: "EN / DE (adapted to the group)",
            },
          ],
          description: `Build and customize your own leather journal! In this workshop, we get to know various types of leather, the different Traveler's Notebook systems, and various formats. Then, you will customize your own cover on-site. You will choose your preferred format, select your preferred leather, build your cover and string, decorate and emboss it. Finally, we will bind our own paper inserts using a simple trick you can replicate without any special tools at home.`,
          tabs: [
            {
              title: "Materials, Upcycling & Ethics",
              content:
                "Leather is a beautiful, inherently valuable natural material, but its conventional production comes with a heavy cost to animal welfare. Because I have yet to find an alternative that works for this specific purpose, we balance this ethical tension by primarily using high-quality deadstock and leftovers (for example from local bag makers). I will share more about options that you can employ in the workshop. Because we work with deadstock, this naturally shapes the format, colour, and leather combinations that are available on the day. But not to worry—I will have plenty of options, and you will surely find something you love!",
            },
            {
              title: "Special Requests",
              content:
                "If you have very concrete ideas about a specific colour and format, please let me know in advance. I will see if I can source that for you (please note this might cause an extra cost).",
            },
            {
              title: "Preparation & What to Bring",
              content:
                "No prior knowledge is needed, and you don't need to bring anything with you! There will be different types of leather, pendants, charms, elastics in various colours, and all the tools we need.\n\nOptional: Your favourite notebook or agenda (so we can adapt the cover size), or a personal charm to add to your journal.",
            },
            {
              title: "Pricing & Philosophy",
              content:
                "This workshop is not about making a profit; it is about sharing a hobby. The price is calculated to cover the costs of the workspace rental and the high-quality materials.",
            },
          ],
        },
      ],
      generalInfo: {
        privateTitle: "On-Demand Workshops",
      },
    },
    de: {
      title: "Lederküche",
      welcome: "Ein kreativer Raum, um zu gestalten und sich auszutauschen.",
      ctaFloating: "jetzt buchen",
      courses: [
        {
          title: "Traveler's Notebook Workshop",
          details: [
            { icon: <Clock size={18} />, text: "2.5 Stunden" },
            { icon: <Tag size={18} />, text: coursePrice || "100,-" },
            {
              icon: <Users size={18} />,
              text: "Anfänger:innen",
            },
            {
              icon: <Scissors size={18} />,
              text: "Alle Werkzeuge und Materialien inbegriffen",
            },
            {
              icon: <Globe size={18} />,
              text: "EN / DE (an die Gruppe angepasst)",
            },
          ],
          description: `Baue und personalisiere dein eigenes Leder-Notizbuch! In diesem Workshop lernen wir verschiedene Lederarten, die unterschiedlichen Traveler's Notebook Systeme und verschiedene Formate kennen. Dann wirst du dein eigenes Cover vor Ort anpassen. Du wählst dein bevorzugtes Format, suchst dir dein Lieblingsleder aus, fertigst dein Cover und die Schnürung an, verzierst und prägst es. Schließlich binden wir unsere eigenen Papiereinlagen mit einem einfachen Trick, den du ohne Spezialwerkzeug zu Hause nachmachen kannst.`,
          tabs: [
            {
              title: "Materialien, Upcycling & Ethik",
              content:
                "Leder ist ein wunderschönes, von Natur aus wertvolles Material, aber die konventionelle Herstellung ist mit hohen Kosten für das Tierwohl verbunden. Da ich für diesen speziellen Zweck noch keine funktionierende Alternative gefunden habe, balancieren wir diese ethische Spannung aus, indem wir hauptsächlich hochwertige Restposten und Verschnitt (zum Beispiel von lokalen Taschenherstellern) verwenden. Im Workshop teile ich gerne weitere Optionen mit euch. Da wir mit Restposten arbeiten, bestimmt dies natürlich das Format, die Farbe und die Lederkombinationen, die an diesem Tag verfügbar sind. Aber keine Sorge – ich werde genügend Auswahl haben, und du wirst sicher etwas finden, das dir gefällt!",
            },
            {
              title: "Sonderwünsche",
              content:
                "Wenn du sehr konkrete Vorstellungen von einer bestimmten Farbe und einem bestimmten Format hast, lass es mich bitte im Voraus wissen. Ich werde sehen, ob ich das für dich besorgen kann (bitte beachte, dass dies zusätzliche Kosten verursachen kann).",
            },
            {
              title: "Vorbereitung & Was du mitbringen solltest",
              content:
                "Es sind keine Vorkenntnisse nötig und du musst nichts mitbringen! Es wird verschiedene Lederarten, Anhänger, Charms, Gummibänder in diversen Farben und alle benötigten Werkzeuge geben.\n\nOptional: Dein Lieblingsnotizbuch oder deine Agenda (damit wir die Covergröße anpassen können) oder ein persönlicher Charm für dein Journal.",
            },
            {
              title: "Preise & Philosophie",
              content:
                "Bei diesem Workshop geht es nicht darum, Gewinn zu machen, sondern ein Hobby zu teilen. Der Preis ist so kalkuliert, dass er die Kosten für die Raummiete und die hochwertigen Materialien deckt.",
            },
          ],
        },
      ],
      generalInfo: {
        privateTitle: "Workshops auf Anfrage",
      },
    },
  };

  const icons = [getImage("touch.png"), getImage("smell.png")];
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
    courseTitle: {
      fontFamily: "Harmond-SemiBoldCondensed",
      fontSize: isMobile ? "1.8rem" : "2.2rem",
      color: "#1c0700",
      marginTop: 0,
      marginBottom: "2rem",
      textAlign: "center",
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
      whiteSpace: "pre-line",
      fontSize: "0.95rem",
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
      whiteSpace: "pre-line",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
    },
    generalInfoBox: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: "20px",
      width: "100%",
      maxWidth: "800px",
      marginTop: "2rem",
      marginBottom: "3rem",
    },
    infoPanel: {
      flex: 1,
      backgroundColor: "#fdf8e1",
      border: "1px dashed rgba(28, 7, 0, 0.15)",
      borderRadius: "16px",
      padding: "1.5rem",
      textAlign: "left",
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
        planetImage={getImage("leather_register.png")}
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
                        pointerEvents: "none", // Prevents drag bugs
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

        {current.courses.map((course, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            style={styles.courseCard}
          >
            <h2 style={styles.courseTitle}>{course.title}</h2>

            <div style={styles.infoGrid}>
              {course.details.map((item, dIdx) => (
                <div key={dIdx} style={styles.infoItem}>
                  <div style={{ color: "#caaff3", display: "flex" }}>
                    {item.icon}
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            <div style={styles.description}>{course.description}</div>

            {course.tabs && course.tabs.length > 0 && (
              <div style={styles.accordionContainer}>
                {course.tabs.map((tab, tIdx) => {
                  const tabId = `${idx}_${tIdx}`;
                  const isOpen = activeTab === tabId;
                  return (
                    <div key={tIdx} style={styles.accordionItem}>
                      <button
                        onClick={() => setActiveTab(isOpen ? null : tabId)}
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
        ))}

        <motion.div variants={itemVariants} style={styles.generalInfoBox}>
          <div style={styles.infoPanel}>
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#9960a8",
              }}
            >
              <Mail size={20} /> {current.generalInfo.privateTitle}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                opacity: 0.85,
                lineHeight: 1.5,
              }}
            >
              {currentLang === "de" ? (
                <>
                  Suchst du nach einem individuellen Gruppen-Workshop, einem
                  kreativen Team-Event oder einer Session mit Freunden? Du
                  kannst Wunschtermine auf Anfrage per{" "}
                  <a
                    href="mailto:salut@sinneskueche.ch"
                    style={{
                      color: "#9960a8",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    E-Mail
                  </a>{" "}
                  buchen.
                </>
              ) : (
                <>
                  Looking for a custom group workshop, a creative team event, or
                  a session with friends? You can book custom dates on demand by
                  sending an{" "}
                  <a
                    href="mailto:salut@sinneskueche.ch"
                    style={{
                      color: "#9960a8",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    email
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          ref={bookingRef}
          style={{ width: "100%" }}
        >
          <PriceDisplay
            coursePath="/lederkueche"
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
