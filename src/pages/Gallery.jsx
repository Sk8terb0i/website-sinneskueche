import { useState, useEffect, useMemo } from "react";
import Header from "../components/Header/Header";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * TWEAK THESE NUMBERS TO CHANGE COLUMN DISTRIBUTION
 * Current: Column 1 (10 images), Column 2 (12 images), Column 3 (12 images)
 */
const DESKTOP_COUNTS = [10, 12, 12];
const MOBILE_COUNTS = [18, 16];

const atelierImages = import.meta.glob(
  "../assets/atelier-images/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
  },
);

const sortedImages = Object.entries(atelierImages)
  .sort(([pathA], [pathB]) => {
    const getNum = (path) => {
      const filename = path.split("/").pop();
      const match = filename.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 999;
    };
    return getNum(pathA) - getNum(pathB);
  })
  .map(([_, mod]) => mod.default);

export default function Gallery({ currentLang, setCurrentLang }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedImg, setSelectedImg] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. DISTRIBUTION ENGINE
  const columns = useMemo(() => {
    const counts = isMobile ? MOBILE_COUNTS : DESKTOP_COUNTS;
    const cols = counts.map(() => []);

    sortedImages.forEach((img, i) => {
      // Step A: Determine the "Natural" horizontal column (0, 1, or 2)
      let targetCol = i % counts.length;

      // Step B: Check if that column is full based on your DESKTOP_COUNTS.
      // If it's full, move to the next available column to prevent a "trail."
      let safetyCheck = 0;
      while (
        cols[targetCol].length >= counts[targetCol] &&
        safetyCheck < counts.length
      ) {
        targetCol = (targetCol + 1) % counts.length;
        safetyCheck++;
      }

      cols[targetCol].push({ img, index: i });
    });
    return cols;
  }, [isMobile, sortedImages]);

  const content = {
    en: { title: "gallery", subtitle: "impressions of the atelier" },
    de: { title: "galerie", subtitle: "einblicke in das atelier" },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#fffce3",
        overflowX: "hidden",
      }}
    >
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main
        style={{
          padding: "140px 20px 80px 20px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "60px" }}>
          <h1
            style={{
              fontSize: isMobile ? "2.5rem" : "3.5rem",
              color: "#1c0700",
              margin: 0,
              fontFamily: "Harmond-SemiBoldCondensed",
              textTransform: "lowercase",
            }}
          >
            {content[currentLang].title}
          </h1>
          <p
            style={{
              opacity: 0.6,
              fontStyle: "italic",
              marginTop: "10px",
              fontFamily: "Satoshi",
            }}
          >
            {content[currentLang].subtitle}
          </p>
        </header>

        {/* MASONRY FLEX:
            Columns share the width (no trail) and stack naturally (no gaps).
        */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? "12px" : "24px",
            width: "100%",
            alignItems: "flex-start",
          }}
        >
          {columns.map((column, colIdx) => (
            <div
              key={colIdx}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: isMobile ? "12px" : "24px",
              }}
            >
              {column.map(({ img, index }) => (
                <div
                  key={index}
                  onClick={() => setSelectedImg(img)}
                  style={{
                    cursor: "pointer",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={img}
                    alt={`Atelier ${index + 1}`}
                    loading={index < 9 ? "eager" : "lazy"}
                    fetchpriority={index < 9 ? "high" : "low"}
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      transition: "transform 0.4s ease",
                    }}
                    onMouseEnter={(e) =>
                      !isMobile && (e.target.style.transform = "scale(1.02)")
                    }
                    onMouseLeave={(e) =>
                      !isMobile && (e.target.style.transform = "scale(1)")
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImg(null)}
            className="lightbox-overlay"
          >
            <button className="close-btn" onClick={() => setSelectedImg(null)}>
              <X size={32} />
            </button>
            <motion.div
              className="lightbox-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <img
                src={selectedImg}
                alt="Full view"
                onClick={(e) => e.stopPropagation()}
                className="lightbox-img"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .lightbox-overlay {
          position: fixed; inset: 0; background-color: rgba(28, 7, 0, 0.98); 
          z-index: 9999; display: flex; align-items: center; 
          justify-content: center; padding: 20px; box-sizing: border-box;
          backdrop-filter: blur(10px);
        }
        .close-btn {
          position: absolute; top: 30px; right: 30px;
          background: none; border: none; color: white; cursor: pointer;
        }
        .lightbox-img {
          max-height: 82vh; 
          max-width: 92vw;
          object-fit: contain; 
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
