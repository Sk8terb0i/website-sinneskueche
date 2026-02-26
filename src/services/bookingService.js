import { db } from "../firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  increment,
  runTransaction,
} from "firebase/firestore";

/**
 * Handles the logic for purchasing a pack and immediately booking selected dates.
 */
export const purchasePackAndBook = async (
  userId,
  packSize,
  selectedSessions,
  courseName,
) => {
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw "User does not exist!";

      // 1. Calculate remaining credits: (New Pack) - (Currently Selected)
      const sessionsCount = selectedSessions.length;
      const initialCreditBoost = packSize - sessionsCount;

      // 2. Update User Credits and Booking History
      transaction.update(userRef, {
        credits: increment(initialCreditBoost),
        bookings: arrayUnion(
          ...selectedSessions.map((s) => ({
            eventId: s.id,
            date: s.date,
            course: courseName,
            type: "pack_booking",
            timestamp: new Date().toISOString(),
          })),
        ),
      });

      // Note: You would also want to update the 'events' doc
      // to increment 'bookedSlots' if you are tracking capacity.
    });
    return { success: true };
  } catch (e) {
    console.error("Transaction failed: ", e);
    return { success: false, error: e };
  }
};

/**
 * Handles direct payment for specific sessions without a pack.
 */
export const bookIndividualSessions = async (
  userId,
  selectedSessions,
  courseName,
) => {
  const userRef = doc(db, "users", userId);

  try {
    await updateDoc(userRef, {
      bookings: arrayUnion(
        ...selectedSessions.map((s) => ({
          eventId: s.id,
          date: s.date,
          course: courseName,
          type: "single_pay",
          timestamp: new Date().toISOString(),
        })),
      ),
    });
    return { success: true };
  } catch (e) {
    console.error("Booking failed: ", e);
    return { success: false };
  }
};
