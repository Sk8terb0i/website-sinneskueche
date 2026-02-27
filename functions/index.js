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

// Helper to generate a random 8-character pack code for guests
const generatePackCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
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
    currentLang, // <--- Receive language from frontend
  } = request.data;

  const userId = request.auth ? request.auth.uid : "GUEST_USER";
  const userEmail = request.auth ? request.auth.token.email : guestInfo?.email;

  if (!request.auth && !guestInfo) {
    throw new HttpsError(
      "unauthenticated",
      "Login required or Guest Info missing.",
    );
  }

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
      success_url:
        "http://localhost:5173/#/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:5173/#/cancel",
      metadata: {
        userId: userId,
        guestName: guestInfo
          ? `${guestInfo.firstName} ${guestInfo.lastName}`
          : "N/A",
        mode: mode,
        packSize: packSize || 0,
        coursePath: coursePath || "unknown",
        selectedDates: JSON.stringify(selectedDates),
        currentLang: currentLang || "en", // <--- Save language to Stripe metadata
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
        const lang = currentLang || "en"; // Default to English if missing

        if (mode === "pack") {
          const packAmount = parseInt(packSize);
          const deduction = parsedDates.length;
          const netIncrease = packAmount - deduction;

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
          } else if (netIncrease > 0) {
            // Guest User: Generate a code
            const newCode = generatePackCode();
            const codeRef = db.collection("pack_codes").doc(newCode);

            transaction.set(codeRef, {
              code: newCode,
              courseKey: courseKey,
              remainingCredits: netIncrease,
              buyerEmail: session.customer_details.email || null,
              buyerName: guestName,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Write to the "mail" collection to trigger the email extension
            if (session.customer_details.email) {
              const mailRef = db.collection("mail").doc();

              // Bilingual content
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

              const signOff =
                lang === "de"
                  ? "Herzliche Grüße,<br/>Atelier Sinnesküche"
                  : "Warm regards,<br/>Atelier Sinnesküche";

              transaction.set(mailRef, {
                to: session.customer_details.email,
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
                      
                      <p style="font-size: 14px; opacity: 0.8; font-style: italic; margin-top: 30px; border-top: 1px solid rgba(28,7,0,0.1); padding-top: 15px;">
                        ${tip}
                      </p>
                      <br/>
                      <p style="font-size: 16px;">${signOff}</p>
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
            guestEmail:
              userId === "GUEST_USER" ? session.customer_details.email : null,
            eventId: sessionDate.id,
            date: sessionDate.date,
            coursePath,
            status: "confirmed",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

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

  const { coursePath, selectedDates } = request.data;
  const courseKey = getCleanCourseKey(coursePath);
  const userRef = db.collection("users").doc(request.auth.uid);

  return db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const currentCredits = userSnap.data()?.credits?.[courseKey] || 0;

    if (currentCredits < selectedDates.length) {
      throw new HttpsError("failed-precondition", "Insufficient credits.");
    }

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
    return { success: true };
  });
});

// ============================================================================
// 4. REDEEM PACK CODE (GUEST USERS)
// ============================================================================
exports.redeemPackCode = onCall({ cors: true }, async (request) => {
  const { coursePath, selectedDates, packCode, guestInfo } = request.data;

  if (!packCode)
    throw new HttpsError("invalid-argument", "Pack code is required.");
  if (!guestInfo || !guestInfo.email || !guestInfo.firstName) {
    throw new HttpsError(
      "invalid-argument",
      "Guest details are required to redeem a code.",
    );
  }

  const courseKey = getCleanCourseKey(coursePath);
  const codeRef = db.collection("pack_codes").doc(packCode);

  return db.runTransaction(async (transaction) => {
    const codeSnap = await transaction.get(codeRef);

    if (!codeSnap.exists) {
      throw new HttpsError("not-found", "Invalid pack code.");
    }

    const codeData = codeSnap.data();

    if (codeData.courseKey !== courseKey) {
      throw new HttpsError(
        "invalid-argument",
        "This code is not valid for this course type.",
      );
    }

    if (codeData.remainingCredits < selectedDates.length) {
      throw new HttpsError(
        "failed-precondition",
        "Insufficient credits remaining on this code.",
      );
    }

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

    return { success: true };
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
      if (bookingData.userId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Unauthorized.");
      }

      const bookingDate = new Date(bookingData.date);
      const diffDays = (bookingDate - new Date()) / (1000 * 60 * 60 * 24);

      if (diffDays < 4) {
        throw new HttpsError("failed-precondition", "Too late to cancel.");
      }

      const courseKey = getCleanCourseKey(bookingData.coursePath || "/pottery");
      const userRef = db.collection("users").doc(request.auth.uid);

      transaction.update(userRef, {
        [`credits.${courseKey}`]: admin.firestore.FieldValue.increment(1),
      });

      transaction.delete(bRef);
      return { success: true };
    });
  } catch (error) {
    console.error("Cancellation crash:", error);
    throw new HttpsError("internal", error.message);
  }
});
