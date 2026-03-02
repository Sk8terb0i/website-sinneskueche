import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import { FileText, Save, Loader2, Globe } from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  labelStyle,
  inputStyle,
  btnStyle,
} from "./AdminStyles";

export default function TermsTab({ isMobile, userRole, allowedCourses = [] }) {
  const [termsData, setTermsData] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");

  const isFullAdmin = userRole === "admin";

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

  // Set initial selected course once availableCourses is loaded
  useEffect(() => {
    if (availableCourses.length > 0 && !selectedCourse) {
      setSelectedCourse(availableCourses[0].link.replace(/\//g, ""));
    }
  }, [availableCourses, selectedCourse]);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "course_terms"));
      const data = {};
      snap.docs.forEach((doc) => {
        data[doc.id] = doc.data();
      });
      setTermsData(data);
    } catch (error) {
      console.error("Error fetching terms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (courseId, lang, value) => {
    setTermsData((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        [lang]: value,
      },
    }));
  };

  const saveTerms = async (courseId) => {
    setSavingId(courseId);
    try {
      const dataToSave = {
        en: termsData[courseId]?.en || "",
        de: termsData[courseId]?.de || "",
        updatedAt: new Date().toISOString(),
      };
      // CourseId is the sanitized path (e.g., 'pottery')
      await setDoc(doc(db, "course_terms", courseId), dataToSave, {
        merge: true,
      });
    } catch (error) {
      alert("Error saving terms: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <Loader2 className="spinner" size={30} color="#caaff3" />
      </div>
    );
  }

  // Find the data for the currently selected course
  const activeCourse = availableCourses.find(
    (c) => c.link.replace(/\//g, "") === selectedCourse,
  );

  return (
    <section
      style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <FileText size={18} /> Course Terms & Conditions
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Dropdown Selector */}
        <div
          style={{
            backgroundColor: "#fdf8e1",
            padding: "1.5rem",
            borderRadius: "16px",
            border: "1px solid rgba(28, 7, 0, 0.05)",
          }}
        >
          <label style={labelStyle}>Select Course to Edit Terms</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              ...inputStyle,
              backgroundColor: "rgba(202, 175, 243, 0.1)",
              cursor: "pointer",
              marginBottom: 0,
            }}
          >
            {availableCourses.length === 0 && (
              <option>No courses assigned</option>
            )}
            {availableCourses.map((c) => {
              const cId = c.link.replace(/\//g, "");
              return (
                <option key={cId} value={cId}>
                  {c.text.en}
                </option>
              );
            })}
          </select>
        </div>

        {/* Active Course Terms Card */}
        {activeCourse && (
          <div
            key={selectedCourse}
            style={{
              ...cardStyle,
              flexDirection: "column",
              alignItems: "stretch",
              gap: "1.5rem",
              padding: isMobile ? "1.5rem" : "2rem",
              backgroundColor: "#fdf8e1",
              borderLeft: "6px solid #caaff3",
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: "1.2rem", color: "#1c0700" }}>
                {activeCourse.text.en}
              </h4>
              <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                Sanitized ID: {selectedCourse}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "2rem",
              }}
            >
              {/* English Terms */}
              <div>
                <label
                  style={{
                    ...labelStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Globe size={14} /> Terms (English)
                </label>
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "250px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: "1.4",
                    padding: "12px",
                  }}
                  value={termsData[selectedCourse]?.en || ""}
                  placeholder="Enter specific terms, rules or cancellation policies for this course..."
                  onChange={(e) =>
                    handleTextChange(selectedCourse, "en", e.target.value)
                  }
                />
              </div>

              {/* German Terms */}
              <div>
                <label
                  style={{
                    ...labelStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Globe size={14} /> AGB (Deutsch)
                </label>
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "250px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: "1.4",
                    padding: "12px",
                  }}
                  value={termsData[selectedCourse]?.de || ""}
                  placeholder="Spezifische Bedingungen, Regeln oder Stornierungsbedingungen eingeben..."
                  onChange={(e) =>
                    handleTextChange(selectedCourse, "de", e.target.value)
                  }
                />
              </div>
            </div>

            <button
              onClick={() => saveTerms(selectedCourse)}
              disabled={savingId === selectedCourse}
              style={{
                ...btnStyle,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                alignSelf: "flex-end",
                width: isMobile ? "100%" : "250px",
              }}
            >
              {savingId === selectedCourse ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <Save size={18} />
              )}
              {savingId === selectedCourse ? "Saving..." : "Save Terms"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
