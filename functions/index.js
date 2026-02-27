const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const stripe = require("stripe")(
  "sk_test_51T56CkRrxXqwePSlKMOY9SYIkKC54aGlygB25R9xZ8NP1j7uQZ15aLf89SLTUc0uptjAGRfObfDqzym5cNsUZCrC004IrGlMUp",
);

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

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

const generatePackCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// --- NEW HELPER: Date Formatter (DD.MM.YYYY) ---
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateStr;
};

// --- NEW HELPER: Google Calendar Link Generator ---
const getGoogleCalLink = (title, dateStr) => {
  if (!dateStr) return "#";
  const start = dateStr.replace(/-/g, "");
  // Google all-day events require the end date to be the day AFTER the event
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  const end = d.toISOString().split("T")[0].replace(/-/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Atelier Sinnesküche: " + title,
  )}&dates=${start}/${end}`;
};

// --- EMAIL TEMPLATE HELPERS ---

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
      ? "Dein Session-Pack - Atelier Sinnesküche"
      : "Your Session Pack - Atelier Sinnesküche";
  const greeting =
    lang === "de" ? `Hallo ${name || "Kunde"},` : `Hi ${name || "Customer"},`;
  const body1 =
    lang === "de"
      ? `Vielen Dank für den Kauf einer ${packSize}er Karte für <strong>${courseKey}</strong>.`
      : `Thank you for purchasing a ${packSize}-Session Pack for <strong>${courseKey}</strong>.`;
  const addedLabel =
    lang === "de"
      ? "Dem Profil hinzugefügtes Guthaben:"
      : "Credits Added to Profile:";
  const body2 =
    lang === "de"
      ? "Dieses Guthaben ist nun in deinem Konto gespeichert. Du kannst dich jederzeit einloggen, um zukünftige Termine ganz einfach zu buchen, ohne erneut zur Kasse zu gehen."
      : "These credits are now saved to your account. You can log in anytime to easily book future sessions without checking out again.";
  const signOff =
    lang === "de"
      ? "Herzliche Grüße,<br/>Atelier Sinnesküche"
      : "Warm regards,<br/>Atelier Sinnesküche";

  transaction.set(mailRef, {
    to: email,
    message: {
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
          <h2 style="color: #4e5f28;">${lang === "de" ? "Kauf erfolgreich!" : "Purchase Successful!"}</h2>
          <p style="font-size: 16px;">${greeting}</p>
          <p style="font-size: 16px;">${body1}</p>
          <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">${addedLabel}</p>
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+${netIncrease}</p>
          </div>
          <p style="font-size: 16px; line-height: 1.5;">${body2}</p>
          <br/>
          <p style="font-size: 16px;">${signOff}</p>
        </div>
      `,
    },
  });
};

const sendBookingEmail = (transaction, email, name, courseKey, dates, lang) => {
  if (!email || dates.length === 0) return;
  const mailRef = db.collection("mail").doc();
  const subject =
    lang === "de"
      ? "Buchungsbestätigung - Atelier Sinnesküche"
      : "Booking Confirmation - Atelier Sinnesküche";
  const greeting =
    lang === "de" ? `Hallo ${name || "Gast"},` : `Hi ${name || "Guest"},`;
  const body1 =
    lang === "de"
      ? `Alles ist bereit für <strong>${courseKey}</strong>! Hier sind deine gebuchten Termine:`
      : `You are all set for <strong>${courseKey}</strong>! Here are your booked dates:`;
  const body2 =
    lang === "de"
      ? "Wir freuen uns darauf, dich im Studio zu sehen!"
      : "We look forward to seeing you in the studio!";
  const signOff =
    lang === "de"
      ? "Herzliche Grüße,<br/>Atelier Sinnesküche"
      : "Warm regards,<br/>Atelier Sinnesküche";

  const calText =
    lang === "de" ? "📅 Zum Kalender hinzufügen" : "📅 Add to Calendar";

  // CHANGED: Format the dates and add the calendar link
  const datesHtml = dates
    .map((d) => {
      const fDate = formatDate(d.date);
      const calLink = getGoogleCalLink(courseKey, d.date);
      return `
        <li style="margin-bottom: 12px; display: flex; align-items: center;">
          <span style="display: inline-block; width: 90px;">${fDate}</span> 
          <a href="${calLink}" target="_blank" style="font-size: 12px; color: #9960a8; text-decoration: none; border: 1px solid #caaff3; padding: 4px 8px; border-radius: 4px; margin-left: 10px; background-color: #fff;">
            ${calText}
          </a>
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
          <p style="font-size: 16px;">${greeting}</p>
          <p style="font-size: 16px;">${body1}</p>
          <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">
            <ul style="margin: 0; padding-left: 20px; font-size: 16px; font-weight: bold; color: #1c0700;">
              ${datesHtml}
            </ul>
          </div>
          <p style="font-size: 16px; line-height: 1.5;">${body2}</p>
          <br/>
          <p style="font-size: 16px;">${signOff}</p>
        </div>
      `,
    },
  });
};

// ============================================================================
// 1. CREATE CHECKOUT SESSION
// ============================================================================
exports.createStripeCheckout = onCall({ cors: true }, async (request) => {
  const {
    mode,
    packPrice,
    totalPrice,
    packSize,
    selectedDates,
    coursePath,
    guestInfo,
    currentLang,
    successUrl, // NEW: Passed from frontend
    cancelUrl, // NEW: Passed from frontend
  } = request.data;

  const userId = request.auth ? request.auth.uid : "GUEST_USER";
  const userEmail = request.auth ? request.auth.token.email : guestInfo?.email;

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
                  ? `${packSize}-Session Pack`
                  : "Individual Sessions",
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
      // CHANGED: Using dynamic URLs from the request
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        guestName: guestInfo
          ? `${guestInfo.firstName} ${guestInfo.lastName}`
          : "N/A",
        mode: mode,
        packSize: packSize || 0,
        coursePath: coursePath || "unknown",
        selectedDates: JSON.stringify(selectedDates),
        currentLang: currentLang || "en",
      },
    });
    return { url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// 2. STRIPE WEBHOOK
// ============================================================================
exports.handleStripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = "whsec_a4VdBked9dzdHfSFPGG7iyOdkujKsZEW";
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const paymentCheckRef = db.collection("processed_payments").doc(session.id);

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
        } = session.metadata;
        const parsedDates = JSON.parse(selectedDates);
        const courseKey = getCleanCourseKey(coursePath);
        const lang = currentLang || "en";
        const email = session.customer_details.email;

        let finalName = guestName;
        if (userId !== "GUEST_USER") {
          const userSnap = await transaction.get(
            db.collection("users").doc(userId),
          );
          if (userSnap.exists && userSnap.data().firstName) {
            finalName = userSnap.data().firstName;
          }
        }

        if (mode === "pack") {
          const packAmount = parseInt(packSize);
          const netIncrease = packAmount - parsedDates.length;

          if (userId !== "GUEST_USER") {
            const userRef = db.collection("users").doc(userId);
            transaction.set(
              userRef,
              {
                credits: {
                  [courseKey]:
                    admin.firestore.FieldValue.increment(netIncrease),
                },
              },
              { merge: true },
            );

            if (netIncrease > 0) {
              sendUserPackEmail(
                transaction,
                email,
                finalName,
                courseKey,
                packSize,
                netIncrease,
                lang,
              );
            }
          } else if (netIncrease > 0) {
            const newCode = generatePackCode();
            const codeRef = db.collection("pack_codes").doc(newCode);
            transaction.set(codeRef, {
              code: newCode,
              courseKey: courseKey,
              remainingCredits: netIncrease,
              buyerEmail: email || null,
              buyerName: guestName,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            if (email) {
              const mailRef = db.collection("mail").doc();
              const subject =
                lang === "de"
                  ? "Dein Session-Pack-Code - Atelier Sinnesküche"
                  : "Your Session Pack Code - Atelier Sinnesküche";
              const greeting =
                lang === "de"
                  ? `Vielen Dank für deinen Einkauf, ${guestName || "Gast"}!`
                  : `Thank you for your purchase, ${guestName || "Guest"}!`;
              const body1 =
                lang === "de"
                  ? `Du hast erfolgreich eine ${packSize}er Karte für <strong>${courseKey}</strong> gekauft.`
                  : `You have successfully purchased a ${packSize}-Session Pack for <strong>${courseKey}</strong>.`;
              const codeLabel =
                lang === "de"
                  ? "Dein Einlösungscode:"
                  : "Your Redemption Code:";
              const body2 =
                lang === "de"
                  ? `Du hast noch <strong>${netIncrease} Guthaben</strong> übrig. Du kannst diesen Code beim Checkout eingeben, um zukünftige Termine zu buchen, ohne erneut bezahlen zu müssen.`
                  : `You have <strong>${netIncrease} credits</strong> remaining. You can enter this code at checkout to book your future sessions without needing to pay again.`;
              const tip =
                lang === "de"
                  ? `Tipp: Wenn du dich später entscheidest, ein Konto zu registrieren, kannst du diesen Code verwenden, um dein Guthaben dauerhaft in deinem Profil zu speichern!`
                  : `Tip: If you decide to register an account later, you can use this code to permanently save your credits to your profile!`;

              transaction.set(mailRef, {
                to: email,
                message: {
                  subject: subject,
                  html: `
                    <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
                      <h2 style="color: #4e5f28;">${greeting}</h2>
                      <p style="font-size: 16px;">${body1}</p>
                      <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #caaff3;">
                        <p style="margin: 0 0 10px 0; font-size: 14px;">${codeLabel}</p>
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9960a8; letter-spacing: 4px;">${newCode}</p>
                      </div>
                      <p style="font-size: 16px; line-height: 1.5;">${body2}</p>
                      <p style="font-size: 14px; opacity: 0.8; font-style: italic; margin-top: 30px; border-top: 1px solid rgba(28,7,0,0.1); padding-top: 15px;">${tip}</p>
                      <br/>
                      <p style="font-size: 16px;">${lang === "de" ? "Herzliche Grüße,<br/>Atelier Sinnesküche" : "Warm regards,<br/>Atelier Sinnesküche"}</p>
                    </div>
                  `,
                },
              });
            }
          }
        }

        parsedDates.forEach((sessionDate) => {
          const bRef = db.collection("bookings").doc();
          transaction.set(bRef, {
            userId,
            guestName: userId === "GUEST_USER" ? guestName : null,
            guestEmail: userId === "GUEST_USER" ? email : null,
            eventId: sessionDate.id,
            date: sessionDate.date,
            coursePath,
            status: "confirmed",
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
});

// ============================================================================
// 3. BOOK WITH CREDITS
// ============================================================================
exports.bookWithCredits = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const { coursePath, selectedDates, currentLang } = request.data;
  const lang = currentLang || "en";
  const courseKey = getCleanCourseKey(coursePath);
  const userRef = db.collection("users").doc(request.auth.uid);
  const email = request.auth.token.email;

  return db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const currentCredits = userSnap.data()?.credits?.[courseKey] || 0;
    const firstName = userSnap.data()?.firstName || "Customer";

    if (currentCredits < selectedDates.length)
      throw new HttpsError("failed-precondition", "Insufficient credits.");

    transaction.update(userRef, {
      [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(
        -selectedDates.length,
      ),
    });

    selectedDates.forEach((d) => {
      const bRef = db.collection("bookings").doc();
      transaction.set(bRef, {
        userId: request.auth.uid,
        eventId: d.id,
        date: d.date,
        coursePath: coursePath,
        status: "confirmed",
        type: "credit_redemption",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (selectedDates.length > 0) {
      sendBookingEmail(
        transaction,
        email,
        firstName,
        courseKey,
        selectedDates,
        lang,
      );
    }

    return { success: true };
  });
});

// ============================================================================
// 4. REDEEM PACK CODE (GUEST USERS)
// ============================================================================
exports.redeemPackCode = onCall({ cors: true }, async (request) => {
  const { coursePath, selectedDates, packCode, guestInfo, currentLang } =
    request.data;
  const lang = currentLang || "en";

  if (!packCode)
    throw new HttpsError("invalid-argument", "Pack code is required.");
  if (!guestInfo || !guestInfo.email || !guestInfo.firstName)
    throw new HttpsError("invalid-argument", "Guest details required.");

  const courseKey = getCleanCourseKey(coursePath);
  const codeRef = db.collection("pack_codes").doc(packCode);

  return db.runTransaction(async (transaction) => {
    const codeSnap = await transaction.get(codeRef);
    if (!codeSnap.exists)
      throw new HttpsError("not-found", "Invalid pack code.");

    const codeData = codeSnap.data();
    if (codeData.courseKey !== courseKey)
      throw new HttpsError(
        "invalid-argument",
        "Code not valid for this course type.",
      );
    if (codeData.remainingCredits < selectedDates.length)
      throw new HttpsError("failed-precondition", "Insufficient credits.");

    transaction.update(codeRef, {
      remainingCredits: admin.firestore.FieldValue.increment(
        -selectedDates.length,
      ),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    selectedDates.forEach((d) => {
      const bRef = db.collection("bookings").doc();
      transaction.set(bRef, {
        userId: "GUEST_USER",
        guestName: `${guestInfo.firstName} ${guestInfo.lastName}`.trim(),
        guestEmail: guestInfo.email,
        eventId: d.id,
        date: d.date,
        coursePath: coursePath,
        status: "confirmed",
        type: "code_redemption",
        packCodeUsed: packCode,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (selectedDates.length > 0) {
      sendBookingEmail(
        transaction,
        guestInfo.email,
        guestInfo.firstName,
        courseKey,
        selectedDates,
        lang,
      );
    }

    return {
      success: true,
      remainingCredits: codeData.remainingCredits - selectedDates.length,
    };
  });
});

// ============================================================================
// 5. CANCEL BOOKING & REFUND CREDITS
// ============================================================================
exports.cancelBooking = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  const { bookingId } = request.data;
  const bRef = db.collection("bookings").doc(bookingId);

  try {
    return await db.runTransaction(async (transaction) => {
      const bSnap = await transaction.get(bRef);
      if (!bSnap.exists)
        throw new HttpsError("not-found", "Booking not found.");

      const bookingData = bSnap.data();
      if (bookingData.userId !== request.auth.uid)
        throw new HttpsError("permission-denied", "Unauthorized.");

      const bookingDate = new Date(bookingData.date);
      const diffDays = (bookingDate - new Date()) / (1000 * 60 * 60 * 24);
      if (diffDays < 4)
        throw new HttpsError("failed-precondition", "Too late to cancel.");

      const courseKey = getCleanCourseKey(bookingData.coursePath || "/pottery");
      const userRef = db.collection("users").doc(request.auth.uid);

      transaction.update(userRef, {
        [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(1),
      });
      transaction.delete(bRef);
      return { success: true };
    });
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// 6. ADMIN EVENT CANCELLATION
// ============================================================================
exports.adminCancelEvent = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");

  const { eventId, currentLang } = request.data;
  const lang = currentLang || "en";

  const eventRef = db.collection("events").doc(eventId);
  const batch = db.batch();

  try {
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found");

    const eventData = eventSnap.data();
    const courseKey = getCleanCourseKey(
      eventData.link || eventData.coursePath || "",
    );
    const eventTitle = eventData.title?.[lang] || courseKey;

    // CHANGED: Format the cancellation date
    const eventDate = eventData.date;
    const formattedEventDate = formatDate(eventDate);

    const bookingsSnap = await db
      .collection("bookings")
      .where("eventId", "==", eventId)
      .get();

    for (const bDoc of bookingsSnap.docs) {
      const bData = bDoc.data();

      if (bData.userId === "GUEST_USER" && bData.guestEmail) {
        const newCode = generatePackCode();
        const codeRef = db.collection("pack_codes").doc(newCode);
        batch.set(codeRef, {
          code: newCode,
          courseKey: courseKey,
          remainingCredits: 1,
          buyerEmail: bData.guestEmail,
          buyerName: bData.guestName || "Guest",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const mailRef = db.collection("mail").doc();
        batch.set(mailRef, {
          to: bData.guestEmail,
          message: {
            subject:
              lang === "de"
                ? "Terminabsage - Atelier Sinnesküche"
                : "Event Cancellation - Atelier Sinnesküche",
            html: `
                <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
                  <h2 style="color: #ff4d4d;">${lang === "de" ? "Termin wurde abgesagt" : "Event Cancelled"}</h2>
                  <p>${lang === "de" ? `Hallo ${bData.guestName || "Gast"},` : `Hi ${bData.guestName || "Guest"},`}</p>
                  <p>${lang === "de" ? `Leider müssen wir den Termin für <strong>${eventTitle}</strong> am <strong>${formattedEventDate}</strong> absagen.` : `Unfortunately, we have to cancel the session for <strong>${eventTitle}</strong> on <strong>${formattedEventDate}</strong>.`}</p>
                  
                  <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #caaff3;">
                    <p style="margin: 0 0 10px 0; font-size: 14px;">${lang === "de" ? "Hier ist dein Ersatz-Code, um einen neuen Termin zu buchen:" : "Here is your replacement code to book a new date:"}</p>
                    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9960a8; letter-spacing: 4px;">${newCode}</p>
                  </div>
                  <br/>
                  <p>${lang === "de" ? "Herzliche Grüße,<br/>Atelier Sinnesküche" : "Warm regards,<br/>Atelier Sinnesküche"}</p>
                </div>
              `,
          },
        });
      } else if (bData.userId !== "GUEST_USER") {
        const userRef = db.collection("users").doc(bData.userId);
        batch.set(
          userRef,
          {
            credits: { [courseKey]: admin.firestore.FieldValue.increment(1) },
          },
          { merge: true },
        );

        const userSnap = await userRef.get();
        if (userSnap.exists && userSnap.data().email) {
          const uData = userSnap.data();
          const mailRef = db.collection("mail").doc();
          batch.set(mailRef, {
            to: uData.email,
            message: {
              subject:
                lang === "de"
                  ? "Terminabsage - Atelier Sinnesküche"
                  : "Event Cancellation - Atelier Sinnesküche",
              html: `
                    <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
                      <h2 style="color: #ff4d4d;">${lang === "de" ? "Termin wurde abgesagt" : "Event Cancelled"}</h2>
                      <p>${lang === "de" ? `Hallo ${uData.firstName || "Kunde"},` : `Hi ${uData.firstName || "Customer"},`}</p>
                      <p>${lang === "de" ? `Leider müssen wir den Termin für <strong>${eventTitle}</strong> am <strong>${formattedEventDate}</strong> absagen.` : `Unfortunately, we have to cancel the session for <strong>${eventTitle}</strong> on <strong>${formattedEventDate}</strong>.`}</p>
                      
                      <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">
                        <p style="margin: 0 0 10px 0; font-size: 14px;">${lang === "de" ? "Dein Konto wurde automatisch mit 1 Termin gutgeschrieben." : "Your account has been automatically credited with 1 session."}</p>
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+1</p>
                      </div>
                      
                      <p>${lang === "de" ? "Du kannst dich jederzeit einloggen, um diesen Gutschein für einen neuen Termin zu nutzen." : "You can log in at any time to use this credit to book a new date."}</p>
                      <br/>
                      <p>${lang === "de" ? "Herzliche Grüße,<br/>Atelier Sinnesküche" : "Warm regards,<br/>Atelier Sinnesküche"}</p>
                    </div>
                  `,
            },
          });
        }
      }

      batch.delete(bDoc.ref);
    }

    batch.delete(eventRef);
    await batch.commit();
    return { success: true };
  } catch (error) {
    throw new HttpsError(
      "internal",
      "Failed to cancel event: " + error.message,
    );
  }
});
