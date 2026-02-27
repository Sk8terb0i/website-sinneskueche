const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY || "placeholder_key_for_analysis",
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

// --- RESTORED EMAIL HELPERS ---

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

  transaction.set(mailRef, {
    to: email,
    message: {
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1c0700; max-width: 600px; margin: 0 auto; background-color: #fffce3; padding: 30px; border-radius: 8px;">
          <h2 style="color: #4e5f28;">${lang === "de" ? "Kauf erfolgreich!" : "Purchase Successful!"}</h2>
          <p style="font-size: 16px;">${lang === "de" ? `Hallo ${name || "Kunde"},` : `Hi ${name || "Customer"},`}</p>
          <p style="font-size: 16px;">${lang === "de" ? `Vielen Dank für den Kauf einer ${packSize}er Karte für <strong>${courseKey}</strong>.` : `Thank you for purchasing a ${packSize}-Session Pack for <strong>${courseKey}</strong>.`}</p>
          <div style="background-color: rgba(78, 95, 40, 0.1); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #4e5f28;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4e5f28;">+${netIncrease}</p>
          </div>
          <p style="font-size: 16px;">${lang === "de" ? "Herzliche Grüße,<br/>Atelier Sinnesküche" : "Warm regards,<br/>Atelier Sinnesküche"}</p>
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
  const calText =
    lang === "de" ? "📅 Zum Kalender hinzufügen" : "📅 Add to Calendar";

  const datesHtml = dates
    .map((d) => {
      const fDate = formatDate(d.date);
      const calLink = getGoogleCalLink(courseKey, d.date);
      return `
      <li style="margin-bottom: 12px; list-style: none;">
        <span style="display: inline-block; width: 90px; font-weight: bold;">${fDate}</span> 
        <a href="${calLink}" target="_blank" style="font-size: 12px; color: #9960a8; text-decoration: none; border: 1px solid #caaff3; padding: 4px 8px; border-radius: 4px; background-color: #fff;">${calText}</a>
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
          <p>${lang === "de" ? `Hallo ${name || "Gast"},` : `Hi ${name || "Guest"},`}</p>
          <div style="background-color: rgba(202, 175, 243, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #caaff3;">
            <ul style="margin: 0; padding: 0;">${datesHtml}</ul>
          </div>
          <p>${lang === "de" ? "Herzliche Grüße,<br/>Atelier Sinnesküche" : "Warm regards,<br/>Atelier Sinnesküche"}</p>
        </div>
      `,
    },
  });
};

// ============================================================================
// 1. CREATE CHECKOUT SESSION
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
            if (userSnap.exists)
              finalName = userSnap.data().firstName || guestName;
          }

          // Handle Credits for Pack Purchases
          if (mode === "pack") {
            const netIncrease = parseInt(packSize) - parsedDates.length;
            if (userId !== "GUEST_USER") {
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
              // (You could also trigger a guest-specific pack code email here)
            }
          }

          // Handle Bookings
          parsedDates.forEach((d) => {
            transaction.set(db.collection("bookings").doc(), {
              userId,
              guestName: userId === "GUEST_USER" ? guestName : null,
              guestEmail: userId === "GUEST_USER" ? email : null,
              eventId: d.id,
              date: d.date,
              coursePath,
              status: "confirmed",
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          // Trigger Booking Confirmation
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
        console.error("Webhook Transaction Error", e);
      }
    }
    res.json({ received: true });
  },
);

// (Remaining bookWithCredits, redeemPackCode, cancelBooking, adminCancelEvent functions stay same but ensure they call sendBookingEmail)
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
    );
    return { success: true };
  });
});

exports.redeemPackCode = onCall({ cors: true }, async (request) => {
  const { coursePath, selectedDates, packCode, guestInfo, currentLang } =
    request.data;
  const courseKey = getCleanCourseKey(coursePath);
  const codeRef = db.collection("pack_codes").doc(packCode);

  return db.runTransaction(async (transaction) => {
    const codeSnap = await transaction.get(codeRef);
    if (!codeSnap.exists) throw new HttpsError("not-found", "Invalid code.");
    transaction.update(codeRef, {
      remainingCredits: admin.firestore.FieldValue.increment(
        -selectedDates.length,
      ),
    });
    selectedDates.forEach((d) => {
      transaction.set(db.collection("bookings").doc(), {
        userId: "GUEST_USER",
        guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
        guestEmail: guestInfo.email,
        eventId: d.id,
        date: d.date,
        coursePath,
        status: "confirmed",
        type: "code_redemption",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    sendBookingEmail(
      transaction,
      guestInfo.email,
      guestInfo.firstName,
      courseKey,
      selectedDates,
      currentLang || "en",
    );
    return {
      success: true,
      remainingCredits: codeSnap.data().remainingCredits - selectedDates.length,
    };
  });
});

exports.cancelBooking = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  const { bookingId } = request.data;
  const bRef = db.collection("bookings").doc(bookingId);
  return db.runTransaction(async (transaction) => {
    const bSnap = await transaction.get(bRef);
    if (!bSnap.exists || bSnap.data().userId !== request.auth.uid)
      throw new HttpsError("permission-denied", "Unauthorized.");
    const courseKey = getCleanCourseKey(bSnap.data().coursePath);
    transaction.update(db.collection("users").doc(request.auth.uid), {
      [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(1),
    });
    transaction.delete(bRef);
    return { success: true };
  });
});

exports.adminCancelEvent = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  const { eventId } = request.data;
  const bookingsSnap = await db
    .collection("bookings")
    .where("eventId", "==", eventId)
    .get();
  const batch = db.batch();
  bookingsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.userId !== "GUEST_USER") {
      const courseKey = getCleanCourseKey(data.coursePath);
      batch.set(
        db.collection("users").doc(data.userId),
        { credits: { [courseKey]: admin.firestore.FieldValue.increment(1) } },
        { merge: true },
      );
    }
    batch.delete(doc.ref);
  });
  batch.delete(db.collection("events").doc(eventId));
  await batch.commit();
  return { success: true };
});
