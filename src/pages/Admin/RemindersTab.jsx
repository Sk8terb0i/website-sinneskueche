import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import {
  Save,
  Loader2,
  Info,
  Mail,
  Code,
  Eye,
  Globe,
  RefreshCcw,
  Clock,
  PlusCircle,
} from "lucide-react";
import {
  sectionTitleStyle,
  formCardStyle,
  labelStyle,
  inputStyle,
  btnStyle,
} from "./AdminStyles";

export default function RemindersTab({
  isMobile,
  userRole,
  allowedCourses = [],
  currentLang,
}) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courseAddons, setCourseAddons] = useState([]);
  const [reminderData, setReminderData] = useState({
    daysBefore: 3,
    en: { subject: "", text: "", firstTimerText: "", addonTexts: {} },
    de: { subject: "", text: "", firstTimerText: "", addonTexts: {} },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [viewMode, setViewMode] = useState("code");
  const [mobileLang, setMobileLang] = useState("de");

  const isFullAdmin = userRole === "admin";

  const labels = {
    en: {
      title: "Course Reminders",
      select: "Selected Course",
      days: "Days Before",
      enTab: "English (EN)",
      deTab: "German (DE)",
      reset: "Reset to Default",
      subject: "Subject Line",
      main: "Main Message",
      first: "First-Timer Text",
      firstPlace: "Optional: Appended for first-time bookings.",
      addonInfo: "Add-on Specific Information",
      vars: "Available Variables:",
      saving: "Saving...",
      save: "Save",
      success: "Saved successfully!",
      resetConfirm: "Reset to generic draft?",
      code: "Code",
      preview: "Preview",
    },
    de: {
      title: "Kurserinnerungen",
      select: "Ausgewählter Kurs",
      days: "Tage vorher",
      enTab: "Englisch (EN)",
      deTab: "Deutsch (DE)",
      reset: "Zurücksetzen",
      subject: "Betreff",
      main: "Hauptnachricht",
      first: "Zusatztext für Neukunden",
      firstPlace: "Optional: Wird bei Erstbuchungen angehängt.",
      addonInfo: "Infos zu Extras",
      vars: "Verfügbare Variablen:",
      saving: "Speichern...",
      save: "Speichern",
      success: "Erfolgreich gespeichert!",
      resetConfirm: "Auf Standard zurücksetzen?",
      code: "Code",
      preview: "Vorschau",
    },
  }[currentLang || "en"];

  const templates = {
    en: {
      subject: "Reminder: Your workshop {courseName} is coming up!",
      text: "Hi {userName},\n\nWe are looking forward to seeing you soon for {courseName} on {courseDate}!\n\nPlease remember to arrive 5-10 minutes before the start time so we can begin together.\n\nBest,\nYour Atelier Team",
      firstTimerText: "",
      addonTexts: {},
    },
    de: {
      subject: "Erinnerung: Dein Workshop {courseName} findet bald statt!",
      text: "Hallo {userName},\n\nwir freuen uns schon sehr auf dich und den Workshop {courseName} am {courseDate}!\n\nBitte versuche 5-10 Minuten vor Beginn da zu sein, damit wir gemeinsam starten können.\n\nHerzliche Grüße,\nDein Atelier Team",
      firstTimerText: "",
      addonTexts: {},
    },
  };

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
    if (availableCourses.length > 0 && !selectedCourse) {
      setSelectedCourse(availableCourses[0].link.replace(/\//g, ""));
    }
  }, [availableCourses, selectedCourse]);

  useEffect(() => {
    if (!selectedCourse) return;
    const fetchData = async () => {
      setIsLoading(true);
      setSaveMessage("");
      try {
        const settingsRef = doc(db, "course_settings", selectedCourse);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists())
          setCourseAddons(settingsSnap.data().specialEvents || []);
        else setCourseAddons([]);

        const docRef = doc(db, "course_reminders", selectedCourse);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setReminderData({
            daysBefore: data.daysBefore || 3,
            en: { ...templates.en, ...data.en },
            de: { ...templates.de, ...data.de },
          });
        } else {
          setReminderData({
            daysBefore: 3,
            en: { ...templates.en },
            de: { ...templates.de },
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCourse]);

  const handleResetToDefault = () => {
    if (window.confirm(labels.resetConfirm)) {
      setReminderData((prev) => ({
        ...prev,
        en: { ...templates.en },
        de: { ...templates.de },
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "course_reminders", selectedCourse),
        {
          ...reminderData,
          courseId: selectedCourse,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setSaveMessage(labels.success);
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (lang, field, value) => {
    setReminderData((p) => ({
      ...p,
      [lang]: {
        ...p[lang],
        [field]: value,
      },
    }));
  };

  const handleAddonTextChange = (lang, addonId, val) => {
    setReminderData((p) => ({
      ...p,
      [lang]: {
        ...p[lang],
        addonTexts: {
          ...(p[lang].addonTexts || {}),
          [addonId]: val,
        },
      },
    }));
  };

  // Check if course has a mandatory intro add-on
  const hasMandatoryIntro = courseAddons.some((addon) => addon.isMandatory);

  const generatePreview = (lang) => {
    const data = reminderData[lang];
    const courseNameText =
      availableCourses.find((c) => c.link.replace(/\//g, "") === selectedCourse)
        ?.text[lang] || "Workshop";

    // Helper to replace variables specifically for a given time context
    const replaceLocalVars = (str, sectionTime) => {
      if (!str) return "";
      const vars = {
        "{userName}": "Jane Doe",
        "{courseName}": courseNameText,
        "{courseDate}": "15.05.2026",
        "{courseTime}": sectionTime || "18:00",
      };
      let result = str;
      Object.keys(vars).forEach((key) => {
        result = result.split(key).join(vars[key]);
      });
      return result;
    };

    let html = `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">`;

    // 1. Main Message (Uses Course Time)
    html += `<p style="white-space: pre-wrap; margin-bottom: 20px;">${replaceLocalVars(data.text, "18:00")}</p>`;

    // 2. First Timer Text (Uses Course Time)
    if (!hasMandatoryIntro && data.firstTimerText) {
      html += `<div style="margin-top: 20px; padding: 15px; background-color: rgba(202, 175, 243, 0.2); border-radius: 8px; border: 1px solid #caaff3;">`;
      html += `<p style="margin: 0; font-size: 0.9em; white-space: pre-wrap;"><strong>${labels.first}:</strong><br/>${replaceLocalVars(data.firstTimerText, "18:00")}</p></div>`;
    }

    // 3. Add-on Blocks (Uses Add-on specific time)
    courseAddons.forEach((addon) => {
      if (data.addonTexts?.[addon.id]) {
        const addonName = lang === "de" ? addon.nameDe : addon.nameEn;

        // Find relevant time for this specific add-on
        const relevantTime = addon.timeSlots?.[0]
          ? `${addon.timeSlots[0].startTime}-${addon.timeSlots[0].endTime}`
          : addon.time || "18:30";

        html += `<div style="margin-top: 15px; padding: 15px; background-color: rgba(78, 95, 40, 0.1); border-radius: 8px; border: 1px solid #4e5f28;">`;
        html += `<p style="margin: 0; font-size: 0.9em; white-space: pre-wrap;"><strong>Extra - ${addonName}:</strong><br/>${replaceLocalVars(data.addonTexts[addon.id], relevantTime)}</p></div>`;
      }
    });

    html += `</div>`;
    return html;
  };

  const wideInputStyle = {
    ...inputStyle,
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "rgba(255, 252, 227, 0.6)",
    border: "1px solid rgba(28, 7, 0, 0.08)",
    borderRadius: "12px",
    fontFamily: "Satoshi",
    color: "#1c0700",
  };

  if (isLoading)
    return <Loader2 className="spinner" size={30} color="#caaff3" />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: "2rem",
      }}
    >
      {/* SIDEBAR (Course & Timing Selection) */}
      <section style={{ width: isMobile ? "100%" : "300px" }}>
        {!isMobile && <h3 style={labelStyle}>{labels.title}</h3>}

        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div>
            <label style={{ ...labelStyle, opacity: 0.6 }}>
              {labels.select}
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={wideInputStyle}
            >
              {availableCourses.map((c) => (
                <option key={c.link} value={c.link.replace(/\//g, "")}>
                  {c.text[currentLang || "en"]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                ...labelStyle,
                opacity: 0.6,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Clock size={14} /> {labels.days}
            </label>
            <input
              type="number"
              value={reminderData.daysBefore}
              onChange={(e) =>
                setReminderData((p) => ({
                  ...p,
                  daysBefore: parseInt(e.target.value) || 1,
                }))
              }
              style={wideInputStyle}
            />
          </div>
        </div>
      </section>

      {/* MAIN CONTENT (Editor) */}
      <section style={{ flex: 1 }}>
        <div style={formCardStyle}>
          {/* HEADER ROW */}
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              marginBottom: "1.5rem",
              gap: "1rem",
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
              <Mail size={18} />
              {labels.title}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                width: isMobile ? "100%" : "auto",
                justifyContent: isMobile ? "space-between" : "flex-end",
                flexWrap: "wrap",
              }}
            >
              {/* Code / Preview Toggle */}
              <div
                style={{
                  display: "flex",
                  background: "rgba(28, 7, 0, 0.05)",
                  borderRadius: "100px",
                  padding: "4px",
                }}
              >
                <button
                  onClick={() => setViewMode("code")}
                  style={{
                    border: "none",
                    background: viewMode === "code" ? "#fffce3" : "transparent",
                    padding: "6px 12px",
                    borderRadius: "100px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow:
                      viewMode === "code"
                        ? "0 2px 5px rgba(0,0,0,0.05)"
                        : "none",
                    color: "#1c0700",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Code size={14} /> {labels.code}
                </button>
                <button
                  onClick={() => setViewMode("preview")}
                  style={{
                    border: "none",
                    background:
                      viewMode === "preview" ? "#fffce3" : "transparent",
                    padding: "6px 12px",
                    borderRadius: "100px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow:
                      viewMode === "preview"
                        ? "0 2px 5px rgba(0,0,0,0.05)"
                        : "none",
                    color: "#1c0700",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Eye size={14} /> {labels.preview}
                </button>
              </div>

              {/* Action Buttons */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                {!isMobile && (
                  <button
                    onClick={handleResetToDefault}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4e5f28",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      opacity: 0.6,
                    }}
                  >
                    <RefreshCcw size={12} /> {labels.reset}
                  </button>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    ...btnStyle,
                    width: "auto",
                    padding: "8px 20px",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  {isSaving ? (
                    <Loader2 className="spinner" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {labels.save}
                </button>
              </div>
            </div>
          </div>

          {saveMessage && (
            <p
              style={{
                color: "#4e5f28",
                fontWeight: "700",
                fontSize: "0.85rem",
                textAlign: "right",
                marginTop: "-10px",
              }}
            >
              {saveMessage}
            </p>
          )}

          {/* VARIABLES INFO */}
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "12px",
              background: "rgba(78, 95, 40, 0.05)",
              borderRadius: "8px",
              fontSize: "0.8rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "bold",
                color: "#4e5f28",
                marginBottom: "5px",
              }}
            >
              <Info size={14} /> {labels.vars}
            </div>
            <code style={{ color: "#9960a8", lineBreak: "anywhere" }}>
              {"{userName}"} , {"{courseName}"} , {"{courseDate}"} ,{" "}
              {"{courseTime}"}
            </code>
          </div>

          {/* MOBILE LANG TOGGLE */}
          {isMobile && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
              <button
                onClick={() => setMobileLang("de")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "bold",
                  backgroundColor:
                    mobileLang === "de" ? "#9960a8" : "rgba(153, 96, 168, 0.1)",
                  color: mobileLang === "de" ? "white" : "#9960a8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {labels.deTab}
              </button>
              <button
                onClick={() => setMobileLang("en")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "bold",
                  backgroundColor:
                    mobileLang === "en" ? "#9960a8" : "rgba(153, 96, 168, 0.1)",
                  color: mobileLang === "en" ? "white" : "#9960a8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {labels.enTab}
              </button>
            </div>
          )}

          {/* EDITOR GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "2rem",
            }}
          >
            {/* GERMAN COLUMN */}
            {(!isMobile || mobileLang === "de") && (
              <div>
                {!isMobile && (
                  <h4
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Globe size={14} /> {labels.deTab}
                  </h4>
                )}
                <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                  {labels.subject}
                </label>
                <input
                  style={{
                    ...inputStyle,
                    marginBottom: "1rem",
                    backgroundColor: "rgba(255, 252, 227, 0.6)",
                  }}
                  value={reminderData.de.subject}
                  onChange={(e) => updateField("de", "subject", e.target.value)}
                />

                {viewMode === "code" ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                        {labels.main}
                      </label>
                      <textarea
                        style={{
                          ...inputStyle,
                          minHeight: "180px",
                          resize: "vertical",
                          backgroundColor: "rgba(255, 252, 227, 0.6)",
                          lineHeight: "1.5",
                        }}
                        value={reminderData.de.text}
                        onChange={(e) =>
                          updateField("de", "text", e.target.value)
                        }
                      />
                    </div>

                    {!hasMandatoryIntro && (
                      <div>
                        <label
                          style={{
                            fontSize: "0.7rem",
                            opacity: 0.6,
                            color: "#9960a8",
                            fontWeight: "bold",
                          }}
                        >
                          {labels.first}
                        </label>
                        <textarea
                          style={{
                            ...inputStyle,
                            minHeight: "80px",
                            resize: "vertical",
                            backgroundColor: "rgba(202, 175, 243, 0.05)",
                            border: "1px dashed #caaff3",
                          }}
                          placeholder={labels.firstPlace}
                          value={reminderData.de.firstTimerText}
                          onChange={(e) =>
                            updateField("de", "firstTimerText", e.target.value)
                          }
                        />
                      </div>
                    )}

                    {courseAddons.length > 0 && (
                      <div
                        style={{
                          padding: "10px",
                          backgroundColor: "rgba(78, 95, 40, 0.05)",
                          borderRadius: "8px",
                          border: "1px dashed #4e5f28",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "0.7rem",
                            opacity: 0.8,
                            color: "#4e5f28",
                            fontWeight: "bold",
                            marginBottom: "10px",
                            display: "block",
                          }}
                        >
                          {labels.addonInfo}
                        </label>
                        {courseAddons.map((addon) => (
                          <div key={addon.id} style={{ marginBottom: "10px" }}>
                            <label
                              style={{
                                fontSize: "0.65rem",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Extra: {addon.nameDe}
                            </label>
                            <textarea
                              style={{
                                ...inputStyle,
                                minHeight: "60px",
                                resize: "vertical",
                                backgroundColor: "rgba(255,255,255,0.6)",
                              }}
                              value={
                                reminderData.de.addonTexts?.[addon.id] || ""
                              }
                              onChange={(e) =>
                                handleAddonTextChange(
                                  "de",
                                  addon.id,
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      ...inputStyle,
                      minHeight: "400px",
                      padding: "0",
                      background: "#f9f9f9",
                      border: "1px solid #ddd",
                      overflowY: "auto",
                    }}
                    dangerouslySetInnerHTML={{ __html: generatePreview("de") }}
                  />
                )}
              </div>
            )}

            {/* ENGLISH COLUMN */}
            {(!isMobile || mobileLang === "en") && (
              <div>
                {!isMobile && (
                  <h4
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Globe size={14} /> {labels.enTab}
                  </h4>
                )}
                <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                  {labels.subject}
                </label>
                <input
                  style={{
                    ...inputStyle,
                    marginBottom: "1rem",
                    backgroundColor: "rgba(255, 252, 227, 0.6)",
                  }}
                  value={reminderData.en.subject}
                  onChange={(e) => updateField("en", "subject", e.target.value)}
                />

                {viewMode === "code" ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                        {labels.main}
                      </label>
                      <textarea
                        style={{
                          ...inputStyle,
                          minHeight: "180px",
                          resize: "vertical",
                          backgroundColor: "rgba(255, 252, 227, 0.6)",
                          lineHeight: "1.5",
                        }}
                        value={reminderData.en.text}
                        onChange={(e) =>
                          updateField("en", "text", e.target.value)
                        }
                      />
                    </div>

                    {!hasMandatoryIntro && (
                      <div>
                        <label
                          style={{
                            fontSize: "0.7rem",
                            opacity: 0.6,
                            color: "#9960a8",
                            fontWeight: "bold",
                          }}
                        >
                          {labels.first}
                        </label>
                        <textarea
                          style={{
                            ...inputStyle,
                            minHeight: "80px",
                            resize: "vertical",
                            backgroundColor: "rgba(202, 175, 243, 0.05)",
                            border: "1px dashed #caaff3",
                          }}
                          placeholder={labels.firstPlace}
                          value={reminderData.en.firstTimerText}
                          onChange={(e) =>
                            updateField("en", "firstTimerText", e.target.value)
                          }
                        />
                      </div>
                    )}

                    {courseAddons.length > 0 && (
                      <div
                        style={{
                          padding: "10px",
                          backgroundColor: "rgba(78, 95, 40, 0.05)",
                          borderRadius: "8px",
                          border: "1px dashed #4e5f28",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "0.7rem",
                            opacity: 0.8,
                            color: "#4e5f28",
                            fontWeight: "bold",
                            marginBottom: "10px",
                            display: "block",
                          }}
                        >
                          {labels.addonInfo}
                        </label>
                        {courseAddons.map((addon) => (
                          <div key={addon.id} style={{ marginBottom: "10px" }}>
                            <label
                              style={{
                                fontSize: "0.65rem",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Extra: {addon.nameEn}
                            </label>
                            <textarea
                              style={{
                                ...inputStyle,
                                minHeight: "60px",
                                resize: "vertical",
                                backgroundColor: "rgba(255,255,255,0.6)",
                              }}
                              value={
                                reminderData.en.addonTexts?.[addon.id] || ""
                              }
                              onChange={(e) =>
                                handleAddonTextChange(
                                  "en",
                                  addon.id,
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      ...inputStyle,
                      minHeight: "400px",
                      padding: "0",
                      background: "#f9f9f9",
                      border: "1px solid #ddd",
                      overflowY: "auto",
                    }}
                    dangerouslySetInnerHTML={{ __html: generatePreview("en") }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
