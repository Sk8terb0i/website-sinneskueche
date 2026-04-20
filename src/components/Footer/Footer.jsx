import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Footer({ currentLang }) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  // Track both mobile width and actual portrait orientation
  const [dimensions, setDimensions] = useState({
    isMobile: window.innerWidth <= 768,
    isPortrait: window.innerHeight > window.innerWidth,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        isMobile: window.innerWidth <= 768,
        isPortrait: window.innerHeight > window.innerWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    // Reset visibility on route change to prevent jumping
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 800);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [location.pathname]);

  // Logic for hiding on specific pages + orientation
  const isHiddenPage =
    location.pathname === "/" || location.pathname === "/team";
  const shouldHide = isHiddenPage && dimensions.isPortrait;

  const styles = {
    footer: {
      width: "100%",
      padding: dimensions.isMobile ? "30px 15px" : "30px 20px 40px",
      backgroundColor: "#fffce3",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: dimensions.isMobile ? "15px" : "20px",
      borderTop: "1px solid rgba(28, 7, 0, 0.05)",
      marginTop: "auto",
      boxSizing: "border-box",
      opacity: 0,
    },
    nav: {
      display: "flex",
      gap: dimensions.isMobile ? "20px" : "30px",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    link: {
      color: "#1c0700",
      textDecoration: "none",
      fontSize: "0.85rem",
      fontFamily: "Satoshi",
      fontStyle: "italic",
      opacity: 0.6,
      transition: "opacity 0.3s ease",
      textTransform: "lowercase",
      textAlign: "center",
    },
    copyright: {
      fontSize: "0.75rem",
      fontFamily: "Satoshi",
      opacity: 0.3,
      letterSpacing: "0.05em",
      marginTop: "2px",
      textTransform: "lowercase",
      textAlign: "center",
    },
  };

  // If we are on a hidden page in portrait mode, don't render anything
  if (shouldHide) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.footer
          style={styles.footer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <nav style={styles.nav}>
            {!dimensions.isMobile && (
              <>
                <a
                  href="https://www.instagram.com/sinneskueche/"
                  target="_blank"
                  rel="noreferrer"
                  style={styles.link}
                >
                  instagram
                </a>
                <a href="mailto:salut@sinneskueche.ch" style={styles.link}>
                  salut@sinneskueche.ch
                </a>
              </>
            )}

            <Link to="/terms" style={styles.link}>
              {currentLang === "en" ? "terms of service" : "agb"}
            </Link>
            <Link to="/privacy" style={styles.link}>
              {currentLang === "en" ? "privacy policy" : "datenschutz"}
            </Link>
          </nav>

          <div style={styles.copyright}>
            © {new Date().getFullYear()} sinnesküche - schlieren, ch
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}
