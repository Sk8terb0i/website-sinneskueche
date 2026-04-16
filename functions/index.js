const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions"); // Added for better logging
const admin = require("firebase-admin");

const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY || "placeholder_key_for_analysis",
);

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- CONFIGURATION & MAPPINGS ---

const courseMapping = {
  "/pottery": "pottery tuesdays",
  "/artistic-vision": "artistic vision",
  "/get-ink": "get ink!",
  "/singing": "vocal coaching",
  "/extended-voice-lab": "extended voice lab",
  "/performing-words": "performing words",
  "/singing-basics": "singing basics weekend",
};

const getCleanCourseKey = (path) =>
  courseMapping[path] || path.replace(/\//g, "");

const generatePackCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
};

const getGoogleCalLink = (title, dateStr) => {
  if (!dateStr) return "#";
  const start = dateStr.replace(/-/g, "");
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  const end = d.toISOString().split("T")[0].replace(/-/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Atelier Sinnesküche: " + title)}&dates=${start}/${end}`;
};

// --- DYNAMIC EMAIL TEMPLATE FETCHER ---
const getTemplate = async (transaction, typeId, lang) => {
  const ref = db.collection("settings").doc("email_templates");
  const snap = await (transaction ? transaction.get(ref) : ref.get());

  const defaults = {
    pack_purchase_user: {
      en: {
        subject: "Your Session Pack: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Purchase Successful!</h2>\n  <p>Hi {userName},</p>\n  <p>Thank you for purchasing a {packSize}-Session Pack for <strong>{courseKey}</strong>.</p>\n  <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+{netIncrease} Credits</p>\n  </div>\n  <p>Your credits have been added to your profile.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Dein Session-Pack: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Kauf erfolgreich!</h2>\n  <p>Hallo {userName},</p>\n  <p>Vielen Dank für den Kauf einer {packSize}er Karte für <strong>{courseKey}</strong>.</p>\n  <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+{netIncrease} Credits</p>\n  </div>\n  <p>Dein Guthaben wurde deinem Profil hinzugefügt.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
    pack_purchase_guest: {
      en: {
        subject: "Your Code for {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Thank you for your purchase!</h2>\n  <p>Hi {userName},</p>\n  <p>Here is your code for the {packSize}-Session Pack (<strong>{courseKey}</strong>):</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #caaff3;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9960a8; letter-spacing: 4px;">{newCode}</p>\n  </div>\n  <p>You have <strong>{netIncrease} credits</strong> remaining.</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Dein Code für {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Vielen Dank für deinen Einkauf!</h2>\n  <p>Hallo {userName},</p>\n  <p>Hier ist dein Code für die {packSize}er Karte (<strong>{courseKey}</strong>):</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #caaff3;">\n    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9960a8; letter-spacing: 4px;">{newCode}</p>\n  </div>\n  <p>Du hast noch <strong>{netIncrease} Guthaben</strong> übrig.</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
    booking_confirmation_user: {
      en: {
        subject: "Confirmation: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Booking Confirmed!</h2>\n  <p style="font-weight: bold; color: #9960a8;">This email is your ticket.</p>\n  <p>Hi {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Location:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  <p>You can also view and manage all your bookings directly on your <a href="{profileUrl}" style="color: #9960a8; font-weight: bold;">profile on our website</a>.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Bestätigung: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Buchung bestätigt!</h2>\n  <p style="font-weight: bold; color: #9960a8;">Diese E-Mail ist dein Ticket.</p>\n  <p>Hallo {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Standort:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  <p>Du kannst alle deine Buchungen auch jederzeit in deinem <a href="{profileUrl}" style="color: #9960a8; font-weight: bold;">Profil auf unserer Website</a> einsehen.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
    booking_confirmation_guest: {
      en: {
        subject: "Confirmation: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Booking Confirmed!</h2>\n  <p style="font-weight: bold; color: #9960a8;">This email is your ticket.</p>\n  <p>Hi {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Standort:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Bestätigung: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #4e5f28;">Buchung bestätigt!</h2>\n  <p style="font-weight: bold; color: #9960a8;">Diese E-Mail ist dein Ticket.</p>\n  <p>Hallo {userName},</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">\n    <ul style="margin: 0; padding: 0;">{datesHtml}</ul>\n  </div>\n  <p><strong>Standort:</strong> Sägestrasse 11, 8952 Schlieren</p>\n  {registrationCTA}\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
    cancellation_user: {
      en: {
        subject: "Session Cancelled: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Session Cancelled</h2>\n  <p>Hi {userName},</p>\n  <p>The session for <strong>{courseKey}</strong> on <strong>{courseDate}</strong> has been cancelled.</p>\n  <p>We have automatically credited <strong>1 session</strong> back to your profile.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Termin abgesagt: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Termin wurde abgesagt</h2>\n  <p>Hallo {userName},</p>\n  <p>Der Termin für <strong>{courseKey}</strong> am <strong>{courseDate}</strong> wurde abgesagt.</p>\n  <p>Wir haben deinem Profil automatisch <strong>1 Termin</strong> gutgeschrieben.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
    cancellation_guest: {
      en: {
        subject: "Session Cancelled: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Session Cancelled</h2>\n  <p>Hi {userName},</p>\n  <p>The session for <strong>{courseKey}</strong> on <strong>{courseDate}</strong> has been cancelled.</p>\n  <p>As a guest, here is your unique code to redeem your refunded session on our website:</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">\n    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #9960a8; margin: 0;">{refundCode}</p>\n  </div>\n  <p>You can apply this code during your next checkout.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
      de: {
        subject: "Termin abgesagt: {courseKey}",
        body: `<div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">\n  <h2 style="color: #ff4d4d;">Termin wurde abgesagt</h2>\n  <p>Hallo {userName},</p>\n  <p>Der Termin für <strong>{courseKey}</strong> am <strong>{courseDate}</strong> wurde abgesagt.</p>\n  <p>Da du als Gast gebucht hast, ist hier dein einzigartiger Code, um deinen erstatteten Termin auf unserer Website einzulösen:</p>\n  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">\n    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #9960a8; margin: 0;">{refundCode}</p>\n  </div>\n  <p>Du kannst diesen Code bei deiner nächsten Buchung an der Kasse anwenden.</p>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>\n</div>`,
      },
    },
    instructor_availability: {
      en: {
        subject: "Instructor Availability: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Availability Requested</h2>\n  <p>Hi {firstName},</p>\n  <p>The schedule for <strong>{courseKey}</strong> is being prepared. Please log in to the admin panel to mark your available dates.</p>\n  <div style="margin-top: 25px; text-align: center;">\n      <a href="{adminUrl}" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold;">Open Schedule</a>\n  </div>\n  <br/><p>Best,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
      de: {
        subject: "Instructor Availability: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Verfügbarkeit angefragt</h2>\n  <p>Hallo {firstName},</p>\n  <p>Der Stundenplan für <strong>{courseKey}</strong> wird vorbereitet. Bitte logge dich im Admin-Bereich ein, um deine verfügbaren Termine zu markieren.</p>\n  <div style="margin-top: 25px; text-align: center;">\n      <a href="{adminUrl}" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold;">Zum Stundenplan</a>\n  </div>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
    },
    instructor_schedule: {
      en: {
        subject: "Work Schedule: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Your Teaching Schedule</h2>\n  <p>Hi {firstName},</p>\n  <p>The schedule for <strong>{courseKey}</strong> is finalized. You are assigned to the following dates:</p>\n  <ul style="padding: 0; margin: 0;">{scheduleList}</ul>\n  <div style="margin-top: 25px; text-align: center;">\n      <a href="{profileUrl}" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold;">View on My Profile</a>\n  </div>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
      de: {
        subject: "Work Schedule: {courseKey}",
        body: `<div style="font-family: Arial; padding: 30px; background-color: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">\n  <h2 style="color: #4e5f28;">Dein Stundenplan</h2>\n  <p>Hallo {firstName},</p>\n  <p>Der Stundenplan für <strong>{courseKey}</strong> steht fest. Du bist für die folgenden Termine eingeteilt:</p>\n  <ul style="padding: 0; margin: 0;">{scheduleList}</ul>\n  <div style="margin-top: 25px; text-align: center;">\n      <a href="{profileUrl}" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold;">Zum Profil</a>\n  </div>\n  <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche Team</p>\n</div>`,
      },
    },
  };

  const data = snap.exists ? snap.data() : null;
  if (data && data[typeId] && data[typeId][lang]) {
    return data[typeId][lang];
  }
  return defaults[typeId][lang] || defaults[typeId]["en"];
};

const replaceVars = (str, replacements) => {
  let result = str;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value || "");
  }
  return result;
};

const getRegistrationCTA = (lang, email, origin) => {
  if (!origin || !email) return "";
  const regUrl = `${origin}/register-guest?email=${encodeURIComponent(email)}`;
  const text =
    lang === "de"
      ? "Möchtest du deine Buchungen und Guthaben an einem Ort verwalten? Erstelle jetzt ein Profil und verknüpfe diesen Kauf automatisch."
      : "Want to manage your bookings and credits in one place? Create a profile now and automatically link this purchase.";
  const btnText = lang === "de" ? "Profil erstellen" : "Create Profile";

  return `
    <div style="margin-top: 30px; padding: 20px; border: 1px dashed #caaff3; background-color: rgba(202, 175, 243, 0.05); border-radius: 12px; text-align: center;">
      <p style="font-size: 14px; margin-bottom: 15px; color: #1c0700;">${text}</p>
      <a href="${regUrl}" style="display: inline-block; padding: 12px 25px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold; font-size: 14px;">${btnText}</a>
    </div>
  `;
};

// --- EMAIL SENDING HELPERS ---

const sendUserPackEmail = async (
  transaction,
  email,
  name,
  courseKey,
  packSize,
  netIncrease,
  lang,
) => {
  if (!email) return;
  const template = await getTemplate(transaction, "pack_purchase_user", lang);

  const replacements = {
    "{userName}": name,
    "{courseKey}": courseKey,
    "{packSize}": packSize,
    "{netIncrease}": netIncrease,
  };

  const mailRef = db.collection("mail").doc();
  const mailData = {
    to: email,
    message: {
      subject: replaceVars(template.subject, replacements),
      html: replaceVars(template.body, replacements),
    },
  };
  if (transaction) transaction.set(mailRef, mailData);
  else await mailRef.set(mailData);
};

const sendGuestPackCodeEmail = async (
  transaction,
  email,
  name,
  courseKey,
  packSize,
  netIncrease,
  newCode,
  lang,
  origin,
) => {
  if (!email) return;
  const template = await getTemplate(transaction, "pack_purchase_guest", lang);

  const replacements = {
    "{userName}": name,
    "{courseKey}": courseKey,
    "{packSize}": packSize,
    "{newCode}": newCode,
    "{netIncrease}": netIncrease,
    "{registrationCTA}": getRegistrationCTA(lang, email, origin),
  };

  const mailRef = db.collection("mail").doc();
  const mailData = {
    to: email,
    message: {
      subject: replaceVars(template.subject, replacements),
      html: replaceVars(template.body, replacements),
    },
  };
  if (transaction) transaction.set(mailRef, mailData);
  else await mailRef.set(mailData);
};

const sendBookingEmail = async (
  transaction,
  email,
  name,
  coursePath,
  dates,
  lang,
  isGuest,
  origin,
) => {
  if (!email || dates.length === 0) return;
  const courseKey = getCleanCourseKey(coursePath);
  const sanitizedId = coursePath.replace(/\//g, "");

  const reminderRef = db.collection("course_reminders").doc(sanitizedId);
  const reminderSnap = await (transaction
    ? transaction.get(reminderRef)
    : reminderRef.get());

  const addonTexts = reminderSnap.exists
    ? reminderSnap.data()[lang]?.addonTexts || {}
    : {};

  const datesHtml = dates
    .map((d) => {
      const fDate = formatDate(d.date);
      const fTime = d.time ? ` | ${d.time}` : "";
      let addonBlock = "";
      if (d.selectedAddons && Array.isArray(d.selectedAddons)) {
        d.selectedAddons.forEach((id) => {
          if (addonTexts[id]) {
            addonBlock += `<div style="margin-top: 8px; padding: 12px; background: #fff; border-left: 3px solid #9960a8; font-size: 13px; color: #1c0700; white-space: pre-wrap;">${addonTexts[id]}</div>`;
          }
        });
      }
      return `
    <li style="margin-bottom: 18px; list-style: none; font-size: 15px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
        <span style="font-weight: bold;">${fDate}${fTime}</span> 
        <a href="${getGoogleCalLink(courseKey, d.date)}" target="_blank" style="font-size: 11px; color: #9960a8; text-decoration: none; border: 1px solid #caaff3; padding: 2px 6px; border-radius: 4px; background-color: #fff;">${lang === "de" ? "📅 Zum Kalender" : "📅 Add to Calendar"}</a>
      </div>
      ${addonBlock}
    </li>`;
    })
    .join("");

  const typeId = isGuest
    ? "booking_confirmation_guest"
    : "booking_confirmation_user";
  const template = await getTemplate(transaction, typeId, lang);

  const replacements = {
    "{userName}": name,
    "{courseKey}": courseKey,
    "{datesHtml}": datesHtml,
    "{registrationCTA}": isGuest ? getRegistrationCTA(lang, email, origin) : "",
    "{profileUrl}": `${origin}/profile`,
  };

  const mailRef = db.collection("mail").doc();
  const mailData = {
    to: email,
    message: {
      subject: replaceVars(template.subject, replacements),
      html: replaceVars(template.body, replacements),
    },
  };

  if (transaction) transaction.set(mailRef, mailData);
  else await mailRef.set(mailData);
};

const sendCancellationEmail = async (
  transaction,
  email,
  name,
  courseKey,
  date,
  lang,
  code = null,
  amount = 1, // Added amount parameter for ticket aggregation
  origin,
) => {
  if (!email) return;

  const typeId = code ? "cancellation_guest" : "cancellation_user";
  const template = await getTemplate(transaction, typeId, lang);

  const replacements = {
    "{userName}": name,
    "{courseKey}": courseKey,
    "{courseDate}": formatDate(date),
    "{refundCode}": code || "",
    "{refundAmount}": amount.toString(), // Passes the aggregated amount to the email
  };

  const mailRef = db.collection("mail").doc();
  const mailData = {
    to: email,
    message: {
      subject: replaceVars(template.subject, replacements),
      html: replaceVars(template.body, replacements),
    },
  };

  if (transaction) transaction.set(mailRef, mailData);
  else await mailRef.set(mailData);
};

const sendFiringEmail = async (email, templateId, lang, replacements) => {
  if (!email) return;
  const template = await getTemplate(null, templateId, lang);
  await db.collection("mail").add({
    to: email,
    message: {
      subject: replaceVars(template.subject, replacements),
      html: replaceVars(template.body, replacements),
    },
  });
};

// ============================================================================
// 1. STRIPE CHECKOUT
// ============================================================================
exports.createStripeCheckout = onCall(
  { cors: true, secrets: ["STRIPE_SECRET_KEY"] },
  async (request) => {
    try {
      const {
        mode,
        packPrice,
        totalPrice,
        packSize,
        selectedDates,
        coursePath,
        guestInfo,
        currentLang,
        successUrl,
        cancelUrl,
        creditsToUse,
        baseUrl,
      } = request.data;
      const userId = request.auth ? request.auth.uid : "GUEST_USER";
      const userEmail = request.auth
        ? request.auth.token.email
        : guestInfo?.email;

      const origin = baseUrl || "https://sinneskueche.ch";

      if (!request.auth && !guestInfo)
        throw new HttpsError("unauthenticated", "Login required.");

      const session = await stripe.checkout.sessions.create({
        customer_email: userEmail,
        line_items: [
          {
            price_data: {
              currency: "chf",
              product_data: {
                name:
                  mode === "pack"
                    ? `${packSize}-Session Pack: ${getCleanCourseKey(coursePath)}`
                    : `Sessions: ${getCleanCourseKey(coursePath)}`,
              },
              unit_amount:
                mode === "pack"
                  ? Math.round(packPrice * 100)
                  : Math.round(totalPrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          guestName: guestInfo
            ? `${guestInfo.firstName} ${guestInfo.lastName}`
            : "N/A",
          mode,
          packSize: packSize || 0,
          coursePath: coursePath || "unknown",
          selectedDates: JSON.stringify(selectedDates),
          currentLang: currentLang || "en",
          origin,
          creditsToUse: creditsToUse ? creditsToUse.toString() : "0",
        },
      });
      return { url: session.url };
    } catch (error) {
      logger.error("createStripeCheckout failed", error);
      throw new HttpsError("internal", error.message);
    }
  },
);

// ============================================================================
// 2. STRIPE WEBHOOK
// ============================================================================
exports.handleStripeWebhook = onRequest(
  { secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentCheckRef = db
        .collection("processed_payments")
        .doc(session.id);

      try {
        let emailData = null;
        let isPackUser = false;
        let isPackGuest = false;

        await db.runTransaction(async (transaction) => {
          const checkSnap = await transaction.get(paymentCheckRef);
          if (checkSnap.exists) return;

          const {
            userId,
            guestName,
            mode,
            packSize,
            selectedDates,
            coursePath,
            currentLang,
            origin,
            creditsToUse,
          } = session.metadata;
          const parsedDates = JSON.parse(selectedDates);
          const courseKey = getCleanCourseKey(coursePath);
          const lang = currentLang || "en";
          const email = session.customer_details.email;
          const isGuest = userId === "GUEST_USER";
          const parsedCreditsToUse = parseInt(creditsToUse || "0", 10);

          let finalName = guestName;
          if (!isGuest) {
            const userSnap = await transaction.get(
              db.collection("users").doc(userId),
            );
            if (userSnap.exists)
              finalName = userSnap.data().firstName || guestName;
          }

          if (!isGuest && parsedCreditsToUse > 0) {
            transaction.update(db.collection("users").doc(userId), {
              [`credits.${courseKey}`]:
                admin.firestore.FieldValue.increment(-parsedCreditsToUse),
            });
            const historyRef = db.collection("credit_history").doc();
            transaction.set(historyRef, {
              userId,
              courseKey,
              amount: -parsedCreditsToUse,
              type: "booking",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          let netIncrease = 0;
          let generatedCode = null;

          if (mode === "pack") {
            netIncrease = Math.max(0, parseInt(packSize) - parsedDates.length);
            if (!isGuest) {
              transaction.set(
                db.collection("users").doc(userId),
                {
                  credits: {
                    [courseKey]:
                      admin.firestore.FieldValue.increment(netIncrease),
                  },
                },
                { merge: true },
              );
              const historyRef = db.collection("credit_history").doc();
              transaction.set(historyRef, {
                userId,
                courseKey,
                amount: netIncrease,
                type: "purchase",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              isPackUser = true;
            } else if (netIncrease > 0) {
              generatedCode = generatePackCode();
              transaction.set(db.collection("pack_codes").doc(generatedCode), {
                code: generatedCode,
                courseKey,
                remainingCredits: netIncrease,
                buyerEmail: email,
                buyerName: guestName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                redeemedEventIds: parsedDates.map((d) => d.id), // Log initial dates
              });
              isPackGuest = true;
            }
          }

          let creditsApplied = 0;
          parsedDates.forEach((d) => {
            let isCreditBooking = false;
            // Mark as credit if they are using their existing balance
            if (!isGuest && parsedCreditsToUse > creditsApplied) {
              isCreditBooking = true;
              creditsApplied++;
            }
            // Mark as credit if they are buying a pack (these dates consume the pack)
            if (mode === "pack" && !isGuest) {
              isCreditBooking = true;
            }

            transaction.set(db.collection("bookings").doc(), {
              userId,
              guestName: isGuest ? guestName : null,
              guestEmail: isGuest ? email : null,
              eventId: d.id,
              date: d.date,
              attendeeName: d.attendeeName || "Customer",
              coursePath,
              selectedAddons: d.selectedAddons || [],
              status: "confirmed",
              lang,
              usedCredit: isCreditBooking, // Save the flag
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          transaction.set(paymentCheckRef, {
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            userId,
          });

          emailData = {
            email,
            finalName,
            coursePath,
            parsedDates,
            lang,
            isGuest,
            origin,
            packSize,
            netIncrease,
            generatedCode,
            courseKey,
          };
        });

        if (emailData) {
          if (emailData.parsedDates.length === 0) {
            if (isPackUser) {
              await sendUserPackEmail(
                null,
                emailData.email,
                emailData.finalName,
                emailData.courseKey,
                emailData.packSize,
                emailData.netIncrease,
                emailData.lang,
              );
            } else if (isPackGuest) {
              await sendGuestPackCodeEmail(
                null,
                emailData.email,
                emailData.finalName,
                emailData.courseKey,
                emailData.packSize,
                emailData.netIncrease,
                emailData.generatedCode,
                emailData.lang,
                emailData.origin,
              );
            }
          } else {
            await sendBookingEmail(
              null,
              emailData.email,
              emailData.finalName,
              emailData.coursePath,
              emailData.parsedDates,
              emailData.lang,
              emailData.isGuest,
              emailData.origin,
            );
          }
        }
      } catch (e) {
        logger.error("Webhook logic failed", e);
      }
    }
    res.json({ received: true });
  },
);

// ============================================================================
// 3. ADMIN & USER ACTIONS
// ============================================================================
exports.bookWithCredits = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  try {
    const { coursePath, selectedDates, currentLang, baseUrl } = request.data;
    const origin = baseUrl || "https://sinneskueche.ch";
    const courseKey = getCleanCourseKey(coursePath);
    const userRef = db.collection("users").doc(request.auth.uid);
    const email = request.auth.token.email;

    const result = await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const firstName = userSnap.data()?.firstName || "Customer";

      transaction.update(userRef, {
        [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(
          -selectedDates.length,
        ),
      });

      const historyRef = db.collection("credit_history").doc();
      transaction.set(historyRef, {
        userId: request.auth.uid,
        courseKey,
        amount: -selectedDates.length,
        type: "booking",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      selectedDates.forEach((d) => {
        transaction.set(db.collection("bookings").doc(), {
          userId: request.auth.uid,
          eventId: d.id,
          date: d.date,
          attendeeName: d.attendeeName || "Customer",
          coursePath,
          selectedAddons: d.selectedAddons || [],
          status: "confirmed",
          lang: currentLang || "en",
          usedCredit: true, // Save the flag
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      return { firstName };
    });

    await sendBookingEmail(
      null,
      email,
      result.firstName,
      coursePath,
      selectedDates,
      currentLang || "en",
      false,
      origin,
    );
    return { success: true };
  } catch (error) {
    logger.error("bookWithCredits failed", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.redeemPackCode = onCall({ cors: true }, async (request) => {
  try {
    const {
      coursePath,
      selectedDates,
      packCode,
      guestInfo,
      currentLang,
      baseUrl,
    } = request.data;
    const origin = baseUrl || "https://sinneskueche.ch";
    const courseKey = getCleanCourseKey(coursePath);
    const codeRef = db.collection("pack_codes").doc(packCode);

    await db.runTransaction(async (t) => {
      const snap = await t.get(codeRef);
      if (!snap.exists) throw new HttpsError("not-found", "Invalid code.");

      const updates = {
        remainingCredits: admin.firestore.FieldValue.increment(
          -selectedDates.length,
        ),
      };
      if (selectedDates.length > 0) {
        updates.redeemedEventIds = admin.firestore.FieldValue.arrayUnion(
          ...selectedDates.map((d) => d.id),
        );
      }
      t.update(codeRef, updates);

      selectedDates.forEach((d) => {
        t.set(db.collection("bookings").doc(), {
          userId: "GUEST_USER",
          guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
          guestEmail: guestInfo.email,
          eventId: d.id,
          date: d.date,
          attendeeName: d.attendeeName || "Customer",
          coursePath,
          selectedAddons: d.selectedAddons || [],
          status: "confirmed",
          lang: currentLang || "en",
          usedCredit: true, // Save the flag
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    });

    await sendBookingEmail(
      null,
      guestInfo.email,
      guestInfo.firstName,
      coursePath,
      selectedDates,
      currentLang || "en",
      true,
      origin,
    );
    return { success: true };
  } catch (error) {
    logger.error("redeemPackCode failed", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.cancelBooking = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  try {
    const { bookingId } = request.data;
    const bRef = db.collection("bookings").doc(bookingId);
    return db.runTransaction(async (t) => {
      const snap = await t.get(bRef);
      if (!snap.exists || snap.data().userId !== request.auth.uid)
        throw new HttpsError("permission-denied", "Unauthorized.");
      const courseKey = getCleanCourseKey(snap.data().coursePath);
      t.update(db.collection("users").doc(request.auth.uid), {
        [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(1),
      });
      const historyRef = db.collection("credit_history").doc();
      t.set(historyRef, {
        userId: request.auth.uid,
        courseKey,
        amount: 1,
        type: "refund",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      t.delete(bRef);
      return { success: true };
    });
  } catch (error) {
    logger.error("cancelBooking failed", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.cancelBookings = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  try {
    const { bookingIds } = request.data;
    if (!Array.isArray(bookingIds) || bookingIds.length === 0)
      throw new HttpsError("invalid-argument", "No bookings provided.");

    return db.runTransaction(async (t) => {
      const firstBookingRef = db.collection("bookings").doc(bookingIds[0]);
      const firstSnap = await t.get(firstBookingRef);
      if (!firstSnap.exists || firstSnap.data().userId !== request.auth.uid)
        throw new HttpsError("permission-denied", "Unauthorized.");

      const courseKey = getCleanCourseKey(firstSnap.data().coursePath);
      t.update(db.collection("users").doc(request.auth.uid), {
        [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(
          bookingIds.length,
        ),
      });
      const historyRef = db.collection("credit_history").doc();
      t.set(historyRef, {
        userId: request.auth.uid,
        courseKey,
        amount: bookingIds.length,
        type: "refund",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      for (const id of bookingIds) t.delete(db.collection("bookings").doc(id));
      return { success: true };
    });
  } catch (error) {
    logger.error("cancelBookings failed", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.adminCancelEvent = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");

  try {
    const { eventId, currentLang, baseUrl } = request.data;
    const lang = currentLang || "en";
    const origin = baseUrl || "https://sinneskueche.ch";

    // 1. Fetch bookings outside transaction to avoid read/write conflicts
    const eventRef = db.collection("events").doc(eventId);
    const bookingsSnap = await db
      .collection("bookings")
      .where("eventId", "==", eventId)
      .get();

    // 2. Aggregate bookings by user to combine multiple tickets into one refund
    const aggregatedBookings = {};
    for (const bDoc of bookingsSnap.docs) {
      const bData = bDoc.data();
      const isGuest = bData.userId === "GUEST_USER";
      // Fallback key if guestEmail is missing (unlikely, but safe)
      const key = isGuest
        ? `guest_${bData.guestEmail || bDoc.id}`
        : `user_${bData.userId}`;

      if (!aggregatedBookings[key]) {
        aggregatedBookings[key] = {
          isGuest,
          userId: bData.userId,
          guestEmail: bData.guestEmail,
          guestName: bData.guestName,
          count: 0,
          bookingRefs: [],
        };
      }
      aggregatedBookings[key].count += 1;
      aggregatedBookings[key].bookingRefs.push(bDoc.ref);
    }

    // 3. Pre-fetch user emails for registered users to avoid reads inside the write-phase
    const userInfos = {};
    for (const key in aggregatedBookings) {
      const bData = aggregatedBookings[key];
      if (!bData.isGuest) {
        const uSnap = await db.collection("users").doc(bData.userId).get();
        if (uSnap.exists) {
          userInfos[bData.userId] = {
            email: uSnap.data().email,
            name: uSnap.data().firstName || "Customer",
          };
        }
      }
    }

    // 4. Prepare email data outside the transaction
    const emailsToSend = [];

    await db.runTransaction(async (transaction) => {
      // READ FIRST
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists)
        throw new HttpsError("not-found", "Event not found");

      const eventData = eventSnap.data();
      const courseKey = getCleanCourseKey(eventData.link || "");

      // ALL WRITES
      for (const key in aggregatedBookings) {
        const bData = aggregatedBookings[key];
        const amount = bData.count;

        if (bData.isGuest) {
          const newCode = generatePackCode();
          transaction.set(db.collection("pack_codes").doc(newCode), {
            code: newCode,
            courseKey,
            remainingCredits: amount,
            buyerEmail: bData.guestEmail,
            buyerName: bData.guestName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          emailsToSend.push({
            email: bData.guestEmail,
            name: bData.guestName,
            courseKey,
            date: eventData.date,
            code: newCode,
            amount: amount,
          });
        } else {
          const userRef = db.collection("users").doc(bData.userId);
          transaction.update(userRef, {
            [`credits.${courseKey}`]:
              admin.firestore.FieldValue.increment(amount),
          });

          const historyRef = db.collection("credit_history").doc();
          transaction.set(historyRef, {
            userId: bData.userId,
            courseKey,
            amount: amount,
            type: "refund",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const uInfo = userInfos[bData.userId];
          if (uInfo && uInfo.email) {
            emailsToSend.push({
              email: uInfo.email,
              name: uInfo.name,
              courseKey,
              date: eventData.date,
              code: null,
              amount: amount,
            });
          }
        }

        // Delete all associated bookings for this user
        for (const ref of bData.bookingRefs) {
          transaction.delete(ref);
        }
      }

      transaction.delete(eventRef);
    });

    // 5. SEND EMAILS OUTSIDE THE TRANSACTION
    // This completely eliminates the "Read after Write" error.
    const emailPromises = emailsToSend.map((e) =>
      sendCancellationEmail(
        null,
        e.email,
        e.name,
        e.courseKey,
        e.date,
        lang,
        e.code,
        e.amount,
        origin,
      ),
    );
    await Promise.all(emailPromises);

    return { success: true };
  } catch (error) {
    logger.error("adminCancelEvent failed", error);
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// 4. AUTOMATED COURSE REMINDERS
// ============================================================================
exports.sendCourseReminders = onSchedule("0 8 * * *", async (event) => {
  const today = new Date();
  const remindersSnap = await db.collection("course_reminders").get();
  if (remindersSnap.empty) return;

  const reminderConfigs = {};
  remindersSnap.forEach((doc) => {
    reminderConfigs[doc.id] = doc.data();
  });

  for (const courseId in reminderConfigs) {
    const config = reminderConfigs[courseId];
    const daysBefore = config.daysBefore || 3;
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + daysBefore);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const bookingsSnap = await db
      .collection("bookings")
      .where("coursePath", "in", [`/${courseId}`, courseId])
      .where("date", "==", targetDateStr)
      .where("status", "==", "confirmed")
      .get();

    for (const bDoc of bookingsSnap.docs) {
      const booking = bDoc.data();
      if (booking.reminderSent) continue;

      let email = booking.guestEmail;
      let name = booking.guestName || "Customer";
      let isFirstTimer = false;

      if (booking.userId !== "GUEST_USER") {
        const uSnap = await db.collection("users").doc(booking.userId).get();
        if (uSnap.exists) {
          email = uSnap.data().email;
          name = uSnap.data().firstName || name;
          const prevBookings = await db
            .collection("bookings")
            .where("userId", "==", booking.userId)
            .where("coursePath", "==", booking.coursePath)
            .limit(2)
            .get();
          isFirstTimer = prevBookings.size <= 1;
        }
      } else {
        isFirstTimer = true;
      }

      const lang = booking.lang || "en";
      const template = config[lang] ||
        config["en"] || {
          subject: "Reminder",
          text: "You have a class coming up.",
        };

      let courseTime = "";
      const evSnap = await db.collection("events").doc(booking.eventId).get();
      if (evSnap.exists) courseTime = evSnap.data().time || "";

      const replacements = {
        "{userName}": name,
        "{courseName}": getCleanCourseKey(booking.coursePath),
        "{courseDate}": formatDate(booking.date),
        "{courseTime}": courseTime,
      };

      let subject = replaceVars(template.subject || "", replacements);
      let body = replaceVars(template.text || "", replacements);

      if (isFirstTimer && template.firstTimerText) {
        body += "\n\n" + template.firstTimerText;
      }

      if (booking.selectedAddons && Array.isArray(booking.selectedAddons)) {
        const addonTexts = template.addonTexts || {};
        booking.selectedAddons.forEach((addonId) => {
          if (addonTexts[addonId]) body += "\n\n" + addonTexts[addonId];
        });
      }

      await db.collection("mail").add({
        to: email,
        message: {
          subject,
          html: `<div style="font-family: Arial; background: #fffce3; padding: 30px; color: #1c0700; border-radius: 12px; border: 1px solid #caaff3;"><div style="white-space: pre-wrap;">${body}</div></div>`,
        },
      });
      await bDoc.ref.update({ reminderSent: true });
    }
  }
});

// ============================================================================
// 5. MISC TRIGGERS & INSTRUCTOR ACTIONS
// ============================================================================
exports.onRentRequestCreate = onDocumentCreated(
  "rent_requests/{requestId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const settingsSnap = await db
      .collection("settings")
      .doc("admin_config")
      .get();

    const adminEmail = settingsSnap.exists
      ? settingsSnap.data().adminEmail
      : null;
    if (!adminEmail) return;

    await db.collection("mail").add({
      to: adminEmail,
      message: {
        subject: `New Rental Request: ${data.name}`,
        html: `<div style="font-family: Arial; padding: 20px; background: #fffce3; border: 1px solid #caaff3; border-radius: 12px;"><h2>New Rental Request</h2><p><strong>From:</strong> ${data.name}</p><p><strong>Date:</strong> ${data.date}</p><p><strong>Message:</strong><br/>${data.message}</p></div>`,
      },
    });
  },
);

exports.requestAvailabilities = onCall({ cors: true }, async (request) => {
  try {
    const { courseId, instructors, baseUrl } = request.data;
    const courseKey = getCleanCourseKey(courseId);
    const origin = baseUrl || "https://sinneskueche.ch";

    for (const uid of instructors) {
      const userSnap = await db.collection("users").doc(uid).get();
      if (!userSnap.exists) continue;
      const { email, firstName } = userSnap.data();

      const template = await getTemplate(null, "instructor_availability", "en");
      const replacements = {
        "{firstName}": firstName || "Instructor",
        "{courseKey}": courseKey,
        "{adminUrl}": `${origin}/admin-sinneskueche?tab=schedule`,
      };

      await db.collection("mail").add({
        to: email,
        message: {
          subject: replaceVars(template.subject, replacements),
          html: replaceVars(template.body, replacements),
        },
      });
    }
    return { success: true };
  } catch (error) {
    logger.error("requestAvailabilities failed", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.sendFinalSchedules = onCall({ cors: true }, async (request) => {
  try {
    const { courseId, assignments, specialAssignments, baseUrl } = request.data;
    const origin = baseUrl || "https://sinneskueche.ch";
    const courseKey = getCleanCourseKey(courseId);
    const instructorSchedules = {};

    const allInstructorIds = [...new Set(Object.values(assignments).flat())];
    const nameMap = {};

    await Promise.all(
      allInstructorIds.map(async (uid) => {
        const snap = await db.collection("users").doc(uid).get();
        if (snap.exists) {
          const userData = snap.data();
          nameMap[uid] =
            `${userData.firstName} ${userData.lastName || ""}`.trim();
        }
      }),
    );

    let definedAddons = [];
    const settingsSnap = await db
      .collection("course_settings")
      .doc(courseId.replace(/\//g, ""))
      .get();
    if (settingsSnap.exists) {
      definedAddons = settingsSnap.data().specialEvents || [];
    }

    for (const eventId in assignments) {
      const uids = assignments[eventId];
      const eventSnap = await db.collection("events").doc(eventId).get();
      if (!eventSnap.exists) continue;
      const eventData = eventSnap.data();

      for (const uid of uids) {
        if (!instructorSchedules[uid]) instructorSchedules[uid] = [];

        const otherNames = uids
          .filter((id) => id !== uid)
          .map((id) => nameMap[id] || "Unknown");

        let addonText = "";
        const addonIds = Array.isArray(specialAssignments[eventId])
          ? specialAssignments[eventId]
          : [];

        if (addonIds.length > 0) {
          addonText = addonIds
            .map((id) => {
              const found = definedAddons.find((a) => a.id === id);
              return found ? found.nameEn : "";
            })
            .filter((n) => n !== "")
            .join(", ");
        }

        instructorSchedules[uid].push({
          date: eventData.date,
          time: eventData.time,
          coInstructor: otherNames.length > 0 ? otherNames.join(", ") : "Solo",
          addon: addonText,
        });
      }
    }

    for (const uid in instructorSchedules) {
      const userSnap = await db.collection("users").doc(uid).get();
      if (!userSnap.exists) continue;
      const { email, firstName } = userSnap.data();

      const listHtml = instructorSchedules[uid]
        .map(
          (s) => `
        <li style="margin-bottom: 15px; list-style: none; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #caaff3;">
          <strong style="color: #1c0700;">${formatDate(s.date)}</strong> | ${s.time || "No time set"}<br/>
          <span style="font-size: 13px; opacity: 0.7;">Working with: ${s.coInstructor}</span>
          ${s.addon ? `<br/><span style="font-size: 13px; color: #9960a8;"><strong>Add-on:</strong> ${s.addon}</span>` : ""}
        </li>`,
        )
        .join("");

      const template = await getTemplate(null, "instructor_schedule", "en");
      const replacements = {
        "{firstName}": firstName || "Instructor",
        "{courseKey}": courseKey,
        "{scheduleList}": listHtml,
        "{profileUrl}": `${origin}/profile`,
      };

      await db.collection("mail").add({
        to: email,
        message: {
          subject: replaceVars(template.subject, replacements),
          html: replaceVars(template.body, replacements),
        },
      });
    }

    return { success: true };
  } catch (error) {
    logger.error("sendFinalSchedules failed", error);
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// 6. FIRING SCHEDULE & OBJECT TRACKING
// ============================================================================

exports.registerFiringObject = onCall({ cors: true }, async (request) => {
  try {
    // Now accepting name and userCode
    const { email, name, userCode, stage, imageUrl, currentLang } =
      request.data;
    if (!email || !stage || !imageUrl || !userCode)
      throw new HttpsError("invalid-argument", "Missing data.");

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = userCode.trim().toUpperCase();

    const docRef = await db.collection("firings").add({
      email: cleanEmail,
      name: name || "Student",
      userCode: cleanCode,
      stage,
      imageUrl,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lang: currentLang || "en",
    });

    const lang = currentLang || "en";
    const stageText =
      stage === "bisque"
        ? lang === "de"
          ? "Schrühbrand"
          : "Bisque"
        : lang === "de"
          ? "Glasurbrand"
          : "Glaze";

    await sendFiringEmail(cleanEmail, "firing_registered", lang, {
      "{stage}": stageText,
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error("registerFiringObject failed", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.updateFiringStatus = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  try {
    const { objectId, newStatus } = request.data;
    const docRef = db.collection("firings").doc(objectId);
    const snap = await docRef.get();

    if (!snap.exists) throw new HttpsError("not-found", "Object not found.");
    const data = snap.data();

    await docRef.update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reminderSent: false, // reset reminder flag on status change
    });

    // Send corresponding email
    const lang = data.lang || "en";
    if (newStatus === "bisque_ready") {
      await sendFiringEmail(data.email, "firing_bisque_ready", lang, {});
    } else if (newStatus === "glaze_ready") {
      await sendFiringEmail(data.email, "firing_glaze_ready", lang, {});
    } else if (newStatus === "broken") {
      await sendFiringEmail(data.email, "firing_broken", lang, {});
    }

    return { success: true };
  } catch (error) {
    logger.error("updateFiringStatus failed", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.sendFiringReminders = onSchedule("0 9 * * *", async (event) => {
  // Runs daily at 9:00 AM
  const today = new Date();

  const firingsSnap = await db
    .collection("firings")
    .where("status", "in", ["bisque_ready", "glaze_ready"])
    .where("reminderSent", "==", false)
    .get();

  for (const doc of firingsSnap.docs) {
    const data = doc.data();
    if (!data.updatedAt) continue;

    const updatedDate = data.updatedAt.toDate();
    const diffTime = Math.abs(today - updatedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const lang = data.lang || "en";

    // Bisque: 8 weeks total. Remind at 7 weeks (49 days)
    if (data.status === "bisque_ready" && diffDays >= 49) {
      const actionText = lang === "de" ? "zu glasieren" : "glaze it";
      await sendFiringEmail(data.email, "firing_reminder", lang, {
        "{action}": actionText,
        "{weeksLeft}": "1",
      });
      await doc.ref.update({ reminderSent: true });
    }

    // Glaze: 4 weeks total. Remind at 3 weeks (21 days)
    if (data.status === "glaze_ready" && diffDays >= 21) {
      const actionText = lang === "de" ? "abzuholen" : "pick it up";
      await sendFiringEmail(data.email, "firing_reminder", lang, {
        "{action}": actionText,
        "{weeksLeft}": "1",
      });
      await doc.ref.update({ reminderSent: true });
    }
  }
});

// Fetch objects for a specific code
exports.getStudentObjects = onCall({ cors: true }, async (request) => {
  const { userCode } = request.data;
  if (!userCode) throw new HttpsError("invalid-argument", "Code required.");

  const searchCode = userCode.trim().toUpperCase();

  const snap = await db
    .collection("firings")
    .where("userCode", "==", searchCode)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

// Move an existing bisque object to the glaze firing queue
exports.moveToGlazeStage = onCall({ cors: true }, async (request) => {
  const { objectId, currentLang } = request.data;
  const docRef = db.collection("firings").doc(objectId);
  const snap = await docRef.get();

  if (!snap.exists) throw new HttpsError("not-found", "Object not found.");
  const data = snap.data();

  await docRef.update({
    stage: "glaze",
    status: "pending", // Back to queue for the next fire
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reminderSent: false,
  });

  const lang = currentLang || "en";
  await sendFiringEmail(data.email, "firing_registered", lang, {
    "{stage}": lang === "de" ? "Glasurbrand" : "Glaze",
  });

  return { success: true };
});

// ============================================================================
// 7. CONTACT FORM
// ============================================================================

exports.onContactMessageCreate = onDocumentCreated(
  "contact_messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();

    // Fetch the array of contact emails from the admin settings
    const settingsSnap = await db
      .collection("settings")
      .doc("admin_config")
      .get();
    const contactEmails = settingsSnap.exists
      ? settingsSnap.data().contactEmails || []
      : [];

    // If no emails are configured, do nothing
    if (contactEmails.length === 0) return;

    const htmlBody = `
      <div style="font-family: Arial; padding: 30px; background: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">
        <h2 style="color: #9960a8; margin-top: 0;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <div style="background: rgba(28, 7, 0, 0.03); padding: 15px; border-radius: 8px; border: 1px dashed rgba(28, 7, 0, 0.1); margin-top: 20px; white-space: pre-wrap;">
          ${data.message}
        </div>
      </div>
    `;

    // Queue up an email for every recipient in the contactEmails array
    const emailPromises = contactEmails.map((recipientEmail) => {
      return db.collection("mail").add({
        to: recipientEmail,
        message: {
          subject: `Contact Form: ${data.subject}`,
          html: htmlBody,
        },
      });
    });

    await Promise.all(emailPromises);
  },
);

exports.replyToContactMessage = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Admin login required.");

  const { messageId, replyText } = request.data;
  const msgRef = db.collection("contact_messages").doc(messageId);
  const snap = await msgRef.get();

  if (!snap.exists) throw new HttpsError("not-found", "Message not found.");
  const data = snap.data();

  const htmlBody = `
    <div style="font-family: Arial; padding: 30px; background: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">
      <h2 style="color: #9960a8; margin-top: 0;">Response from Atelier Sinnesküche</h2>
      <p>Hi ${data.name},</p>
      <div style="margin: 20px 0; line-height: 1.6; white-space: pre-wrap;">
        ${replyText}
      </div>
      <hr style="border: none; border-top: 1px dashed rgba(28, 7, 0, 0.1); margin: 30px 0;" />
      <p style="font-size: 12px; opacity: 0.6;">You wrote regarding: "${data.subject}"</p>
      <p style="font-size: 12px; opacity: 0.6; font-style: italic;">"${data.message}"</p>
      <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche Team</p>
    </div>
  `;

  // 1. Send the email
  await db.collection("mail").add({
    to: data.email,
    message: {
      subject: `Re: ${data.subject}`,
      html: htmlBody,
    },
  });

  // 2. Update the message record in Firestore
  await msgRef.update({
    status: "read",
    response: replyText,
    respondedAt: admin.firestore.FieldValue.serverTimestamp(),
    respondedBy: request.auth.token.email,
  });

  return { success: true };
});

exports.replyToRentalRequest = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Admin login required.");

  const { requestId, replyText } = request.data;
  const docRef = db.collection("rent_requests").doc(requestId);
  const snap = await docRef.get();

  if (!snap.exists)
    throw new HttpsError("not-found", "Rental request not found.");
  const data = snap.data();

  const htmlBody = `
    <div style="font-family: Arial; padding: 30px; background: #fffce3; border: 1px solid #caaff3; border-radius: 12px; color: #1c0700;">
      <h2 style="color: #9960a8; margin-top: 0;">Update regarding your Rental Request</h2>
      <p>Hi ${data.name},</p>
      <div style="margin: 20px 0; line-height: 1.6; white-space: pre-wrap;">
        ${replyText}
      </div>
      <hr style="border: none; border-top: 1px dashed rgba(28, 7, 0, 0.1); margin: 30px 0;" />
      <p style="font-size: 12px; opacity: 0.6;">Original Request Date: ${data.date}</p>
      <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche Team</p>
    </div>
  `;

  // 1. Send the email
  await db.collection("mail").add({
    to: data.email,
    message: {
      subject: `Rental Inquiry: Atelier Sinnesküche`,
      html: htmlBody,
    },
  });

  // 2. Update document
  await docRef.update({
    response: replyText,
    respondedAt: admin.firestore.FieldValue.serverTimestamp(),
    respondedBy: request.auth.token.email,
  });

  return { success: true };
});

// ============================================================================
// 8. AVAILABILITY REQUESTS
// ============================================================================

exports.submitAvailabilityRequest = onCall({ cors: true }, async (request) => {
  const { coursePath, selectedDates, guestInfo, currentLang } = request.data;

  try {
    // 1. Gather user info (Logged in user or Guest)
    let userInfo = guestInfo || {};
    let userId = "GUEST_USER";

    if (request.auth) {
      userId = request.auth.uid;
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        userInfo = {
          firstName: uData.firstName || "",
          lastName: uData.lastName || "",
          email: uData.email || "",
          phone: uData.phone || "",
        };
      }
    }

    // 2. Save the request to the "requests" collection
    const requestDoc = {
      coursePath: coursePath || "Unknown Course",
      selectedDates: selectedDates || [],
      guestInfo: userInfo,
      userId: userId,
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      language: currentLang || "en",
    };

    const requestRef = await db.collection("requests").add(requestDoc);

    // 3. Fetch Admin Notification Emails
    const settingsSnap = await db
      .collection("admin_settings")
      .doc("requests")
      .get();
    let adminEmails = [];
    if (settingsSnap.exists) {
      const emailString = settingsSnap.data().emails || "";
      adminEmails = emailString
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
    }

    // 4. Format the Email Content
    const courseName = getCleanCourseKey(coursePath).toUpperCase();

    const datesHtml = selectedDates
      .map((d) => {
        const parts = d.date.split("-");
        const fDate =
          parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : d.date;
        const extras =
          d.selectedAddons && d.selectedAddons.length > 0
            ? `<div style="font-size: 12px; color: #9960a8; margin-top: 4px;"><strong>+ Extras:</strong> ${d.selectedAddons.length} selected</div>`
            : "";
        return `
        <li style="margin-bottom: 15px; list-style: none; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid #caaff3;">
          <strong style="color: #1c0700;">${fDate}</strong> | ${d.time || "Time TBD"}
          ${extras}
        </li>`;
      })
      .join("");

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 12px; color: #1c0700; border: 1px solid #caaff3;">
        <h2 style="color: #4e5f28; margin-top: 0; text-transform: lowercase; font-family: 'Harmond', sans-serif;">new course request</h2>
        <p style="font-size: 16px;">You received a new availability request for <strong>${courseName}</strong>.</p>
        
        <div style="background-color: rgba(202, 175, 243, 0.1); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px dashed #caaff3;">
          <h3 style="font-size: 14px; color: #9960a8; margin-top: 0; text-transform: uppercase; letter-spacing: 1px;">Contact Details</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${userInfo.firstName} ${userInfo.lastName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${userInfo.email}" style="color: #9960a8; text-decoration: none;">${userInfo.email}</a></p>
          ${userInfo.phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${userInfo.phone}</p>` : ""}
        </div>

        <h3 style="font-size: 14px; color: #9960a8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Requested Dates</h3>
        <ul style="padding: 0; margin: 0;">
          ${datesHtml}
        </ul>

        <div style="margin-top: 30px; text-align: center;">
          <a href="https://sinneskueche.ch/admin-sinneskueche?tab=events" style="display: inline-block; padding: 14px 28px; background-color: #9960a8; color: #fffce3; text-decoration: none; border-radius: 100px; font-weight: bold; font-size: 14px;">View in Admin Panel</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; opacity: 0.5; text-align: center;">This is an automated notification from Atelier Sinnesküche.</p>
      </div>
    `;

    // 5. Trigger the Email
    if (adminEmails.length > 0) {
      await db.collection("mail").add({
        to: adminEmails,
        message: {
          subject: `Request: ${courseName}`,
          html: htmlBody,
        },
      });
    }

    return { success: true, requestId: requestRef.id };
  } catch (error) {
    logger.error("Error submitting request:", error);
    throw new HttpsError("internal", "Unable to submit request.");
  }
});
