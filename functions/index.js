const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Stripe with your Secret Key (Replace with your actual sk_test_... key)
const stripe = require("stripe")(
  "sk_test_51T56CkRrxXqwePSlKMOY9SYIkKC54aGlygB25R9xZ8NP1j7uQZ15aLf89SLTUc0uptjAGRfObfDqzym5cNsUZCrC004IrGlMUp",
);

// Initialize Firebase Admin to interact with Firestore
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ============================================================================
// 1. CREATE CHECKOUT SESSION (Called from React Frontend)
// ============================================================================
exports.createStripeCheckout = onCall(
  { cors: true }, // Explicitly allow requests from your frontend
  async (request) => {
    // A. Enforce Authentication Security
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to initiate a checkout.",
      );
    }

    // B. Securely get the actual User ID from the Firebase Auth token
    const userId = request.auth.uid;

    const data = request.data;
    const { mode, packPrice, totalPrice, packSize, selectedDates, coursePath } =
      data;

    try {
      // C. Create the Stripe Session
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
                    : "Individual Pottery Sessions",
              },
              // Stripe requires amounts in cents (e.g., 300 CHF = 30000 Rappen)
              unit_amount:
                mode === "pack"
                  ? Math.round(packPrice * 100)
                  : Math.round(totalPrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        // Update these URLs to your live domain when moving to production
        success_url:
          "http://localhost:5173/#/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:5173/#/cancel",

        // D. Attach critical data to metadata so the Webhook can read it later
        metadata: {
          userId: userId,
          mode: mode,
          packSize: packSize || 0,
          coursePath: coursePath || "unknown",
          selectedDates: JSON.stringify(selectedDates),
        },
      });

      // E. Return the Session ID to the frontend to trigger the redirect
      return { url: session.url };
    } catch (error) {
      console.error("Stripe Session Creation Failed:", error);
      throw new HttpsError("internal", error.message);
    }
  },
);

// ============================================================================
// 2. STRIPE WEBHOOK (Called automatically by Stripe after successful payment)
// ============================================================================
exports.handleStripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  // Replace with your actual Webhook Signing Secret (whsec_...) from the Stripe Dashboard
  const endpointSecret = "whsec_a4VdBked9dzdHfSFPGG7iyOdkujKsZEW";

  let event;

  try {
    // Verify the event actually came from Stripe using the raw body and signature
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Only run database updates if the checkout was successfully completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Retrieve the data we tucked away in createStripeCheckout
    const { userId, mode, packSize, selectedDates } = session.metadata;
    const parsedDates = JSON.parse(selectedDates);

    const userRef = db.collection("users").doc(userId);

    try {
      await db.runTransaction(async (transaction) => {
        // A. If it was a pack purchase, calculate and add new credits
        if (mode === "pack") {
          const packAmount = parseInt(packSize);
          const deduction = parsedDates.length;

          // They bought 10, but immediately booked 3. Net increase = 7.
          const netCreditIncrease = packAmount - deduction;

          // Note: Using { merge: true } or checking if doc exists is safer if the user doc is totally empty,
          // but FieldValue.increment handles missing fields by setting them to the increment amount.
          transaction.set(
            userRef,
            {
              credits: admin.firestore.FieldValue.increment(netCreditIncrease),
            },
            { merge: true },
          );
        }

        // B. Register the actual dates as confirmed bookings
        parsedDates.forEach((sessionDate) => {
          const bookingRef = db.collection("bookings").doc();
          transaction.set(bookingRef, {
            userId: userId,
            eventId: sessionDate.id,
            date: sessionDate.date,
            type: mode, // 'pack' or 'individual'
            status: "confirmed",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      });

      console.log(`Successfully processed ${mode} for user ${userId}`);
    } catch (error) {
      console.error("Firestore update failed in webhook:", error);
    }
  }

  // Return a 200 response to acknowledge receipt to Stripe
  res.json({ received: true });
});
