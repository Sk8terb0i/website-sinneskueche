const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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

// --- EMAIL HTML COMPONENTS ---

const getRegistrationCTA = (lang, email, origin) => {
  if (!origin || !email) return "";
  const regUrl = `${origin}/#/register-guest?email=${encodeURIComponent(email)}`;
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

const sendUserPackEmail = (
  transaction,
  email,
  name,
  courseKey,
  packSize,
  netIncrease,
  lang,
) => {
  if (!email) return;
  const mailRef = db.collection("mail").doc();
  const subject =
    lang === "de"
      ? `Dein Session-Pack: ${courseKey}`
      : `Your Session Pack: ${courseKey}`;
  transaction.set(mailRef, {
    to: email,
    message: {
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
          <h2 style="color: #4e5f28;">${lang === "de" ? "Kauf erfolgreich!" : "Purchase Successful!"}</h2>
          <p>${lang === "de" ? `Hallo ${name},` : `Hi ${name},`}</p>
          <p>${lang === "de" ? `Vielen Dank für den Kauf einer ${packSize}er Karte für <strong>${courseKey}</strong>.` : `Thank you for purchasing a ${packSize}-Session Pack for <strong>${courseKey}</strong>.`}</p>
          <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+${netIncrease} Credits</p>
          </div>
          <p>${lang === "de" ? "Dein Guthaben wurde deinem Profil hinzugefügt." : "Your credits have been added to your profile."}</p>
          <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>
        </div>`,
    },
  });
};

const sendGuestPackCodeEmail = (
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
  const mailRef = db.collection("mail").doc();
  const subject =
    lang === "de" ? `Dein Code für ${courseKey}` : `Your Code for ${courseKey}`;
  transaction.set(mailRef, {
    to: email,
    message: {
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
          <h2 style="color: #4e5f28;">${lang === "de" ? "Vielen Dank für deinen Einkauf!" : "Thank you for your purchase!"}</h2>
          <p>${lang === "de" ? `Hallo ${name},` : `Hi ${name},`}</p>
          <p>${lang === "de" ? `Hier ist dein Code für die ${packSize}er Karte (<strong>${courseKey}</strong>):` : `Here is your code for the ${packSize}-Session Pack (<strong>${courseKey}</strong>):`}</p>
          <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #caaff3;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9960a8; letter-spacing: 4px;">${newCode}</p>
          </div>
          <p>${lang === "de" ? `Du hast noch <strong>${netIncrease} Guthaben</strong> übrig.` : `You have <strong>${netIncrease} credits</strong> remaining.`}</p>
          ${getRegistrationCTA(lang, email, origin)}
          <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>
        </div>`,
    },
  });
};

const sendBookingEmail = (
  transaction,
  email,
  name,
  courseKey,
  dates,
  lang,
  isGuest,
  origin,
) => {
  if (!email || dates.length === 0) return;
  const mailRef = db.collection("mail").doc();
  const subject =
    lang === "de" ? `Bestätigung: ${courseKey}` : `Confirmation: ${courseKey}`;
  const datesHtml = dates
    .map((d) => {
      const fDate = formatDate(d.date);
      const fTime = d.time ? ` | ${d.time}` : "";
      return `
      <li style="margin-bottom: 12px; list-style: none; font-size: 15px;">
        <span style="display: inline-block; font-weight: bold;">${fDate}${fTime}</span> 
        <a href="${getGoogleCalLink(courseKey, d.date)}" target="_blank" style="font-size: 11px; color: #9960a8; text-decoration: none; border: 1px solid #caaff3; padding: 2px 6px; border-radius: 4px; background-color: #fff; margin-left: 10px; vertical-align: middle;">${lang === "de" ? "📅 Zum Kalender" : "📅 Add to Calendar"}</a>
      </li>`;
    })
    .join("");

  transaction.set(mailRef, {
    to: email,
    message: {
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
          <h2 style="color: #4e5f28;">${lang === "de" ? "Buchung bestätigt!" : "Booking Confirmed!"}</h2>
          <p style="font-weight: bold; color: #9960a8;">${lang === "de" ? "Diese E-Mail ist dein Ticket." : "This email is your ticket."}</p>
          <p>${lang === "de" ? `Hallo ${name},` : `Hi ${name},`}</p>
          <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">
            <ul style="margin: 0; padding: 0;">${datesHtml}</ul>
          </div>
          <p><strong>Standort:</strong> Sägestrasse 11, 8952 Schlieren</p>
          ${isGuest ? getRegistrationCTA(lang, email, origin) : ""}
          <br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p>
        </div>`,
    },
  });
};

const sendCancellationEmail = (
  transaction,
  email,
  name,
  courseKey,
  date,
  lang,
  code = null,
  origin,
) => {
  if (!email) return;
  const mailRef = db.collection("mail").doc();
  const subject =
    lang === "de"
      ? `Termin abgesagt: ${courseKey}`
      : `Session Cancelled: ${courseKey}`;
  let htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
      <h2 style="color: #ff4d4d;">${lang === "de" ? "Termin wurde abgesagt" : "Session Cancelled"}</h2>
      <p>${lang === "de" ? `Hallo ${name},` : `Hi ${name},`}</p>
      <p>${lang === "de" ? `Der Termin für <strong>${courseKey}</strong> am <strong>${formatDate(date)}</strong> wurde abgesagt.` : `The session for <strong>${courseKey}</strong> on <strong>${formatDate(date)}</strong> has been cancelled.`}</p>`;
  if (code) {
    htmlContent += `<div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;"><p>${code}</p></div>`;
  }
  htmlContent += `<br/><p>Herzliche Grüße,<br/>Atelier Sinnesküche</p></div>`;
  transaction.set(mailRef, {
    to: email,
    message: { subject, html: htmlContent },
  });
};

// ============================================================================
// 1. STRIPE CHECKOUT
// ============================================================================
exports.createStripeCheckout = onCall(
  { cors: true, secrets: ["STRIPE_SECRET_KEY"] },
  async (request) => {
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
    } = request.data;
    const userId = request.auth ? request.auth.uid : "GUEST_USER";
    const userEmail = request.auth
      ? request.auth.token.email
      : guestInfo?.email;
    const origin =
      request.rawRequest.headers.origin || "https://sinneskueche.ch";

    if (!request.auth && !guestInfo)
      throw new HttpsError("unauthenticated", "Login required.");

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
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
        },
      });
      return { url: session.url };
    } catch (error) {
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
          } = session.metadata;
          const parsedDates = JSON.parse(selectedDates);
          const courseKey = getCleanCourseKey(coursePath);
          const lang = currentLang || "en";
          const email = session.customer_details.email;
          const isGuest = userId === "GUEST_USER";

          let finalName = guestName;
          if (!isGuest) {
            const userSnap = await transaction.get(
              db.collection("users").doc(userId),
            );
            if (userSnap.exists)
              finalName = userSnap.data().firstName || guestName;
          }

          if (mode === "pack") {
            const netIncrease = Math.max(
              0,
              parseInt(packSize) - parsedDates.length,
            );
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
              sendUserPackEmail(
                transaction,
                email,
                finalName,
                courseKey,
                packSize,
                netIncrease,
                lang,
              );
            } else if (netIncrease > 0) {
              const newCode = generatePackCode();
              transaction.set(db.collection("pack_codes").doc(newCode), {
                code: newCode,
                courseKey,
                remainingCredits: netIncrease,
                buyerEmail: email,
                buyerName: guestName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              sendGuestPackCodeEmail(
                transaction,
                email,
                guestName,
                courseKey,
                packSize,
                netIncrease,
                newCode,
                lang,
                origin,
              );
            }
          }

          parsedDates.forEach((d) => {
            transaction.set(db.collection("bookings").doc(), {
              userId,
              guestName: isGuest ? guestName : null,
              guestEmail: isGuest ? email : null,
              eventId: d.id,
              date: d.date,
              coursePath,
              status: "confirmed",
              lang,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          if (parsedDates.length > 0) {
            sendBookingEmail(
              transaction,
              email,
              finalName,
              courseKey,
              parsedDates,
              lang,
              isGuest,
              origin,
            );
          }
          transaction.set(paymentCheckRef, {
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            userId,
          });
        });
      } catch (e) {
        console.error("Webhook Error", e);
      }
    }
    res.json({ received: true });
  },
);

// ============================================================================
// 3. BOOK WITH CREDITS
// ============================================================================
exports.bookWithCredits = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  const { coursePath, selectedDates, currentLang } = request.data;
  const courseKey = getCleanCourseKey(coursePath);
  const userRef = db.collection("users").doc(request.auth.uid);
  const email = request.auth.token.email;

  return db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const firstName = userSnap.data()?.firstName || "Customer";
    transaction.update(userRef, {
      [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(
        -selectedDates.length,
      ),
    });
    selectedDates.forEach((d) => {
      transaction.set(db.collection("bookings").doc(), {
        userId: request.auth.uid,
        eventId: d.id,
        date: d.date,
        coursePath,
        status: "confirmed",
        lang: currentLang || "en",
        type: "credit_redemption",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    sendBookingEmail(
      transaction,
      email,
      firstName,
      courseKey,
      selectedDates,
      currentLang || "en",
      false,
      null,
    );
    return { success: true };
  });
});

// ============================================================================
// 4. AUTOMATED COURSE REMINDERS (Daily at 08:00)
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
        isFirstTimer = true; // Guest is default First-Timer
      }

      const lang = booking.lang || "en";
      const template = config[lang] || config["en"];

      let courseTime = "";
      const evSnap = await db.collection("events").doc(booking.eventId).get();
      if (evSnap.exists) courseTime = evSnap.data().time || "";

      const replacements = {
        "{userName}": name,
        "{courseName}": getCleanCourseKey(booking.coursePath),
        "{courseDate}": formatDate(booking.date),
        "{courseTime}": courseTime,
      };
      let subject = template.subject;
      let body = template.text;
      Object.keys(replacements).forEach((k) => {
        subject = subject.split(k).join(replacements[k]);
        body = body.split(k).join(replacements[k]);
      });

      if (isFirstTimer && template.firstTimerText)
        body += "\n\n" + template.firstTimerText;

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
// 5. RENTAL REQUEST TRIGGER
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
        html: `<div style="font-family: Arial; padding: 20px; background: #fffce3; border: 1px solid #caaff3; border-radius: 12px;">
        <h2>New Rental Request</h2>
        <p><strong>From:</strong> ${data.name}</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Message:</strong><br/>${data.message}</p>
      </div>`,
      },
    });
  },
);

// ============================================================================
// 6. ADMIN & USER ACTIONS (Cancel, Redeem, etc.)
// ============================================================================
exports.redeemPackCode = onCall({ cors: true }, async (request) => {
  const { coursePath, selectedDates, packCode, guestInfo, currentLang } =
    request.data;
  const courseKey = getCleanCourseKey(coursePath);
  const codeRef = db.collection("pack_codes").doc(packCode);
  return db.runTransaction(async (t) => {
    const snap = await t.get(codeRef);
    if (!snap.exists) throw new HttpsError("not-found", "Invalid code.");
    t.update(codeRef, {
      remainingCredits: admin.firestore.FieldValue.increment(
        -selectedDates.length,
      ),
    });
    selectedDates.forEach((d) => {
      t.set(db.collection("bookings").doc(), {
        userId: "GUEST_USER",
        guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
        guestEmail: guestInfo.email,
        eventId: d.id,
        date: d.date,
        coursePath,
        status: "confirmed",
        lang: currentLang || "en",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    sendBookingEmail(
      t,
      guestInfo.email,
      guestInfo.firstName,
      courseKey,
      selectedDates,
      currentLang || "en",
      true,
      "https://sinneskueche.ch",
    );
    return { success: true };
  });
});

exports.cancelBooking = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
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
    t.delete(bRef);
    return { success: true };
  });
});

// 7. ADMIN CANCEL EVENT (Refunds everyone)
exports.adminCancelEvent = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  const { eventId, currentLang } = request.data;
  const lang = currentLang || "en";
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found");

  const eventData = eventSnap.data();
  const courseKey = getCleanCourseKey(eventData.link || "");
  const bookingsSnap = await db
    .collection("bookings")
    .where("eventId", "==", eventId)
    .get();

  return await db.runTransaction(async (transaction) => {
    for (const bDoc of bookingsSnap.docs) {
      const bData = bDoc.data();
      if (bData.userId === "GUEST_USER") {
        const newCode = generatePackCode();
        transaction.set(db.collection("pack_codes").doc(newCode), {
          code: newCode,
          courseKey,
          remainingCredits: 1,
          buyerEmail: bData.guestEmail,
          buyerName: bData.guestName,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        sendCancellationEmail(
          transaction,
          bData.guestEmail,
          bData.guestName,
          courseKey,
          eventData.date,
          lang,
          newCode,
          null,
        );
      } else {
        const userRef = db.collection("users").doc(bData.userId);
        transaction.update(userRef, {
          [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(1),
        });
        sendCancellationEmail(
          transaction,
          bData.guestEmail || "Customer",
          "Customer",
          courseKey,
          eventData.date,
          lang,
          null,
          null,
        );
      }
      transaction.delete(bDoc.ref);
    }
    transaction.delete(eventRef);
    return { success: true };
  });
});
