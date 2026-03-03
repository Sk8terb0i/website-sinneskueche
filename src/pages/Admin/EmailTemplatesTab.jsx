import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Save, Loader2, Info, MailOpen } from "lucide-react";
import {
  formCardStyle,
  sectionTitleStyle,
  inputStyle,
  btnStyle,
  labelStyle,
} from "./AdminStyles";

const EMAIL_TYPES = [
  {
    id: "pack_purchase_user",
    label: "Pack Success (User)",
    vars: ["{userName}", "{courseKey}", "{packSize}", "{netIncrease}"],
    defaults: {
      en: {
        subject: "Your Session Pack: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Purchase Successful!</h2>\n  <p>Hi {userName},</p>\n  <p>Thank you for purchasing a {packSize}-Session Pack for <strong>{courseKey}</strong>.</p>\n  <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+{netIncrease} Credits</p>\n  </div>\n  <p>Your credits have been added to your profile.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Dein Session-Pack: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Kauf erfolgreich!</h2>\n  <p>Hallo {userName},</p>\n  <p>Vielen Dank für den Kauf einer {packSize}er Karte für <strong>{courseKey}</strong>.</p>\n  <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+{netIncrease} Credits</p>\n  </div>\n  <p>Dein Guthaben wurde deinem Profil hinzugefügt.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
  },
  {
    id: "pack_purchase_guest",
    label: "Pack Success (Guest)",
    vars: [
      "{userName}",
      "{courseKey}",
      "{packSize}",
      "{newCode}",
      "{netIncrease}",
      "{registrationCTA}",
    ],
    defaults: {
      en: {
        subject: "Your Code for {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Thank you for your purchase!</h2>\n  <p>Hi {userName},</p>\n  <p>Here is your code for the {packSize}-Session Pack (<strong>{courseKey}</strong>):</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #caaff3;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9960a8; letter-spacing: 4px;">{newCode}</p>\n  </div>\n  <p>You have <strong>{netIncrease} credits</strong> remaining.</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Dein Code für {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Vielen Dank für deinen Einkauf!</h2>\n  <p>Hallo {userName},</p>\n  <p>Hier ist dein Code für die {packSize}er Karte (<strong>{courseKey}</strong>):</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #caaff3;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9960a8; letter-spacing: 4px;">{newCode}</p>\n  </div>\n  <p>Du hast noch <strong>{netIncrease} Guthaben</strong> übrig.</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
  },
  {
    id: "booking_confirmation_user",
    label: "Booking Confirmation (User)",
    vars: ["{userName}", "{courseKey}", "{datesHtml}", "{profileUrl}"],
    defaults: {
      en: {
        subject: "Confirmation: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Booking Confirmed!</h2>\n  <p style="font-weight: bold; color: #9960a8;">This email is your ticket.</p>\n  <p>Hi {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Location:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  <p>You can also view and manage all your bookings directly on your <a href="{profileUrl}" style="color: #9960a8; font-weight: bold;">profile on our website</a>.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Bestätigung: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Buchung bestätigt!</h2>\n  <p style="font-weight: bold; color: #9960a8;">Diese E-Mail ist dein Ticket.</p>\n  <p>Hallo {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Standort:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  <p>Du kannst alle deine Buchungen auch jederzeit in deinem <a href="{profileUrl}" style="color: #9960a8; font-weight: bold;">Profil auf unserer Website</a> einsehen.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
  },
  {
    id: "booking_confirmation_guest",
    label: "Booking Confirmation (Guest)",
    vars: ["{userName}", "{courseKey}", "{datesHtml}", "{registrationCTA}"],
    defaults: {
      en: {
        subject: "Confirmation: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Booking Confirmed!</h2>\n  <p style="font-weight: bold; color: #9960a8;">This email is your ticket.</p>\n  <p>Hi {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Standort:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Bestätigung: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Buchung bestätigt!</h2>\n  <p style="font-weight: bold; color: #9960a8;">Diese E-Mail ist dein Ticket.</p>\n  <p>Hallo {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Standort:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
  },
  {
    id: "cancellation_user",
    label: "Cancellation (User)",
    vars: ["{userName}", "{courseKey}", "{courseDate}"],
    defaults: {
      en: {
        subject: "Session Cancelled: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Session Cancelled</h2>\n  <p>Hi {userName},</p>\n  <p>The session for <strong>{courseKey}</strong> on <strong>{courseDate}</strong> has been cancelled.</p>\n  <p>We have automatically credited <strong>1 session</strong> back to your profile.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Termin abgesagt: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Termin wurde abgesagt</h2>\n  <p>Hallo {userName},</p>\n  <p>Der Termin für <strong>{courseKey}</strong> am <strong>{courseDate}</strong> wurde abgesagt.</p>\n  <p>Wir haben deinem Profil automatisch <strong>1 Termin</strong> gutgeschrieben.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
  },
  {
    id: "cancellation_guest",
    label: "Cancellation (Guest)",
    vars: ["{userName}", "{courseKey}", "{courseDate}", "{refundCode}"],
    defaults: {
      en: {
        subject: "Session Cancelled: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Session Cancelled</h2>\n  <p>Hi {userName},</p>\n  <p>The session for <strong>{courseKey}</strong> on <strong>{courseDate}</strong> has been cancelled.</p>\n  <p>As a guest, here is your unique code to redeem your refunded session on our website:</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">\n    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #9960a8; margin: 0;">{refundCode}</p>\n  </div>\n  <p>You can apply this code during your next checkout.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Termin abgesagt: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Termin wurde abgesagt</h2>\n  <p>Hallo {userName},</p>\n  <p>Der Termin für <strong>{courseKey}</strong> am <strong>{courseDate}</strong> wurde abgesagt.</p>\n  <p>Da du als Gast gebucht hast, ist hier dein einzigartiger Code, um deinen erstatteten Termin auf unserer Website einzulösen:</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">\n    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #9960a8; margin: 0;">{refundCode}</p>\n  </div>\n  <p>Du kannst diesen Code bei deiner nächsten Buchung an der Kasse anwenden.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
  },
  {
    id: "instructor_availability",
    label: "Instructor Avail Req",
    vars: ["{firstName}", "{courseKey}", "{profileUrl}"],
    defaults: {
      en: {
        subject: "Instructor Availability: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Availability Requested</h2>\n  <p>Hi {firstName},</p>\n  <p>The schedule for <strong>{courseKey}</strong> is being prepared. Please log in to your profile to mark your available dates.</p>\n  <div style="margin-top: 25px; text-align: center;">\n      <a href="{profileUrl}" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold;">Open My Profile</a>\n  </div>\n  <br/><p>Best,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
      de: {
        subject: "Instructor Availability: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Availability Requested</h2>\n  <p>Hi {firstName},</p>\n  <p>The schedule for <strong>{courseKey}</strong> is being prepared. Please log in to your profile to mark your available dates.</p>\n  <div style="margin-top: 25px; text-align: center;">\n      <a href="{profileUrl}" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold;">Open My Profile</a>\n  </div>\n  <br/><p>Best,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
    },
  },
  {
    id: "instructor_schedule",
    label: "Final Schedule",
    vars: ["{firstName}", "{courseKey}", "{scheduleList}"],
    defaults: {
      en: {
        subject: "Work Schedule: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Your Teaching Schedule</h2>\n  <p>Hi {firstName},</p>\n  <p>The schedule for <strong>{courseKey}</strong> is finalized. You are assigned to the following dates:</p>\n  <ul style="padding: 0; margin: 0;">{scheduleList}</ul>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
      de: {
        subject: "Work Schedule: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Your Teaching Schedule</h2>\n  <p>Hi {firstName},</p>\n  <p>The schedule for <strong>{courseKey}</strong> is finalized. You are assigned to the following dates:</p>\n  <ul style="padding: 0; margin: 0;">{scheduleList}</ul>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
    },
  },
];

export default function EmailTemplatesTab({ isMobile }) {
  const [selectedType, setSelectedType] = useState(EMAIL_TYPES[0]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "settings", "email_templates"));
      let dbData = {};
      if (docSnap.exists()) {
        dbData = docSnap.data();
      }

      // Initialize with DB data or fall back to defaults
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
      alert("Templates saved successfully!");
    } catch (err) {
      alert("Save failed: " + err.message);
    }
    setSaving(false);
  };

  const updateField = (lang, field, value) => {
    setTemplates((prev) => ({
      ...prev,
      [selectedType.id]: {
        ...prev[selectedType.id],
        [lang]: {
          ...prev[selectedType.id][lang],
          [field]: value,
        },
      },
    }));
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
        <h3 style={labelStyle}>Email Type</h3>
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
                textAlign: "left",
                fontSize: "0.85rem",
                padding: "12px 15px",
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ flex: 1 }}>
        <div style={formCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
              <MailOpen size={18} /> {selectedType.label}
            </h3>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...btnStyle, width: "auto", padding: "0 20px" }}
            >
              {saving ? (
                <Loader2 className="spinner" size={16} />
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
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
              <Info size={14} /> Available Variables:
            </div>
            <code style={{ color: "#9960a8" }}>
              {selectedType.vars.join(" , ")}
            </code>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "2rem",
            }}
          >
            <div>
              <h4 style={labelStyle}>German (DE)</h4>
              <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                Subject
              </label>
              <input
                style={{ ...inputStyle, marginBottom: "1rem" }}
                value={current.de.subject}
                onChange={(e) => updateField("de", "subject", e.target.value)}
              />
              <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                HTML Body
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: "400px",
                  paddingTop: "10px",
                  lineHeight: "1.5",
                  fontSize: "0.8rem",
                }}
                value={current.de.body}
                onChange={(e) => updateField("de", "body", e.target.value)}
              />
            </div>

            <div>
              <h4 style={labelStyle}>English (EN)</h4>
              <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                Subject
              </label>
              <input
                style={{ ...inputStyle, marginBottom: "1rem" }}
                value={current.en.subject}
                onChange={(e) => updateField("en", "subject", e.target.value)}
              />
              <label style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                HTML Body
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: "400px",
                  paddingTop: "10px",
                  lineHeight: "1.5",
                  fontSize: "0.8rem",
                }}
                value={current.en.body}
                onChange={(e) => updateField("en", "body", e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
