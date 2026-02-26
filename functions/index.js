const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Stripe with your Secret Key
const stripe = require("stripe")(
  "sk_test_51T56CkRrxXqwePSlKMOY9SYIkKC54aGlygB25R9xZ8NP1j7uQZ15aLf89SLTUc0uptjAGRfObfDqzym5cNsUZCrC004IrGlMUp",
);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ============================================================================
// HELPER: CONSISTENT COURSE MAPPING
// ============================================================================
const courseMapping = {
  "/pottery": "pottery tuesdays",
  "/artistic-vision": "artistic vision",
  "/get-ink": "get ink!",
  "/singing": "vocal coaching",
  "/extended-voice-lab": "extended voice lab",
  "/performing-words": "performing words",
  "/singing-basics": "singing basics weekend",
};

const getCleanCourseKey = (path) => {
  // If the path exists in our map, return the title.
  // Otherwise, just remove slashes as a fallback.
  return courseMapping[path] || path.replace(/\//g, "");
};

// ============================================================================
// 1. CREATE CHECKOUT SESSION
// ============================================================================
exports.createStripeCheckout = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const userId = request.auth.uid;
  const { mode, packPrice, totalPrice, packSize, selectedDates, coursePath } =
    request.data;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
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
        mode: mode,
        packSize: packSize || 0,
        coursePath: coursePath || "unknown",
        selectedDates: JSON.stringify(selectedDates),
      },
    });

    return { url: session.url };
  } catch (error) {
    console.error("Stripe Session Failed:", error);
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
    const sessionId = session.id;
    const paymentCheckRef = db.collection("processed_payments").doc(sessionId);

    try {
      await db.runTransaction(async (transaction) => {
        const checkSnap = await transaction.get(paymentCheckRef);
        if (checkSnap.exists) return; // Idempotency check

        const { userId, mode, packSize, selectedDates, coursePath } =
          session.metadata;
        const parsedDates = JSON.parse(selectedDates);

        // Use mapping helper for consistent database key
        const courseKey = getCleanCourseKey(coursePath);
        const userRef = db.collection("users").doc(userId);

        if (mode === "pack") {
          const packAmount = parseInt(packSize);
          const deduction = parsedDates.length;
          const netIncrease = packAmount - deduction;

          transaction.set(
            userRef,
            {
              credits: {
                [courseKey]: admin.firestore.FieldValue.increment(netIncrease),
              },
            },
            { merge: true },
          );
        }

        parsedDates.forEach((sessionDate) => {
          const bookingRef = db.collection("bookings").doc();
          transaction.set(bookingRef, {
            userId: userId,
            eventId: sessionDate.id,
            date: sessionDate.date,
            type: mode,
            coursePath: coursePath,
            status: "confirmed",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        transaction.set(paymentCheckRef, {
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          userId: userId,
        });
      });
    } catch (error) {
      console.error("Webhook processing failed:", error);
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
// 4. CANCEL BOOKING & REFUND CREDITS
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

      // 4-day policy check
      const bookingDate = new Date(bookingData.date);
      const diffDays = (bookingDate - new Date()) / (1000 * 60 * 60 * 24);

      if (diffDays < 4) {
        throw new HttpsError("failed-precondition", "Too late to cancel.");
      }

      // Use mapping helper for consistent refund target
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
