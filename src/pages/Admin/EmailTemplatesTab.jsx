import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Save,
  Loader2,
  Info,
  MailOpen,
  Code,
  Eye,
  Globe,
  ChevronDown,
} from "lucide-react";
import {
  formCardStyle,
  sectionTitleStyle,
  inputStyle,
  btnStyle,
  labelStyle,
} from "./AdminStyles";

export default function EmailTemplatesTab({ isMobile, currentLang }) {
  const uiLabels = {
    en: {
      type: "Email Type",
      code: "Code",
      preview: "Preview",
      save: "Save",
      saving: "Saving...",
      vars: "Available Variables:",
      deTab: "German (DE)",
      enTab: "English (EN)",
      subject: "Subject",
      body: "HTML Body",
      success: "Templates saved successfully!",
      fail: "Save failed: ",
      selectType: "Select email to edit...",
    },
    de: {
      type: "E-Mail Typ",
      code: "Code",
      preview: "Vorschau",
      save: "Speichern",
      saving: "Speichern...",
      vars: "Verfügbare Variablen:",
      deTab: "Deutsch (DE)",
      enTab: "Englisch (EN)",
      subject: "Betreff",
      body: "HTML Body",
      success: "Vorlagen erfolgreich gespeichert!",
      fail: "Fehler beim Speichern: ",
      selectType: "E-Mail zum Bearbeiten wählen...",
    },
  }[currentLang || "en"];

  const typeLabels = {
    pack_purchase_user: { en: "Pack Success (User)", de: "Paketkauf (Nutzer)" },
    pack_purchase_guest: { en: "Pack Success (Guest)", de: "Paketkauf (Gast)" },
    booking_confirmation_user: {
      en: "Booking Conf. (User)",
      de: "Buchung (Nutzer)",
    },
    booking_confirmation_guest: {
      en: "Booking Conf. (Guest)",
      de: "Buchung (Gast)",
    },
    cancellation_user: { en: "Cancellation (User)", de: "Absage (Nutzer)" },
    cancellation_guest: { en: "Cancellation (Guest)", de: "Absage (Gast)" },
    instructor_availability: {
      en: "Instructor Avail Req",
      de: "Verfügbarkeitsanfrage",
    },
    instructor_schedule: { en: "Final Schedule", de: "Stundenplan" },
  };

  const EMAIL_TYPES = [
    {
      id: "pack_purchase_user",
      vars: ["{userName}", "{courseKey}", "{packSize}", "{netIncrease}"],
      defaults: {
        en: { subject: "Your Session Pack: {courseKey}", body: "" },
        de: { subject: "Dein Session-Pack: {courseKey}", body: "" },
      },
    },
    {
      id: "pack_purchase_guest",
      vars: [
        "{userName}",
        "{courseKey}",
        "{packSize}",
        "{newCode}",
        "{netIncrease}",
        "{registrationCTA}",
      ],
      defaults: {
        en: { subject: "Your Code for {courseKey}", body: "" },
        de: { subject: "Dein Code für {courseKey}", body: "" },
      },
    },
    {
      id: "booking_confirmation_user",
      vars: ["{userName}", "{courseKey}", "{datesHtml}", "{profileUrl}"],
      defaults: {
        en: { subject: "Confirmation: {courseKey}", body: "" },
        de: { subject: "Bestätigung: {courseKey}", body: "" },
      },
    },
    {
      id: "booking_confirmation_guest",
      vars: ["{userName}", "{courseKey}", "{datesHtml}", "{registrationCTA}"],
      defaults: {
        en: { subject: "Confirmation: {courseKey}", body: "" },
        de: { subject: "Bestätigung: {courseKey}", body: "" },
      },
    },
    {
      id: "cancellation_user",
      vars: ["{userName}", "{courseKey}", "{courseDate}", "{refundAmount}"],
      defaults: {
        en: {
          subject: "Session Cancelled: {courseKey}",
          body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Session Cancelled</h2>\n  <p>Hi {userName},</p>\n  <p>The session for <strong>{courseKey}</strong> on <strong>{courseDate}</strong> has been cancelled.</p>\n  <p>We have automatically credited <strong>{refundAmount} session(s)</strong> back to your profile.</p>\n  <br/><p>Kind Regards,<br/>Atelier Sinnesküche</p>\n</div>`,
        },
        de: {
          subject: "Termin abgesagt: {courseKey}",
          body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Termin wurde abgesagt</h2>\n  <p>Hallo {userName},</p>\n  <p>Der Termin für <strong>{courseKey}</strong> am <strong>{courseDate}</strong> wurde abgesagt.</p>\n  <p>Wir haben deinem Profil automatisch <strong>{refundAmount} Termin(e)</strong> gutgeschrieben.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
        },
      },
    },
    {
      id: "cancellation_guest",
      vars: [
        "{userName}",
        "{courseKey}",
        "{courseDate}",
        "{refundCode}",
        "{refundAmount}",
      ],
      defaults: {
        en: {
          subject: "Session Cancelled: {courseKey}",
          body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Session Cancelled</h2>\n  <p>Hi {userName},</p>\n  <p>The session for <strong>{courseKey}</strong> on <strong>{courseDate}</strong> has been cancelled.</p>\n  <p>As a guest, here is your unique code to redeem your <strong>{refundAmount} refunded session(s)</strong> on our website:</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">\n    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #9960a8; margin: 0;">{refundCode}</p>\n  </div>\n  <p>You can apply this code during your next checkout.</p>\n  <br/><p>Kind Regards,<br/>Atelier Sinnesküche</p>\n</div>`,
        },
        de: {
          subject: "Termin abgesagt: {courseKey}",
          body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Termin wurde abgesagt</h2>\n  <p>Hallo {userName},</p>\n  <p>Der Termin für <strong>{courseKey}</strong> am <strong>{courseDate}</strong> wurde abgesagt.</p>\n  <p>Da du als Gast gebucht hast, ist hier dein einzigartiger Code, um deine <strong>{refundAmount} erstatteten Termine</strong> auf unserer Website einzulösen:</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">\n    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #9960a8; margin: 0;">{refundCode}</p>\n  </div>\n  <p>Du kannst diesen Code bei deiner nächsten Buchung an der Kasse anwenden.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
        },
      },
    },
    {
      id: "instructor_availability",
      vars: ["{firstName}", "{courseKey}", "{adminUrl}"],
      defaults: {
        en: { subject: "Instructor Availability: {courseKey}", body: "" },
        de: { subject: "Verfügbarkeit angefragt: {courseKey}", body: "" },
      },
    },
    {
      id: "instructor_schedule",
      vars: ["{firstName}", "{courseKey}", "{scheduleList}", "{profileUrl}"],
      defaults: {
        en: { subject: "Work Schedule: {courseKey}", body: "" },
        de: { subject: "Dein Stundenplan: {courseKey}", body: "" },
      },
    },
  ];

  const [selectedType, setSelectedType] = useState(EMAIL_TYPES[0]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("code");
  const [mobileLang, setMobileLang] = useState("de");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "settings", "email_templates"));
      let dbData = docSnap.exists() ? docSnap.data() : {};
      const merged = {};
      EMAIL_TYPES.forEach((type) => {
        merged[type.id] = {
          en: {
            subject: dbData[type.id]?.en?.subject || type.defaults.en.subject,
            body: dbData[type.id]?.en?.body || type.defaults.en.body,
          },
          de: {
            subject: dbData[type.id]?.de?.subject || type.defaults.de.subject,
            body: dbData[type.id]?.de?.body || type.defaults.de.body,
          },
        };
      });
      setTemplates(merged);
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "email_templates"), templates, {
        merge: true,
      });
      alert(uiLabels.success);
    } catch (err) {
      alert(uiLabels.fail + err.message);
    }
    setSaving(false);
  };

  const updateField = (lang, field, value) => {
    setTemplates((prev) => ({
      ...prev,
      [selectedType.id]: {
        ...prev[selectedType.id],
        [lang]: { ...prev[selectedType.id][lang], [field]: value },
      },
    }));
  };

  const generatePreview = (htmlStr, lang) => {
    const sampleData = {
      "{userName}": "Jane Doe",
      "{firstName}": "Jane",
      "{courseKey}": "pottery tuesdays",
      "{packSize}": "5",
      "{newCode}": "A1B2C3D4",
      "{netIncrease}": "5",
      "{courseDate}": "15.05.2025",
      "{refundCode}": "X9Y8Z7W6",
      "{refundAmount}": "2",
      "{profileUrl}": "#",
      "{adminUrl}": "#",
      "{registrationCTA}":
        lang === "de"
          ? `<div style="margin-top: 30px; padding: 20px; border: 1px dashed #caaff3; background-color: rgba(202, 175, 243, 0.05); border-radius: 12px; text-align: center;"><p style="font-size: 14px; margin-bottom: 15px; color: #1c0700;">Möchtest du deine Buchungen verwalten?</p><a href="#" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold; font-size: 14px;">Profil erstellen</a></div>`
          : `<div style="margin-top: 30px; padding: 20px; border: 1px dashed #caaff3; background-color: rgba(202, 175, 243, 0.05); border-radius: 12px; text-align: center;"><p style="font-size: 14px; margin-bottom: 15px; color: #1c0700;">Want to manage your bookings?</p><a href="#" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold; font-size: 14px;">Create Profile</a></div>`,
      "{datesHtml}": `<li style="margin-bottom: 18px; list-style: none; font-size: 15px;"><div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;"><span style="font-weight: bold;">15.05.2025 | 18:00</span><a href="#" style="font-size: 11px; color: #9960a8; text-decoration: none; border: 1px solid #caaff3; padding: 2px 6px; border-radius: 4px; background-color: #fff;">📅 Add to Calendar</a></div></li>`,
      "{scheduleList}": `<li style="margin-bottom: 15px; list-style: none; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #caaff3;"><strong style="color: #1c0700;">15.05.2025</strong> | 18:00<br/><span style="font-size: 13px; opacity: 0.7;">Working with: John Smith</span></li>`,
    };
    let previewHtml = htmlStr || "";
    Object.keys(sampleData).forEach((key) => {
      previewHtml = previewHtml.split(key).join(sampleData[key]);
    });
    return previewHtml;
  };

  if (loading) return <Loader2 className="spinner" size={30} color="#caaff3" />;
  const current = templates[selectedType.id];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: "2rem",
      }}
    >
      <section style={{ width: isMobile ? "100%" : "300px" }}>
        {!isMobile && <h3 style={labelStyle}>{uiLabels.type}</h3>}

        {isMobile ? (
          <div style={{ position: "relative", marginBottom: "1.5rem" }}>
            <select
              style={{
                ...inputStyle,
                paddingRight: "40px",
                backgroundColor: "rgba(202, 175, 243, 0.1)",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
              value={selectedType.id}
              onChange={(e) =>
                setSelectedType(
                  EMAIL_TYPES.find((t) => t.id === e.target.value),
                )
              }
            >
              {EMAIL_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {typeLabels[type.id][currentLang || "en"]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.5,
                pointerEvents: "none",
              }}
            />
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {EMAIL_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type)}
                style={{
                  ...btnStyle,
                  backgroundColor:
                    selectedType.id === type.id
                      ? "#caaff3"
                      : "rgba(202, 175, 243, 0.1)",
                  textAlign: "center",
                  fontSize: "0.85rem",
                  padding: "12px 15px",
                }}
              >
                {typeLabels[type.id][currentLang || "en"]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={{ flex: 1 }}>
        <div style={formCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <h3 style={{ ...sectionTitleStyle, margin: 0, flex: "1 1 auto" }}>
              <MailOpen
                size={18}
                style={{ marginRight: "8px", verticalAlign: "text-bottom" }}
              />
              {typeLabels[selectedType.id][currentLang || "en"]}
            </h3>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: isMobile ? "space-between" : "flex-end",
                width: isMobile ? "100%" : "auto",
              }}
            >
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
                  }}
                >
                  <Code size={14} /> {uiLabels.code}
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
                  }}
                >
                  <Eye size={14} /> {uiLabels.preview}
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...btnStyle,
                  width: "auto",
                  padding: "8px 20px",
                  margin: 0,
                }}
              >
                {saving ? (
                  <Loader2 className="spinner" size={16} />
                ) : (
                  <>
                    <Save size={16} /> {uiLabels.save}
                  </>
                )}
              </button>
            </div>
          </div>

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
              <Info size={14} /> {uiLabels.vars}
            </div>
            <code style={{ color: "#9960a8", lineBreak: "anywhere" }}>
              {selectedType.vars.join(" , ")}
            </code>
          </div>

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
                }}
              >
                {uiLabels.deTab}
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
                }}
              >
                {uiLabels.enTab}
              </button>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "2rem",
            }}
          >
            {(!isMobile || mobileLang === "de") && (
              <div>
                {!isMobile && (
                  <h4 style={labelStyle}>
                    <Globe
                      size={14}
                      style={{ display: "inline", verticalAlign: "middle" }}
                    />{" "}
                    {uiLabels.deTab}
                  </h4>
                )}
                <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                  {uiLabels.subject}
                </label>
                <input
                  style={{ ...inputStyle, marginBottom: "1rem" }}
                  value={current.de.subject}
                  onChange={(e) => updateField("de", "subject", e.target.value)}
                />
                <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                  {uiLabels.body}
                </label>
                {viewMode === "code" ? (
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: "400px",
                      paddingTop: "10px",
                      lineHeight: "1.5",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                    }}
                    value={current.de.body}
                    onChange={(e) => updateField("de", "body", e.target.value)}
                  />
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
                    dangerouslySetInnerHTML={{
                      __html: generatePreview(current.de.body, "de"),
                    }}
                  />
                )}
              </div>
            )}

            {(!isMobile || mobileLang === "en") && (
              <div>
                {!isMobile && (
                  <h4 style={labelStyle}>
                    <Globe
                      size={14}
                      style={{ display: "inline", verticalAlign: "middle" }}
                    />{" "}
                    {uiLabels.enTab}
                  </h4>
                )}
                <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                  {uiLabels.subject}
                </label>
                <input
                  style={{ ...inputStyle, marginBottom: "1rem" }}
                  value={current.en.subject}
                  onChange={(e) => updateField("en", "subject", e.target.value)}
                />
                <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                  {uiLabels.body}
                </label>
                {viewMode === "code" ? (
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: "400px",
                      paddingTop: "10px",
                      lineHeight: "1.5",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                    }}
                    value={current.en.body}
                    onChange={(e) => updateField("en", "body", e.target.value)}
                  />
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
                    dangerouslySetInnerHTML={{
                      __html: generatePreview(current.en.body, "en"),
                    }}
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
