import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import { Save, Loader2, Info, Mail, Star, RefreshCcw } from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  labelStyle,
  inputStyle,
  btnStyle,
} from "./AdminStyles";

export default function RemindersTab({
  isMobile,
  userRole,
  allowedCourses = [],
}) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [activeLangTab, setActiveLangTab] = useState("en");
  const [reminderData, setReminderData] = useState({
    daysBefore: 3,
    en: { subject: "", text: "", firstTimerText: "" },
    de: { subject: "", text: "", firstTimerText: "" },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const isFullAdmin = userRole === "admin";

  // Templates ONLY for Subject and Main Body
  const templates = {
    en: {
      subject: "Reminder: Your workshop {courseName} is coming up!",
      text: "Hi {userName},\n\nWe are looking forward to seeing you soon for {courseName} on {courseDate}!\n\nPlease remember to arrive 5-10 minutes before the start time so we can begin together.\n\nBest,\nYour Atelier Team",
      firstTimerText: "", // Keep empty by default
    },
    de: {
      subject: "Erinnerung: Dein Workshop {courseName} findet bald statt!",
      text: "Hallo {userName},\n\nwir freuen uns schon sehr auf dich und den Workshop {courseName} am {courseDate}!\n\nBitte versuche 5-10 Minuten vor Beginn da zu sein, damit wir gemeinsam starten können.\n\nHerzliche Grüße,\nDein Atelier Team",
      firstTimerText: "", // Keep empty by default
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
    const fetchReminderData = async () => {
      setIsLoading(true);
      setSaveMessage("");
      try {
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
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReminderData();
  }, [selectedCourse]);

  const handleResetToDefault = () => {
    if (
      window.confirm(`Reset ${activeLangTab.toUpperCase()} to generic draft?`)
    ) {
      setReminderData((prev) => ({
        ...prev,
        [activeLangTab]: { ...templates[activeLangTab] },
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
      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setIsSaving(false);
    }
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

  return (
    <section
      style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <Mail size={18} /> Course Reminders
      </h3>

      {/* GLOBAL SETTINGS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={labelStyle}>Selected Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={wideInputStyle}
          >
            {availableCourses.map((c) => (
              <option key={c.link} value={c.link.replace(/\//g, "")}>
                {c.text.en}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={labelStyle}>Days Before</label>
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

      {/* EDITOR CARD */}
      <div
        style={{
          ...cardStyle,
          backgroundColor: "#fdf8e1",
          padding: isMobile ? "1.5rem" : "2.5rem",
          borderRadius: "24px",
          border: "1px solid rgba(28, 7, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(28, 7, 0, 0.05)",
            paddingBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(28, 7, 0, 0.04)",
              padding: "4px",
              borderRadius: "100px",
            }}
          >
            {["en", "de"].map((l) => (
              <button
                key={l}
                onClick={() => setActiveLangTab(l)}
                style={{
                  border: "none",
                  padding: "8px 24px",
                  borderRadius: "100px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  backgroundColor:
                    activeLangTab === l ? "#caaff3" : "transparent",
                  color: "#1c0700",
                  transition: "all 0.2s",
                }}
              >
                {l === "en" ? "English" : "Deutsch"}
              </button>
            ))}
          </div>
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
              gap: "6px",
              opacity: 0.6,
            }}
          >
            <RefreshCcw size={12} /> Reset to Generic Draft
          </button>
        </div>

        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "4rem",
            }}
          >
            <Loader2 className="spinner" size={30} color="#caaff3" />
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div>
              <label style={labelStyle}>Subject Line</label>
              <input
                type="text"
                value={reminderData[activeLangTab].subject}
                onChange={(e) =>
                  setReminderData((p) => ({
                    ...p,
                    [activeLangTab]: {
                      ...p[activeLangTab],
                      subject: e.target.value,
                    },
                  }))
                }
                style={wideInputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Main Message</label>
              <textarea
                value={reminderData[activeLangTab].text}
                onChange={(e) =>
                  setReminderData((p) => ({
                    ...p,
                    [activeLangTab]: {
                      ...p[activeLangTab],
                      text: e.target.value,
                    },
                  }))
                }
                style={{
                  ...wideInputStyle,
                  minHeight: "220px",
                  resize: "vertical",
                }}
              />
            </div>

            {/* FIRST TIMER AREA */}
            <div
              style={{
                backgroundColor: "rgba(202, 175, 243, 0.06)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px dashed #caaff3",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "1rem",
                }}
              >
                <Star size={14} color="#caaff3" fill="#caaff3" />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    color: "#1c0700",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  First-Timer Additional Text
                </span>
              </div>
              <textarea
                value={reminderData[activeLangTab].firstTimerText}
                onChange={(e) =>
                  setReminderData((p) => ({
                    ...p,
                    [activeLangTab]: {
                      ...p[activeLangTab],
                      firstTimerText: e.target.value,
                    },
                  }))
                }
                style={{
                  ...wideInputStyle,
                  minHeight: "100px",
                  backgroundColor: "rgba(255,255,255,0.4)",
                }}
                placeholder="Optional: This text will be appended only for users booking this course for the first time."
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "rgba(78, 95, 40, 0.04)",
                padding: "12px 20px",
                borderRadius: "100px",
                marginBottom: "2rem",
                border: "1px solid rgba(78, 95, 40, 0.1)",
              }}
            >
              <Info size={16} color="#4e5f28" />
              <span
                style={{ fontSize: "0.8rem", color: "#4e5f28", opacity: 0.8 }}
              >
                Variables: <strong>{"{userName}"}</strong>,{" "}
                <strong>{"{courseName}"}</strong>,{" "}
                <strong>{"{courseDate}"}</strong>,{" "}
                <strong>{"{courseTime}"}</strong>
              </span>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginTop: "1rem",
            borderTop: "1px solid rgba(28, 7, 0, 0.05)",
            paddingTop: "1.5rem",
          }}
        >
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            style={{ ...btnStyle, width: isMobile ? "100%" : "200px" }}
          >
            {isSaving ? (
              <Loader2 className="spinner" size={18} />
            ) : (
              <Save size={18} />
            )}
            {isSaving ? "Saving..." : "Save Reminder"}
          </button>
          {saveMessage && (
            <span
              style={{
                color: "#4e5f28",
                fontWeight: "700",
                fontSize: "0.85rem",
              }}
            >
              {saveMessage}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
