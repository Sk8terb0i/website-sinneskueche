import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Calendar,
  Save,
  Loader2,
  Plus,
  Trash2,
  Link as LinkIcon,
  Edit2,
  XCircle,
} from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  labelStyle,
  inputStyle,
  btnStyle,
} from "./AdminStyles";
import { planets } from "../../data/planets";

export default function CalendarsTab({ isMobile, currentLang }) {
  const [customCourses, setCustomCourses] = useState([]);
  const [calendarGroups, setCalendarGroups] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [newNameEn, setNewNameEn] = useState("");
  const [newNameDe, setNewNameDe] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editingCourseId, setEditingCourseId] = useState(null);

  const labels = {
    en: {
      createSub: "Create Sub-Course",
      editSub: "Edit Sub-Course",
      cancel: "Cancel",
      urlSlug: "URL Slug (e.g., /pottery-wheel)",
      nameEn: "Name (EN)",
      nameDe: "Name (DE)",
      saveCourse: "Save Course",
      updateCourse: "Update Course",
      activeCustom: "Active Custom Courses",
      noCustom: "No custom courses yet.",
      calIntegration: "Calendar Integration",
      calDesc:
        "Select an existing page below and choose which courses should be displayed in its calendar.",
      calendar: "Calendar",
      deleteConfirm: "Delete this custom course?",
      errorSaving: "Error saving: ",
    },
    de: {
      createSub: "Unterkurs erstellen",
      editSub: "Unterkurs bearbeiten",
      cancel: "Abbrechen",
      urlSlug: "URL-Pfad (z.B. /pottery-wheel)",
      nameEn: "Name (EN)",
      nameDe: "Name (DE)",
      saveCourse: "Kurs speichern",
      updateCourse: "Kurs aktualisieren",
      activeCustom: "Aktive benutzerdefinierte Kurse",
      noCustom: "Noch keine benutzerdefinierten Kurse.",
      calIntegration: "Kalender-Integration",
      calDesc:
        "Wähle unten eine bestehende Seite aus und bestimme, welche Kurse in deren Kalender angezeigt werden sollen.",
      calendar: "Kalender",
      deleteConfirm: "Diesen benutzerdefinierten Kurs wirklich löschen?",
      errorSaving: "Fehler beim Speichern: ",
    },
  }[currentLang || "en"];

  const baseCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((c) => [c.link, c]),
    ).values(),
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const ccSnap = await getDocs(collection(db, "custom_courses"));
    setCustomCourses(ccSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const cgSnap = await getDocs(collection(db, "calendar_groups"));
    const cgMap = {};
    cgSnap.docs.forEach((d) => (cgMap[d.id] = d.data().includedLinks || []));
    setCalendarGroups(cgMap);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const slug = newSlug.startsWith("/") ? newSlug : `/${newSlug}`;
      const newId = slug.replace(/\//g, "");

      // If we are editing and the slug changed, delete the old document
      if (editingCourseId && editingCourseId !== newId) {
        await deleteDoc(doc(db, "custom_courses", editingCourseId));
      }

      await setDoc(doc(db, "custom_courses", newId), {
        nameEn: newNameEn,
        nameDe: newNameDe,
        link: slug,
      });

      setNewNameEn("");
      setNewNameDe("");
      setNewSlug("");
      setEditingCourseId(null);
      await fetchData();
    } catch (err) {
      alert(labels.errorSaving + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourseId(course.id);
    setNewNameEn(course.nameEn);
    setNewNameDe(course.nameDe);
    setNewSlug(course.link);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingCourseId(null);
    setNewNameEn("");
    setNewNameDe("");
    setNewSlug("");
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm(labels.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "custom_courses", id));
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleCalendarLink = async (baseLink, targetLink) => {
    const baseId = baseLink.replace(/\//g, "");
    const currentLinks = calendarGroups[baseId] || [baseLink];

    let newLinks;
    if (currentLinks.includes(targetLink)) {
      newLinks = currentLinks.filter((l) => l !== targetLink);
      if (newLinks.length === 0) newLinks = [baseLink];
    } else {
      newLinks = [...currentLinks, targetLink];
    }

    try {
      await setDoc(doc(db, "calendar_groups", baseId), {
        includedLinks: newLinks,
      });
      setCalendarGroups((prev) => ({ ...prev, [baseId]: newLinks }));
    } catch (err) {
      alert(labels.errorSaving + err.message);
    }
  };

  // Only the custom courses will be used to populate the toggle options
  const customLinks = customCourses.map((c) => ({
    link: c.link,
    text: { en: c.nameEn, de: c.nameDe },
  }));

  return (
    <div
      style={{
        display: isMobile ? "block" : "flex",
        gap: "2rem",
        paddingBottom: "5rem",
      }}
    >
      <section
        style={{ width: isMobile ? "100%" : "450px", marginBottom: "2rem" }}
      >
        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fdf8e1",
            flexDirection: "column",
            padding: isMobile ? "1.2rem" : "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
            }}
          >
            <h3
              style={{
                ...sectionTitleStyle,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {editingCourseId ? <Edit2 size={18} /> : <Plus size={18} />}
              {editingCourseId ? labels.editSub : labels.createSub}
            </h3>
            {editingCourseId && (
              <button
                onClick={resetForm}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ff4d4d",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                }}
              >
                <XCircle size={16} /> {labels.cancel}
              </button>
            )}
          </div>

          <form
            onSubmit={handleCreateCourse}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label style={labelStyle}>{labels.urlSlug}</label>
              <input
                required
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <label style={labelStyle}>{labels.nameEn}</label>
                <input
                  required
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{labels.nameDe}</label>
                <input
                  required
                  value={newNameDe}
                  onChange={(e) => setNewNameDe(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...btnStyle,
                display: "flex",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isLoading ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                <Save size={16} />
              )}{" "}
              {editingCourseId ? labels.updateCourse : labels.saveCourse}
            </button>
          </form>

          <div style={{ marginTop: "2rem" }}>
            <h4 style={labelStyle}>{labels.activeCustom}</h4>
            {customCourses.length === 0 && (
              <p style={{ opacity: 0.5, fontSize: "0.8rem" }}>
                {labels.noCustom}
              </p>
            )}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {customCourses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px",
                    backgroundColor: "rgba(28,7,0,0.03)",
                    borderRadius: "10px",
                    border: "1px dashed rgba(28,7,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      maxWidth: "70%",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        color: "#1c0700",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {currentLang === "de" ? c.nameDe : c.nameEn}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        opacity: 0.5,
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.link}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                    <button
                      onClick={() => handleEditCourse(c)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#caaff3",
                        cursor: "pointer",
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(c.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4d",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ flex: 1 }}>
        <h3 style={sectionTitleStyle}>
          <Calendar size={18} /> {labels.calIntegration}
        </h3>
        <p style={{ opacity: 0.7, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          {labels.calDesc}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {baseCourses.map((baseCourse) => {
            const baseId = baseCourse.link.replace(/\//g, "");
            const included = calendarGroups[baseId] || [baseCourse.link];

            return (
              <div
                key={baseId}
                style={{
                  ...cardStyle,
                  padding: isMobile ? "1.2rem" : "1.5rem",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <LinkIcon size={18} color="#9960a8" />
                  <h4
                    style={{ margin: 0, fontSize: "1.1rem", color: "#1c0700" }}
                  >
                    {baseCourse.text[currentLang || "en"]} {labels.calendar}
                  </h4>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {/* Combine the specific base course with ALL custom courses for this section */}
                  {[baseCourse, ...customLinks].map((target) => {
                    const isSelected = included.includes(target.link);
                    return (
                      <div
                        key={target.link}
                        onClick={() =>
                          toggleCalendarLink(baseCourse.link, target.link)
                        }
                        style={{
                          padding: "8px 12px",
                          borderRadius: "100px",
                          border: isSelected
                            ? "2px solid #caaff3"
                            : "1px solid rgba(28,7,0,0.1)",
                          backgroundColor: isSelected
                            ? "rgba(202, 175, 243, 0.15)"
                            : "transparent",
                          color: isSelected ? "#9960a8" : "rgba(28,7,0,0.5)",
                          fontWeight: "bold",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {target.text[currentLang || "en"]}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
