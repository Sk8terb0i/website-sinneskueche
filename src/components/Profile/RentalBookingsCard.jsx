import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { Calendar, Clock, Loader2, MapPin, User } from "lucide-react";

export default function RentalBookingsCard({ t, currentLang }) {
  const [rentals, setRentals] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnrichedRentals = async () => {
      setIsLoading(true);
      try {
        // 1. Check global visibility toggle
        const configSnap = await getDoc(doc(db, "settings", "admin_config"));
        const showGlobal = configSnap.exists()
          ? configSnap.data().showRentalInProfile
          : false;
        setIsVisible(showGlobal);

        if (showGlobal) {
          // 2. Fetch all approved requests
          const q = query(
            collection(db, "rent_requests"),
            where("status", "==", "approved"),
            orderBy("date", "asc"),
          );
          const snap = await getDocs(q);

          // 3. Enrich with Time from availabilities collection
          const enriched = await Promise.all(
            snap.docs.map(async (requestDoc) => {
              const data = requestDoc.data();
              let resolvedTime = "";

              if (data.availabilityId) {
                const availSnap = await getDoc(
                  doc(db, "rental_availability", data.availabilityId),
                );
                if (availSnap.exists()) {
                  resolvedTime = availSnap.data().time;
                }
              }

              return {
                id: requestDoc.id,
                ...data,
                resolvedTime,
              };
            }),
          );

          setRentals(enriched);
        }
      } catch (err) {
        console.error("Error fetching rentals:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrichedRentals();
  }, []);

  if (isLoading) {
    return (
      <div style={styles.emptyState}>
        <Loader2 className="spinner" size={30} color="#caaff3" />
      </div>
    );
  }

  if (!isVisible || rentals.length === 0) return null;

  return (
    <section style={styles.card}>
      <h3 style={styles.sectionHeading}>
        <MapPin size={20} color="#4e5f28" />
        {t.rentalTitle}
      </h3>

      <div style={styles.bookingsList}>
        {rentals.map((item) => {
          const dateObj = new Date(item.date);

          return (
            <div key={item.id} style={styles.bookingItem}>
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
                <div style={styles.row}>
                  <div style={styles.titleContainer}>
                    <p style={styles.bookingTitle}>
                      {dateObj.toLocaleDateString(
                        currentLang === "en" ? "en-US" : "de-DE",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </p>
                    <span style={styles.nameBadge}>
                      <User size={10} /> {item.name}
                    </span>
                  </div>

                  <div style={styles.timeRow}>
                    <Clock size={12} />{" "}
                    <span>{item.resolvedTime || "--:--"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const styles = {
  card: {
    backgroundColor: "#fdf8e1",
    padding: window.innerWidth < 768 ? "1.5rem" : "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    boxSizing: "border-box",
    width: "100%",
    marginBottom: "2rem",
  },
  sectionHeading: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    margin: "0 0 1.5rem 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1c0700",
    textTransform: "lowercase",
  },
  bookingsList: { display: "flex", flexDirection: "column", gap: "1rem" },
  bookingItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1rem",
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
    borderRadius: "10px",
    width: "45px",
    height: "45px",
    color: "#1c0700",
    flexShrink: 0,
  },
  bookingMonth: {
    fontSize: "0.55rem",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  bookingDay: {
    fontSize: "1.1rem",
    fontFamily: "Harmond-SemiBoldCondensed",
    lineHeight: "1",
  },
  bookingDetails: { flex: 1, overflow: "hidden" },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  bookingTitle: {
    margin: 0,
    fontFamily: "Satoshi",
    fontWeight: "700",
    fontSize: "0.95rem",
    color: "#1c0700",
    lineHeight: "1.2",
  },
  nameBadge: {
    backgroundColor: "rgba(153, 96, 168, 0.15)",
    color: "#9960a8",
    fontSize: "0.65rem",
    fontWeight: "900",
    padding: "2px 8px",
    borderRadius: "100px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    textTransform: "uppercase",
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
    opacity: 0.6,
    color: "#1c0700",
  },
  emptyState: {
    padding: "2rem",
    textAlign: "center",
    backgroundColor: "#fdf8e1",
    borderRadius: "24px",
    marginBottom: "2rem",
  },
};
