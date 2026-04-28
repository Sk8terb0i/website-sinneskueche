import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Ticket, PlusCircle, Loader2, Info, X } from "lucide-react";
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
  const [showPackPicker, setShowPackPicker] = useState(null);

  const getCourseTitle = (link) => {
    for (const planet of planets) {
      const course = planet.courses?.find((c) => c.link === link);
      if (course) return course.text[currentLang];
    }
    return link?.replace("/", "").replace(/-/g, " ") || "course";
  };

  const handleTopUp = async (courseTitleKey, specificPack = null) => {
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

    const packToBuy =
      specificPack || (coursePricing.packs ? coursePricing.packs[0] : null);

    setIsToppingUp(courseTitleKey);
    setShowPackPicker(null);

    try {
      const functions = getFunctions();
      const createCheckout = httpsCallable(functions, "createStripeCheckout");
      const result = await createCheckout({
        mode: "pack",
        packPrice: parseFloat(
          packToBuy ? packToBuy.price : coursePricing.priceFull,
        ),
        packSize: parseInt(packToBuy ? packToBuy.size : coursePricing.packSize),
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

  const onPlusClick = (courseKey) => {
    let targetDocId = null;
    for (const planet of planets) {
      const found = planet.courses?.find(
        (c) => c.text.en === courseKey || c.text.de === courseKey,
      );
      if (found) {
        targetDocId = found.link.replace(/\//g, "");
        break;
      }
    }
    const coursePricing = packCourses.find((c) => c.id === targetDocId);

    if (coursePricing?.packs?.length > 1) {
      setShowPackPicker({ courseKey, packs: coursePricing.packs });
    } else {
      handleTopUp(courseKey);
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
          {Object.entries(userData.credits).map(([courseKey, amount]) => {
            const isPlural = amount !== 1;
            const sessionLabel =
              currentLang === "de"
                ? isPlural
                  ? "Kredite"
                  : "Kredit"
                : isPlural
                  ? "sessions"
                  : "session";

            return (
              <div key={courseKey} style={styles.individualCard}>
                <div style={styles.contentSide}>
                  <div style={styles.creditsHeader}>
                    <span style={styles.creditsTitle}>{courseKey}</span>
                  </div>

                  <div style={styles.creditsBalanceRow}>
                    <span style={styles.creditsNumber}>{amount}</span>
                    <span style={styles.creditsLabel}>
                      {sessionLabel} {t.remaining}
                    </span>
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
                    onClick={() => onPlusClick(courseKey)}
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
            );
          })}
        </div>
      )}

      {/* PACK PICKER MODAL */}
      {showPackPicker && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowPackPicker(null)}
        >
          <div
            style={{ ...styles.modalContent, padding: "1.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1.2rem",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  ...styles.creditsTitle,
                  fontSize: "1.4rem",
                  marginBottom: 0,
                }}
              >
                {t.buyPack}
              </h3>
              <button
                onClick={() => setShowPackPicker(null)}
                style={styles.iconOnlyBtn}
              >
                <X size={24} color="#1c0700" />
              </button>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {showPackPicker.packs.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTopUp(showPackPicker.courseKey, p)}
                  style={styles.packOptionBtn}
                >
                  <span style={{ fontWeight: "700" }}>
                    {p.size} {currentLang === "de" ? "Paket" : "Pack"}
                  </span>
                  <span style={{ opacity: 0.8 }}>{p.price} CHF</span>
                </button>
              ))}
            </div>
          </div>
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
    backgroundColor: "rgba(153, 96, 168, 0.05)",
    borderRadius: "24px",
    border: "1px dashed rgba(153, 96, 168, 0.2)",
    textAlign: "center",
  },
  creditsList: { display: "flex", flexDirection: "column", gap: "1rem" },
  individualCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(153, 96, 168, 0.08)",
    padding: "1.2rem 1.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(153, 96, 168, 0.12)",
  },
  contentSide: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  creditsHeader: {
    display: "flex",
    alignItems: "center",
  },
  creditsTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.2rem",
    color: "#1c0700",
    textTransform: "lowercase",
    lineHeight: 1.2,
  },
  creditsBalanceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
  },
  creditsNumber: {
    fontFamily: "Satoshi",
    fontWeight: "900",
    fontSize: "2.4rem",
    color: "#4e5f28",
    lineHeight: 1,
  },
  creditsLabel: {
    fontFamily: "Satoshi",
    fontSize: "0.85rem",
    color: "#1c0700",
    opacity: 0.6,
    fontWeight: "700",
    transform: "translateY(-2px)", // Fine-tuned alignment with the big number
  },
  actionPod: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fdf8e1", // Replaced white
    borderRadius: "16px",
    border: "1px solid rgba(28, 7, 0, 0.1)",
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
    padding: "10px",
    display: "flex",
    alignItems: "center",
  },
  infoActionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9960a8",
    opacity: 0.8,
    padding: "10px",
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
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#fffce3", // Replaced white
    borderRadius: "28px",
    maxWidth: "420px",
    width: "100%",
    maxHeight: "85vh",
    overflowY: "auto",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
  },
  packOptionBtn: {
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid rgba(153, 96, 168, 0.2)",
    background: "#fdf8e1", // Replaced white
    cursor: "pointer",
    fontFamily: "Satoshi",
    fontSize: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "transform 0.1s ease",
    color: "#1c0700",
  },
  iconOnlyBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  closeBtn: {
    margin: "0 1.5rem 1.5rem 1.5rem",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    backgroundColor: "#fdf8e1",
    cursor: "pointer",
    fontFamily: "Satoshi",
    fontWeight: "bold",
  },
};
