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

export default function TermsTab({
  isMobile,
  userRole,
  allowedCourses = [],
  currentLang,
}) {
  const [termsData, setTermsData] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");

  const isFullAdmin = userRole === "admin";
  const labels = {
    en: {
      title: "Course Terms & Conditions",
      select: "Select Course to Edit Terms",
      noCourses: "No courses assigned",
      pathId: "Sanitized ID:",
      enLabel: "Terms (English)",
      deLabel: "AGB (Deutsch)",
      save: "Save Terms",
      saving: "Saving...",
      enPlace: "Enter terms...",
      dePlace: "Bedingungen eingeben...",
    },
    de: {
      title: "Kurs AGB",
      select: "Kurs zur Bearbeitung wählen",
      noCourses: "Keine Kurse zugewiesen",
      pathId: "ID:",
      enLabel: "AGB (Englisch)",
      deLabel: "AGB (Deutsch)",
      save: "AGB speichern",
      saving: "Speichert...",
      enPlace: "Bedingungen eingeben...",
      dePlace: "Bedingungen eingeben...",
    },
  }[currentLang || "en"];

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

  useEffect(() => {
    if (availableCourses.length > 0 && !selectedCourse)
      setSelectedCourse(availableCourses[0].link.replace(/\//g, ""));
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

  const saveTerms = async (courseId) => {
    setSavingId(courseId);
    try {
      await setDoc(
        doc(db, "course_terms", courseId),
        {
          en: termsData[courseId]?.en || "",
          de: termsData[courseId]?.de || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <Loader2 className="spinner" size={30} color="#caaff3" />
      </div>
    );
  const activeCourse = availableCourses.find(
    (c) => c.link.replace(/\//g, "") === selectedCourse,
  );

  return (
    <section
      style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <FileText size={18} /> {labels.title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div
          style={{
            backgroundColor: "#fdf8e1",
            padding: "1.5rem",
            borderRadius: "16px",
            border: "1px solid rgba(28, 7, 0, 0.05)",
          }}
        >
          <label style={labelStyle}>{labels.select}</label>
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
              <option>{labels.noCourses}</option>
            )}
            {availableCourses.map((c) => (
              <option key={c.link} value={c.link.replace(/\//g, "")}>
                {c.text[currentLang || "en"]}
              </option>
            ))}
          </select>
        </div>
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
                {activeCourse.text[currentLang || "en"]}
              </h4>
              <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                {labels.pathId} {selectedCourse}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "2rem",
              }}
            >
              <div>
                <label
                  style={{
                    ...labelStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Globe size={14} /> {labels.enLabel}
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
                  placeholder={labels.enPlace}
                  onChange={(e) =>
                    setTermsData((prev) => ({
                      ...prev,
                      [selectedCourse]: {
                        ...prev[selectedCourse],
                        en: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    ...labelStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Globe size={14} /> {labels.deLabel}
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
                  placeholder={labels.dePlace}
                  onChange={(e) =>
                    setTermsData((prev) => ({
                      ...prev,
                      [selectedCourse]: {
                        ...prev[selectedCourse],
                        de: e.target.value,
                      },
                    }))
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
              {savingId === selectedCourse ? labels.saving : labels.save}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
