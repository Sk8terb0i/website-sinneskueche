import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Clock, PlusCircle, MinusCircle, Loader2 } from "lucide-react";

// Added courseKey to the props destructured here
export default function CreditHistoryCard({
  userId,
  courseKey,
  currentLang,
  t,
}) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        // Validation for the query
        const constraints = [
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
        ];

        // Only add the course filter if a specific courseKey is provided
        if (courseKey) {
          constraints.push(where("courseKey", "==", courseKey));
        }

        const q = query(collection(db, "credit_history"), ...constraints);
        const snap = await getDocs(q);
        setHistory(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching credit history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchHistory();
  }, [userId, courseKey]); // Added courseKey to dependency array

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString(currentLang === "en" ? "en-GB" : "de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionTypeLabel = (type) => {
    if (currentLang === "en") {
      switch (type) {
        case "purchase":
          return "Session Pack Purchased";
        case "booking":
          return `Session Booked`;
        case "refund":
          return "Session Refunded";
        case "adjustment":
          return "Admin Adjustment";
        default:
          return "Transaction";
      }
    } else {
      switch (type) {
        case "purchase":
          return "Session-Karte gekauft";
        case "booking":
          return `Termin gebucht`;
        case "refund":
          return "Termin erstattet";
        case "adjustment":
          return "Admin-Anpassung";
        default:
          return "Transaktion";
      }
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>
        <Clock size={20} color="#caaff3" />
        {t.historyTitle ||
          (currentLang === "en" ? "Credit History" : "Guthaben-Verlauf")}
      </h2>

      {isLoading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Loader2 className="spinner" size={24} color="#caaff3" />
        </div>
      ) : history.length === 0 ? (
        <p style={styles.emptyText}>
          {currentLang === "en"
            ? "No history for this course."
            : "Kein Verlauf für diesen Kurs."}
        </p>
      ) : (
        <div style={styles.list}>
          {history.map((item) => {
            const isPositive = item.amount > 0;
            return (
              <div key={item.id} style={styles.historyItem}>
                <div style={styles.details}>
                  <p style={styles.itemTitle}>
                    {getTransactionTypeLabel(item.type)}
                  </p>
                  <p style={styles.date}>{formatDate(item.createdAt)}</p>
                </div>

                <div style={styles.amountContainer(isPositive)}>
                  {isPositive ? (
                    <PlusCircle size={16} />
                  ) : (
                    <MinusCircle size={16} />
                  )}
                  <span style={styles.amountText}>
                    {isPositive ? "+" : ""}
                    {item.amount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { padding: "2rem", display: "flex", flexDirection: "column" },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    color: "#1c0700",
    marginTop: 0,
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textTransform: "lowercase",
  },
  emptyText: {
    fontSize: "0.9rem",
    opacity: 0.6,
    fontStyle: "italic",
    margin: 0,
  },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
    borderBottom: "1px solid rgba(28, 7, 0, 0.05)",
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
  },
  itemTitle: {
    margin: 0,
    fontWeight: "bold",
    color: "#1c0700",
    fontSize: "0.9rem",
  },
  date: { margin: 0, fontSize: "0.75rem", opacity: 0.5 },
  amountContainer: (isPositive) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: isPositive ? "#4e5f28" : "#ff4d4d",
    backgroundColor: isPositive
      ? "rgba(78, 95, 40, 0.1)"
      : "rgba(255, 77, 77, 0.1)",
    padding: "6px 12px",
    borderRadius: "100px",
  }),
  amountText: { fontWeight: "900", fontSize: "1.1rem" },
};
