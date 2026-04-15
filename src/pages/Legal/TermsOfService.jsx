import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { planets } from "../../data/planets";
import Header from "../../components/Header/Header";
import { Loader2, ArrowRight } from "lucide-react";

export default function TermsOfService({ currentLang, setCurrentLang }) {
  const { courseId: initialCourseId } = useParams();
  const [allTerms, setAllTerms] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);

  // --- ADDED: Local Menu State ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getCourseName = (id) => {
    const allCourses = planets
      .filter((p) => p.type === "courses")
      .flatMap((p) => p.courses || []);
    const match = allCourses.find((c) => c.link.replace(/\//g, "") === id);
    return match ? match.text[currentLang] : id;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "course_terms"));
        const data = {};
        snap.docs.forEach((doc) => {
          const content = doc.data();
          if (content[currentLang] && content[currentLang].trim() !== "") {
            data[doc.id] = content;
          }
        });
        setAllTerms(data);

        const courseIds = Object.keys(data).filter((id) => id !== "general");

        if (initialCourseId && data[initialCourseId]) {
          setSelectedCourseId(initialCourseId);
        } else if (courseIds.length === 1) {
          setSelectedCourseId(courseIds[0]);
        }
      } catch (err) {
        console.error("Error fetching terms:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentLang, initialCourseId]);

  const courseIds = Object.keys(allTerms).filter((id) => id !== "general");

  const styles = {
    container: {
      padding: "160px 20px 80px",
      maxWidth: "800px",
      margin: "0 auto",
      fontFamily: "Satoshi",
      color: "#1c0700",
    },
    title: {
      fontFamily: "Harmond-SemiBoldCondensed",
      fontSize: "3rem",
      marginBottom: "2rem",
      textTransform: "lowercase",
    },
    section: {
      marginBottom: "4rem",
      borderBottom: "1px solid rgba(28, 7, 0, 0.05)",
      paddingBottom: "2rem",
    },
    courseTitle: {
      fontFamily: "Harmond-SemiBoldCondensed",
      fontSize: "1.8rem",
      marginBottom: "1rem",
      color: "#9960a8",
      textTransform: "lowercase",
    },
    text: { whiteSpace: "pre-wrap", lineHeight: "1.7", opacity: 0.9 },
    listCard: (isActive) => ({
      padding: "20px",
      backgroundColor: isActive
        ? "rgba(202, 175, 243, 0.25)"
        : "rgba(202, 175, 243, 0.1)",
      borderRadius: "12px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "pointer",
      marginBottom: "10px",
      transition: "all 0.3s ease",
      border: isActive ? "1px solid #caaff3" : "1px solid transparent",
    }),
  };

  return (
    <div style={{ backgroundColor: "#fffce3", minHeight: "100vh" }}>
      {/* --- UPDATED: Header with state --- */}
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main style={styles.container}>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: "50px",
            }}
          >
            <Loader2 className="spinner" size={40} color="#caaff3" />
          </div>
        ) : (
          <>
            <h1 style={styles.title}>
              {currentLang === "en" ? "terms & conditions" : "agb"}
            </h1>

            {allTerms["general"] && (
              <div style={styles.section}>
                <div style={styles.text}>
                  {allTerms["general"][currentLang]}
                </div>
              </div>
            )}

            {courseIds.length > 1 && (
              <div style={{ marginBottom: "3rem" }}>
                <h3
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.4,
                    marginBottom: "1.5rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {currentLang === "en"
                    ? "Course Specific Terms"
                    : "Kurs-spezifische AGB"}
                </h3>
                {courseIds.map((id) => (
                  <div
                    key={id}
                    style={styles.listCard(selectedCourseId === id)}
                    onClick={() => setSelectedCourseId(id)}
                  >
                    <span style={{ fontWeight: "600" }}>
                      {getCourseName(id)}
                    </span>
                    <ArrowRight
                      size={18}
                      color="#caaff3"
                      style={{
                        transform:
                          selectedCourseId === id ? "rotate(90deg)" : "none",
                        transition: "transform 0.3s",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedCourseId && allTerms[selectedCourseId] && (
              <div
                key={selectedCourseId}
                style={{ animation: "fadeIn 0.5s ease-out" }}
              >
                <h2 style={styles.courseTitle}>
                  {getCourseName(selectedCourseId)}
                </h2>
                <div style={styles.text}>
                  {allTerms[selectedCourseId][currentLang]}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
