import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { Calendar, Loader2, Clock } from "lucide-react";

export default function BookingsCard({ userId, currentLang, t }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        // 1. Get all bookings for this user
        const q = query(
          collection(db, "bookings"),
          where("userId", "==", userId),
        );
        const querySnapshot = await getDocs(q);

        // 2. Loop through each booking and fetch its matching Event data
        const bookingsWithEventData = await Promise.all(
          querySnapshot.docs.map(async (bookingDoc) => {
            const bookingData = bookingDoc.data();
            let eventData = {};

            // Fetch the event using the eventId saved in the booking
            if (bookingData.eventId) {
              const eventRef = doc(db, "events", bookingData.eventId);
              const eventSnap = await getDoc(eventRef);
              if (eventSnap.exists()) {
                eventData = eventSnap.data();
              }
            }

            // Clean up the course name (e.g., "/pottery" -> "pottery")
            const rawCourseName =
              eventData.link || bookingData.coursePath || "unknown";
            const cleanCourseName = rawCourseName.replace(/\//g, "");

            return {
              id: bookingDoc.id,
              ...bookingData,
              courseName: cleanCourseName,
              time: eventData.time || "", // Grabs the time from your events collection
            };
          }),
        );

        // 3. Sort by date
        bookingsWithEventData.sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );
        setBookings(bookingsWithEventData);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        setDataLoading(false);
      }
    };

    if (userId) fetchUserBookings();
  }, [userId]);

  return (
    <section style={styles.card}>
      <h3 style={styles.sectionHeading}>
        <Calendar size={20} color="#4e5f28" />
        {t.myCourses}
      </h3>

      {dataLoading ? (
        <div style={styles.emptyState}>
          <Loader2 className="spinner" size={30} color="#caaff3" />
        </div>
      ) : bookings.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ opacity: 0.6 }}>{t.noCourses}</p>
          <button onClick={() => navigate("/")} style={styles.browseBtn}>
            {t.browseCourses}
          </button>
        </div>
      ) : (
        <div style={styles.bookingsList}>
          {bookings.map((booking) => {
            const dateObj = new Date(booking.date);
            const formattedDate = dateObj.toLocaleDateString(
              currentLang === "en" ? "en-US" : "de-DE",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            );

            return (
              <div key={booking.id} style={styles.bookingItem}>
                <div style={styles.bookingDateBox}>
                  <span style={styles.bookingMonth}>
                    {dateObj.toLocaleString(
                      currentLang === "en" ? "en-US" : "de-DE",
                      { month: "short" },
                    )}
                  </span>
                  <span style={styles.bookingDay}>{dateObj.getDate()}</span>
                </div>

                <div style={styles.bookingDetails}>
                  <p style={styles.bookingTitle}>{formattedDate}</p>

                  {/* NEW: Displays the Course Name, Time, and Status */}
                  <div style={styles.badgeRow}>
                    <span style={styles.courseBadge}>{booking.courseName}</span>

                    {booking.time && (
                      <span style={styles.timeBadge}>
                        <Clock size={12} />
                        {booking.time}
                      </span>
                    )}

                    <span style={styles.bookingStatus}>
                      {currentLang === "en" ? "Confirmed" : "Bestätigt"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles = {
  card: {
    backgroundColor: "#fdf8e1",
    padding: "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    boxShadow: "0 10px 30px rgba(28, 7, 0, 0.02)",
    flex: 2,
    minWidth: "320px",
  },
  sectionHeading: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    margin: "0 0 2rem 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1c0700",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 1rem",
    backgroundColor: "rgba(28, 7, 0, 0.02)",
    borderRadius: "20px",
    textAlign: "center",
    fontFamily: "Satoshi",
  },
  browseBtn: {
    marginTop: "1.5rem",
    padding: "12px 30px",
    backgroundColor: "#caaff3",
    border: "none",
    borderRadius: "100px",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#1c0700",
    fontFamily: "Satoshi",
    fontSize: "0.9rem",
    transition: "transform 0.2s ease",
  },
  bookingsList: { display: "flex", flexDirection: "column", gap: "1rem" },
  bookingItem: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    padding: "1.2rem",
    backgroundColor: "#fffce3",
    borderRadius: "16px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
  },
  bookingDateBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#caaff3",
    borderRadius: "12px",
    width: "60px",
    height: "60px",
    color: "#1c0700",
    flexShrink: 0,
  },
  bookingMonth: {
    fontSize: "0.7rem",
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: "Satoshi",
    opacity: 0.7,
  },
  bookingDay: {
    fontSize: "1.4rem",
    fontFamily: "Harmond-SemiBoldCondensed",
    lineHeight: "1.1",
  },
  bookingDetails: { display: "flex", flexDirection: "column", gap: "6px" },
  bookingTitle: {
    margin: 0,
    fontFamily: "Satoshi",
    fontWeight: "700",
    fontSize: "1.1rem",
    color: "#1c0700",
  },
  badgeRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  courseBadge: {
    fontSize: "0.75rem",
    fontFamily: "Satoshi",
    backgroundColor: "rgba(202, 175, 243, 0.3)",
    padding: "4px 10px",
    borderRadius: "100px",
    textTransform: "capitalize",
    fontWeight: "700",
    color: "#1c0700",
  },
  timeBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.75rem",
    fontFamily: "Satoshi",
    backgroundColor: "rgba(28, 7, 0, 0.05)",
    padding: "4px 10px",
    borderRadius: "100px",
    fontWeight: "600",
    color: "#1c0700",
  },
  bookingStatus: {
    fontSize: "0.75rem",
    fontFamily: "Satoshi",
    color: "#4e5f28",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05rem",
    marginLeft: "auto",
  },
};
