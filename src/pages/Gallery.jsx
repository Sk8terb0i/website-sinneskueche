import { useState, useEffect, useMemo } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * TWEAK THESE NUMBERS TO CHANGE COLUMN DISTRIBUTION
 */
const DESKTOP_COUNTS = [10, 12, 12];
const MOBILE_COUNTS = [18, 16];

// --- ASSETS ---
const planetIcons = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
// Make sure these filenames match exactly what you have in your planets folder
const titleIcons = [
  planetIcons["../assets/planets/sight.png"]?.default,
  planetIcons["../assets/planets/touch.png"]?.default,
];

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

  // Title configuration matching your other pages
  const titleConfig = {
    desktop: {
      topIcon: { top: "-35px", left: "-80px" },
      bottomIcon: { top: "60px", left: "190px" },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-50px", left: "-50px" },
      bottomIcon: { top: "15px", left: "calc(100% - 15px)" },
      titleSize: "2.8rem",
    },
  };

  const columns = useMemo(() => {
    const counts = isMobile ? MOBILE_COUNTS : DESKTOP_COUNTS;
    const cols = counts.map(() => []);

    sortedImages.forEach((img, i) => {
      let targetCol = i % counts.length;
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
    en: { title: "Gallery", subtitle: "Impressions of our creative space" },
    de: { title: "Galerie", subtitle: "Einblicke in unseren kreativen Ort" },
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

      {/* Main container mirrors the centered flex layout of Pottery.jsx */}
      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "160px 20px 80px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div
          className="course-title-wrapper"
          style={{ textAlign: "center", marginBottom: "10px" }}
        >
          <CourseTitle
            title={content[currentLang].title}
            config={titleConfig}
            icons={titleIcons}
          />
        </div>

        {/* Subtitle explicitly matches the welcome-text style from other pages */}
        <p
          className="welcome-text"
          style={{
            fontSize: "0.9rem",
            fontStyle: "italic",
            letterSpacing: "0.15em",
            color: "#1c0700",
            opacity: 0.6,
            marginBottom: "60px",
            fontWeight: "500",
            textAlign: "center",
          }}
        >
          {content[currentLang].subtitle}
        </p>

        {/* Gallery Grid */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? "12px" : "30px",
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
                gap: isMobile ? "12px" : "30px",
              }}
            >
              {column.map(({ img, index }) => (
                <motion.div
                  key={index}
                  // Mobile stays at 0 (straight), Desktop uses the alternating slight tilt
                  initial={{
                    rotate: isMobile ? 0 : index % 2 === 0 ? -0.5 : 0.5,
                  }}
                  whileHover={{ rotate: 0, scale: 1.02 }}
                  onClick={() => setSelectedImg(img)}
                  className="gallery-item"
                >
                  <img
                    src={img}
                    alt=""
                    loading={index < 9 ? "eager" : "lazy"}
                    fetchpriority={index < 9 ? "high" : "low"}
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      transition: "filter 0.4s ease",
                    }}
                  />
                  <div className="item-number">
                    {(index + 1).toString().padStart(2, "0")}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImg(null)}
            className="lb-overlay"
          >
            <button className="lb-close" onClick={() => setSelectedImg(null)}>
              <X size={32} />
            </button>
            <motion.div
              className="lb-content"
              initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
            >
              <img
                src={selectedImg}
                alt=""
                onClick={(e) => e.stopPropagation()}
                className="lb-img"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .gallery-item {
          position: relative;
          cursor: pointer;
          border-radius: 4px;
          overflow: hidden;
          background-color: rgba(28, 7, 0, 0.02);
          transition: box-shadow 0.4s ease;
        }

        .gallery-item img {
          filter: saturate(0.8) contrast(1.05);
        }

        .gallery-item:hover {
          box-shadow: 0 20px 40px rgba(202, 175, 243, 0.3);
          z-index: 10;
        }

        .gallery-item:hover img {
          filter: saturate(1) contrast(1);
        }

        .item-number {
          position: absolute;
          bottom: 12px;
          right: 12px;
          font-family: Satoshi;
          font-size: 0.65rem;
          color: white;
          background: #1c0700;
          padding: 2px 6px;
          border-radius: 2px;
          opacity: 0;
          transition: all 0.3s ease;
          letter-spacing: 1px;
        }

        .gallery-item:hover .item-number {
          opacity: 1;
          box-shadow: 0 0 10px #caaff3;
        }

        .lb-overlay {
          position: fixed; inset: 0;
          background-color: rgba(28, 7, 0, 0.98); 
          z-index: 9999; display: flex; align-items: center; 
          justify-content: center; padding: 20px; box-sizing: border-box;
          backdrop-filter: blur(15px);
        }

        .lb-close {
          position: absolute; top: 30px; right: 30px;
          background: none; border: none; color: #caaff3; cursor: pointer;
          transition: transform 0.2s ease;
        }

        .lb-close:hover {
            transform: rotate(90deg) scale(1.1);
        }

        .lb-content {
            display: flex; align-items: center; justify-content: center;
            width: 100%; height: 100%;
        }

        .lb-img {
          max-height: 82vh; 
          max-width: 92vw;
          object-fit: contain; 
          border: 1px solid rgba(202, 175, 243, 0.3);
          border-radius: 2px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6);
        }

        @media (max-width: 768px) {
          .course-title-wrapper { 
            order: -1; 
            margin-bottom: 10px;
          }
          .welcome-text {
            margin-bottom: 30px !important;
            font-size: 0.85rem !important;
            width: 80vw !important;
          }
        }
      `}</style>
    </div>
  );
}
