import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Clock, PlusCircle, MinusCircle, Loader2 } from "lucide-react";

export default function CreditHistoryCard({
  userId,
  courseKey,
  currentLang,
  profileId, // <-- Added
  t,
}) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const constraints = [
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
        ];

        if (courseKey) {
          constraints.push(where("courseKey", "==", courseKey));
        }

        const q = query(collection(db, "credit_history"), ...constraints);
        const snap = await getDocs(q);

        let fetchedHistory = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter locally to ensure backward compatibility with older docs that have no profileId
        if (profileId === "main") {
          fetchedHistory = fetchedHistory.filter(
            (item) => !item.profileId || item.profileId === "main",
          );
        } else if (profileId) {
          fetchedHistory = fetchedHistory.filter(
            (item) => item.profileId === profileId,
          );
        }

        setHistory(fetchedHistory);
      } catch (error) {
        console.error("Error fetching credit history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchHistory();
  }, [userId, courseKey, profileId]);

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
        <Clock size={20} color="#9960a8" />
        {t.historyTitle ||
          (currentLang === "en" ? "Credit History" : "Guthaben-Verlauf")}
      </h2>

      <div style={styles.scrollArea}>
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <Loader2 className="spinner" size={24} color="#9960a8" />
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
                      <PlusCircle size={14} />
                    ) : (
                      <MinusCircle size={14} />
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
    </div>
  );
}

const styles = {
  card: {
    padding: "2rem 2rem 1rem 2rem",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "transparent",
    maxHeight: "60vh",
  },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.6rem",
    color: "#1c0700",
    marginTop: 0,
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  scrollArea: {
    overflowY: "auto",
    paddingRight: "8px",
    flex: 1,
    WebkitOverflowScrolling: "touch",
  },
  emptyText: {
    fontSize: "0.9rem",
    opacity: 0.5,
    margin: 0,
    fontFamily: "Satoshi",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    paddingBottom: "1rem",
  },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    backgroundColor: "rgba(153, 96, 168, 0.05)",
    borderRadius: "14px",
    border: "1px solid rgba(28, 7, 0, 0.03)",
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    alignItems: "flex-start",
  },
  itemTitle: {
    margin: 0,
    fontWeight: "700",
    color: "#1c0700",
    fontSize: "0.9rem",
    fontFamily: "Satoshi",
  },
  date: {
    margin: 0,
    fontSize: "0.7rem",
    opacity: 0.5,
    fontFamily: "Satoshi",
  },
  amountContainer: (isPositive) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: isPositive ? "#4e5f28" : "#9960a8",
    backgroundColor: isPositive
      ? "rgba(78, 95, 40, 0.1)"
      : "rgba(153, 96, 168, 0.1)",
    padding: "4px 10px",
    borderRadius: "100px",
  }),
  amountText: {
    fontWeight: "900",
    fontSize: "1rem",
    fontFamily: "Satoshi",
  },
};
