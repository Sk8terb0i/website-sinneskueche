import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Ticket, PlusCircle, Loader2, Info } from "lucide-react";
import CreditHistoryCard from "./CreditHistoryCard";
import { planets } from "../../data/planets";

export default function PackStatusCard({
  currentUser,
  userData,
  currentLang,
  packCourses,
  t,
}) {
  const [isToppingUp, setIsToppingUp] = useState(null);
  const [selectedHistoryCourse, setSelectedHistoryCourse] = useState(null);

  const getCourseTitle = (link) => {
    for (const planet of planets) {
      const course = planet.courses?.find((c) => c.link === link);
      if (course) return course.text[currentLang];
    }
    return link?.replace("/", "").replace(/-/g, " ") || "course";
  };

  const handleTopUp = async (courseTitleKey) => {
    let targetDocId = null;
    for (const planet of planets) {
      const found = planet.courses?.find(
        (c) => c.text.en === courseTitleKey || c.text.de === courseTitleKey,
      );
      if (found) {
        targetDocId = found.link.replace(/\//g, "");
        break;
      }
    }
    const coursePricing = packCourses.find((c) => c.id === targetDocId);
    if (!coursePricing) return;
    setIsToppingUp(courseTitleKey);
    try {
      const functions = getFunctions();
      const createCheckout = httpsCallable(functions, "createStripeCheckout");
      const result = await createCheckout({
        mode: "pack",
        packPrice: parseFloat(coursePricing.priceFull),
        packSize: parseInt(coursePricing.packSize),
        coursePath: `/${targetDocId}`,
        selectedDates: [],
        currentLang,
        successUrl: `${window.location.origin}/#/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      });
      if (result.data?.url) window.location.assign(result.data.url);
    } catch (err) {
      console.error(err);
      setIsToppingUp(null);
    }
  };

  const hasCredits =
    userData?.credits && Object.keys(userData.credits).length > 0;

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>
        <Ticket size={22} color="#9960a8" /> {t.credits}
      </h2>

      {!hasCredits ? (
        <div style={styles.emptyCard}>
          <p style={{ opacity: 0.5, margin: 0 }}>{t.noCredits}</p>
        </div>
      ) : (
        <div style={styles.creditsList}>
          {Object.entries(userData.credits).map(([courseKey, amount]) => (
            <div key={courseKey} style={styles.individualCard}>
              <div style={{ flex: 1 }}>
                <div style={styles.creditsHeader}>
                  <Ticket size={16} color="#9960a8" style={{ opacity: 0.6 }} />
                  <span style={styles.creditsTitle}>{courseKey}</span>
                </div>
                <div style={styles.creditsBalanceRow}>
                  <span style={styles.creditsNumber}>{amount}</span>
                  <span style={styles.creditsLabel}>{t.remaining}</span>
                </div>
              </div>
              <div style={styles.actionPod}>
                <button
                  onClick={() => setSelectedHistoryCourse(courseKey)}
                  style={styles.infoActionBtn}
                >
                  <Info size={20} />
                </button>
                <div style={styles.actionDivider} />
                <button
                  onClick={() => handleTopUp(courseKey)}
                  disabled={isToppingUp !== null}
                  style={styles.topUpBtn}
                >
                  {isToppingUp === courseKey ? (
                    <Loader2 size={22} className="spinner" color="#4e5f28" />
                  ) : (
                    <PlusCircle size={22} color="#4e5f28" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedHistoryCourse && (
        <div
          style={styles.modalOverlay}
          onClick={() => setSelectedHistoryCourse(null)}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CreditHistoryCard
              userId={currentUser.uid}
              courseKey={selectedHistoryCourse}
              currentLang={currentLang}
              t={{
                ...t,
                historyTitle: `${getCourseTitle(`/${selectedHistoryCourse}`)} ${t.credits}`,
              }}
            />
            <button
              onClick={() => setSelectedHistoryCourse(null)}
              style={styles.closeBtn}
            >
              {currentLang === "en" ? "Close" : "Schliessen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { width: "100%", boxSizing: "border-box" },
  sectionTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.5rem",
    color: "#1c0700",
    marginTop: 0,
    marginBottom: "1.2rem",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    opacity: 0.8,
  },
  emptyCard: {
    padding: "2rem",
    backgroundColor: "rgba(202, 175, 243, 0.05)",
    borderRadius: "20px",
    border: "1px dashed rgba(153, 96, 168, 0.2)",
    textAlign: "center",
  },
  creditsList: { display: "flex", flexDirection: "column", gap: "1rem" },
  individualCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(202, 175, 243, 0.12)",
    padding: "1.2rem",
    borderRadius: "20px",
    border: "1px solid rgba(153, 96, 168, 0.15)",
  },
  creditsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  creditsTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.1rem",
    color: "#1c0700",
    textTransform: "lowercase",
  },
  creditsBalanceRow: { display: "flex", alignItems: "baseline", gap: "8px" },
  creditsNumber: {
    fontFamily: "Satoshi",
    fontWeight: "900",
    fontSize: "2.2rem",
    color: "#4e5f28",
    lineHeight: 1,
  },
  creditsLabel: {
    fontFamily: "Satoshi",
    fontSize: "0.8rem",
    color: "#1c0700",
    opacity: 0.6,
    fontWeight: "700",
  },
  actionPod: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "rgba(255, 252, 227, 0.5)",
    borderRadius: "14px",
    border: "1px solid rgba(28, 7, 0, 0.08)",
    padding: "4px",
    marginLeft: "15px",
  },
  actionDivider: {
    width: "1px",
    height: "20px",
    backgroundColor: "rgba(28, 7, 0, 0.1)",
    margin: "0 4px",
  },
  topUpBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
  },
  infoActionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9960a8",
    opacity: 0.7,
    padding: "8px",
    display: "flex",
    alignItems: "center",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(28, 7, 0, 0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#fffce3",
    borderRadius: "24px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "80vh",
    overflowY: "auto",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  closeBtn: {
    margin: "0 2rem 2rem 2rem",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    backgroundColor: "#fdf8e1",
    cursor: "pointer",
  },
};
