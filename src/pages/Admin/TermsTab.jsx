import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import { FileText, Save, Loader2, Globe, ChevronDown } from "lucide-react";
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

  const [availableCourses, setAvailableCourses] = useState([]);
  const [calendarGroups, setCalendarGroups] = useState({});
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const courseDropdownRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target)
      ) {
        setIsCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchCoursesAndGroups = async () => {
      const cgSnap = await getDocs(collection(db, "calendar_groups"));
      const cgMap = {};
      cgSnap.docs.forEach((d) => (cgMap[d.id] = d.data().includedLinks || []));
      setCalendarGroups(cgMap);

      const base = Array.from(
        new Map(
          planets
            .filter((p) => p.type === "courses")
            .flatMap((p) => p.courses || [])
            .filter((c) => c.link)
            .map((course) => [course.link, course]),
        ).values(),
      );
      try {
        const snap = await getDocs(collection(db, "custom_courses"));
        const custom = snap.docs.map((d) => ({
          link: d.data().link,
          text: { en: d.data().nameEn, de: d.data().nameDe },
        }));
        const combined = [...base, ...custom];
        setAvailableCourses(
          combined.filter(
            (c) => isFullAdmin || allowedCourses.includes(c.link),
          ),
        );
      } catch (err) {
        setAvailableCourses(
          base.filter((c) => isFullAdmin || allowedCourses.includes(c.link)),
        );
      }
    };
    fetchCoursesAndGroups();
    fetchTerms();
  }, [userRole, allowedCourses, isFullAdmin]);

  useEffect(() => {
    if (availableCourses.length > 0 && !selectedCourse) {
      setSelectedCourse(availableCourses[0].link.replace(/\//g, ""));
    }
  }, [availableCourses, selectedCourse]);

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
          <div style={{ position: "relative" }} ref={courseDropdownRef}>
            <div
              onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
              style={{
                ...inputStyle,
                backgroundColor: "rgba(202, 175, 243, 0.1)",
                cursor: "pointer",
                marginBottom: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                userSelect: "none",
                fontWeight: "600",
              }}
            >
              <span>
                {availableCourses.length === 0
                  ? labels.noCourses
                  : availableCourses.find(
                      (c) => c.link.replace(/\//g, "") === selectedCourse,
                    )?.text[currentLang || "en"] || selectedCourse}
              </span>
              <ChevronDown
                size={18}
                style={{
                  transform: isCourseDropdownOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  color: "#9960a8",
                }}
              />
            </div>

            {isCourseDropdownOpen && (
              <div
                className="custom-scrollbar"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "8px",
                  backgroundColor: "#fffce3",
                  border: "1px solid rgba(202, 175, 243, 0.4)",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px rgba(28, 7, 0, 0.1)",
                  zIndex: 50,
                  maxHeight: "350px",
                  overflowY: "auto",
                  padding: "8px",
                }}
              >
                {(() => {
                  const renderedLinks = new Set();
                  const groups = [];

                  const baseCourses = Array.from(
                    new Map(
                      planets
                        .filter((p) => p.type === "courses")
                        .flatMap((p) => p.courses || [])
                        .filter((c) => c.link)
                        .map((c) => [c.link, c]),
                    ).values(),
                  ).filter(
                    (base) => isFullAdmin || allowedCourses.includes(base.link),
                  );

                  baseCourses.forEach((base) => {
                    const baseId = base.link.replace(/\//g, "");
                    const includedLinks = calendarGroups[baseId] || [base.link];

                    const groupOptions = includedLinks
                      .map((l) => availableCourses.find((ac) => ac.link === l))
                      .filter(Boolean);

                    if (groupOptions.length > 0) {
                      groups.push(
                        <div key={baseId} style={{ marginBottom: "8px" }}>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: "900",
                              textTransform: "uppercase",
                              color: "#4e5f28",
                              padding: "8px 12px 4px 12px",
                              opacity: 0.6,
                            }}
                          >
                            {base.text[currentLang || "en"]} Group
                          </div>
                          {groupOptions.map((opt) => {
                            renderedLinks.add(opt.link);
                            const optId = opt.link.replace(/\//g, "");
                            const isSelected = selectedCourse === optId;
                            return (
                              <div
                                key={optId}
                                onClick={() => {
                                  setSelectedCourse(optId);
                                  setIsCourseDropdownOpen(false);
                                }}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  backgroundColor: isSelected
                                    ? "rgba(202, 175, 243, 0.2)"
                                    : "transparent",
                                  color: isSelected ? "#9960a8" : "#1c0700",
                                  fontWeight: isSelected ? "bold" : "normal",
                                  transition: "background-color 0.2s",
                                  fontSize: "0.9rem",
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <span>{opt.text[currentLang || "en"]}</span>
                                {opt.link !== base.link && (
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      opacity: 0.5,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {opt.link}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>,
                      );
                    }
                  });

                  const ungrouped = availableCourses.filter(
                    (ac) => !renderedLinks.has(ac.link),
                  );
                  if (ungrouped.length > 0) {
                    groups.push(
                      <div key="ungrouped" style={{ marginBottom: "8px" }}>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: "900",
                            textTransform: "uppercase",
                            color: "#ff4d4d",
                            padding: "8px 12px 4px 12px",
                            opacity: 0.8,
                          }}
                        >
                          Unassigned Sub-Courses
                        </div>
                        {ungrouped.map((opt) => {
                          const optId = opt.link.replace(/\//g, "");
                          const isSelected = selectedCourse === optId;
                          return (
                            <div
                              key={optId}
                              onClick={() => {
                                setSelectedCourse(optId);
                                setIsCourseDropdownOpen(false);
                              }}
                              style={{
                                padding: "10px 12px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                backgroundColor: isSelected
                                  ? "rgba(202, 175, 243, 0.2)"
                                  : "transparent",
                                color: isSelected ? "#9960a8" : "#1c0700",
                                fontWeight: isSelected ? "bold" : "normal",
                                transition: "background-color 0.2s",
                                fontSize: "0.9rem",
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span>{opt.text[currentLang || "en"]}</span>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  opacity: 0.5,
                                  fontFamily: "monospace",
                                }}
                              >
                                {opt.link}
                              </span>
                            </div>
                          );
                        })}
                      </div>,
                    );
                  }

                  return groups;
                })()}
              </div>
            )}
          </div>
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
