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
  Coffee,
  Globe,
  Mail,
  HeartHandshake,
  ChevronUp,
  Tag,
} from "lucide-react";
import { motion } from "framer-motion";

// Direct imports prevent Vite from eagerly loading the entire planets asset folder
import sightDigital from "../assets/planets/sight_digital.png";
import touchDigital from "../assets/planets/touch_digital.png";
import digitalRegister from "../assets/planets/digital_register.png";

export default function Digitalkueche({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBookingExpanded, setIsBookingExpanded] = useState(false);
  const bookingRef = useRef(null);
  const [activeTab, setActiveTab] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [coursePrice, setCoursePrice] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const docRef = doc(db, "course_settings", "webdesign");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const priceVal =
            data.packs?.priceSingle ||
            data.priceSingle ||
            data.singlePrice ||
            data.price;
          if (priceVal) setCoursePrice(`${priceVal} CHF`);
        }
      } catch (err) {
        console.error("Error fetching price:", err);
      }
    };
    fetchPrice();
  }, []);

  // Dynamic SEO Metadata & Canonical Tag
  useEffect(() => {
    const isEn = currentLang === "en";

    document.title = isEn
      ? "Webdesign Course | Digitalküche | Sinnesküche Schlieren"
      : "Webdesign Kurs | Digitalküche | Sinnesküche Schlieren";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        isEn
          ? "Build your own website in 1 day with Astro and GitHub Pages. 0 CHF hosting costs. Beginner-friendly workshop in Schlieren, Zurich."
          : "Erstelle deine eigene Website in 1 Tag mit Astro und GitHub Pages. 0 CHF Hosting-Kosten. Anfängerfreundlicher Kurs in Schlieren, Zürich.",
      );
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://sinneskueche.ch/digitalkueche/");
  }, [currentLang]);

  // Schema.org Structured Data (JSON-LD)
  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: "Webdesign Course",
      description:
        "Learn to build and host your own website in one day with zero ongoing hosting fees.",
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
      title: "Digital Kitchen",
      welcome:
        "A creative space for digital art, code, and interactive design.",
      ctaFloating: "register now",
      courses: [
        {
          title: "Webdesign Course",
          details: [
            { icon: <Clock size={18} />, text: "10:00 - 18:00" },
            ...(coursePrice
              ? [{ icon: <Tag size={18} />, text: coursePrice }]
              : []),
            {
              icon: <Users size={18} />,
              text: "No coding experience",
            },
            { icon: <Coffee size={18} />, text: "Bring your own laptop" },
            { icon: <Globe size={18} />, text: "EN / DE" },
          ],
          description: `Build your own unique website from scratch in **just one day**!\n\nIn this workshop, we will use Astro. This modern and beginner-friendly framework builds lightning-fast websites. We will connect your site to your custom domain and host it via GitHub. This keeps your **ongoing monthly hosting costs at 0 CHF**.\n\nWe will go through the entire setup together. We will look at **templates** to understand how the code works under the hood and customize everything to your liking. As a game designer and transdisciplinary artist, I will support you with the **technical code** and with finding your **unique visual design**.`,
          tabs: [
            {
              title: "Hardware & Software",
              content:
                "Bring your own laptop. We will do all the necessary software installations together at the start of the course.",
            },
            {
              title: "Domains & Hosting",
              content:
                "Hosting on GitHub is free. A custom domain usually costs around 15 CHF per year. You can buy one beforehand or bring a credit card to purchase it during the course.",
            },
            {
              title: "Preparation & Breaks",
              content:
                "Bring any images, videos, or texts you want to put on your website. You can also develop these ideas during the course. We have a one-hour lunch break. Feel free to bring your own food or grab something from the shops nearby.",
            },
          ],
        },
      ],
      generalInfo: {
        discountsTitle: "Solidarity Discounts",
        privateTitle: "On-Demand Workshops",
      },
    },
    de: {
      title: "Digitalküche",
      welcome:
        "Ein kreativer Raum für digitale Kunst, Code und interaktives Design.",
      ctaFloating: "jetzt buchen",
      courses: [
        {
          title: "Webdesign Course",
          details: [
            { icon: <Clock size={18} />, text: "10:00 - 18:00" },
            ...(coursePrice
              ? [{ icon: <Tag size={18} />, text: coursePrice }]
              : []),
            {
              icon: <Users size={18} />,
              text: "Ohne Vorkenntnisse",
            },
            { icon: <Coffee size={18} />, text: "Bring deinen Laptop mit" },
            { icon: <Globe size={18} />, text: "EN / DE" },
          ],
          description: `Erstelle in **nur einem Tag** deine eigene, einzigartige Website von Grund auf neu!\n\nIn diesem Workshop nutzen wir Astro. Dieses moderne und anfängerfreundliche Tool erstellt blitzschnelle Websites. Wir verknüpfen deine Seite mit deiner eigenen Domain und hosten sie über GitHub. So bleiben **deine laufenden Hosting-Kosten bei exakt 0 CHF**.\n\nWir richten alles gemeinsam ein. Wir schauen uns **Templates** an, um den Code zu verstehen und alles nach deinen Wünschen anzupassen. Als Game Designer und transdisziplinärer Künstler unterstütze ich dich bei der **Technik** und beim **visuellen Design** deiner Seite.`,
          tabs: [
            {
              title: "Hardware & Software",
              content:
                "Bring deinen eigenen Laptop mit. Wir werden alle notwendigen Programme gemeinsam zu Beginn des Kurses einrichten.",
            },
            {
              title: "Domains & Hosting",
              content:
                "Das Hosting über GitHub ist kostenlos. Eine eigene Domain kostet etwa 15 CHF pro Jahr. Du kannst sie vorher kaufen oder eine Kreditkarte mitbringen, um sie direkt im Kurs zu erwerben.",
            },
            {
              title: "Vorbereitung & Pausen",
              content:
                "Bringe Bilder, Videos oder Texte mit, die du einbauen möchtest. Du kannst diese Ideen auch erst im Kurs entwickeln. Wir machen eine Stunde Mittagspause. Du kannst gerne dein eigenes Essen mitbringen oder dir in der Nähe etwas holen.",
            },
          ],
        },
      ],
      generalInfo: {
        discountsTitle: "Solidaritätsrabatt",
        privateTitle: "Workshops auf Anfrage",
      },
    },
  };

  const icons = [sightDigital, touchDigital];
  const current = content[currentLang];

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
      marginBottom: "1.5rem",
      flexWrap: "wrap",
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
        planetImage={digitalRegister}
        onClick={() => setIsBookingExpanded(true)}
      />

      <style>{`
        @media (max-width: 768px) {
          .main-content { padding-top: 120px !important; padding-bottom: 40px !important; }
          .course-title-wrapper { order: -1; margin-bottom: 15px; }
          .welcome-text { margin-bottom: 25px !important; font-size: 0.85rem !important; width: 85vw !important; line-height: 1.5; }
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

            <div style={styles.description}>
              {course.description
                .split("**")
                .map((chunk, i) =>
                  i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk,
                )}
            </div>

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
                color: "#4e5f28",
              }}
            >
              <HeartHandshake size={20} /> {current.generalInfo.discountsTitle}
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
                  Ich biete einen Solidaritätsrabatt für Menschen mit
                  finanziellen Engpässen an. Frag einfach per{" "}
                  <Link
                    to="/contact"
                    style={{
                      color: "#4e5f28",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    Kontaktformular
                  </Link>{" "}
                  oder{" "}
                  <a
                    href="mailto:salut@sinneskueche.ch"
                    style={{
                      color: "#4e5f28",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    E-Mail (salut@sinneskueche.ch)
                  </a>{" "}
                  nach einem Code. Es sind keine Nachweise oder Erklärungen
                  erforderlich. Ich vertraue darauf, dass dieses Angebot fair
                  genutzt wird.
                </>
              ) : (
                <>
                  I offer a solidarity discount for anyone experiencing
                  financial constraints. Simply ask for a code via the{" "}
                  <Link
                    to="/contact"
                    style={{
                      color: "#4e5f28",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    contact form
                  </Link>{" "}
                  or{" "}
                  <a
                    href="mailto:salut@sinneskueche.ch"
                    style={{
                      color: "#4e5f28",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    email (salut@sinneskueche.ch)
                  </a>
                  . No proof or explanation is required. I trust that this
                  option is used fairly.
                </>
              )}
            </p>
          </div>
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
                  Suchst du nach einem privaten Gruppen-Workshop, einem
                  Team-Event oder einer 1-zu-1 Session? Massgeschneiderte
                  Termine können jederzeit per{" "}
                  <a
                    href="mailto:salut@sinneskueche.ch"
                    style={{
                      color: "#9960a8",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    E-Mail (salut@sinneskueche.ch)
                  </a>{" "}
                  angefragt werden.
                </>
              ) : (
                <>
                  Looking for a custom group workshop, a team event, or a 1-on-1
                  session? You can book custom dates on demand by sending an{" "}
                  <a
                    href="mailto:salut@sinneskueche.ch"
                    style={{
                      color: "#9960a8",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    email (salut@sinneskueche.ch)
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
            coursePath="/digitalkueche"
            currentLang={currentLang}
            forceExpand={isBookingExpanded}
          />
        </motion.div>
      </motion.main>
    </div>
  );
}
