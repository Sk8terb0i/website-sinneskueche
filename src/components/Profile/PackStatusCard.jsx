import React, { useState, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Ticket, PlusCircle, Loader2, Info, X, Users } from "lucide-react";
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
  const [viewingProfileId, setViewingProfileId] = useState("main");

  // Build the array of available profiles and their respective credits
  const allProfiles = useMemo(() => {
    const profiles = [
      {
        id: "main",
        // Show the user's first name, fallback to "Me" / "Ich" if missing
        name: userData?.firstName || (currentLang === "de" ? "Ich" : "Me"),
        credits: userData?.credits || {},
      },
    ];
    if (userData?.linkedProfiles) {
      userData.linkedProfiles.forEach((p) => {
        profiles.push({
          id: p.id,
          // Just show the sub-profile's first name
          name: p.firstName,
          credits: p.credits || {},
        });
      });
    }
    return profiles;
  }, [userData, currentLang]);

  const activeProfile =
    allProfiles.find((p) => p.id === viewingProfileId) || allProfiles[0];
  const activeCredits = activeProfile.credits || {};

  // Filter out any courses where the credit amount is 0 or less
  const validCredits = Object.entries(activeCredits).filter(([key, amount]) => {
    const numericAmount = isNaN(parseFloat(amount)) ? 0 : parseFloat(amount);
    return numericAmount > 0;
  });

  const hasCredits = validCredits.length > 0;

  const resolveCourseId = (courseKey) => {
    const reverseMapping = {
      "pottery tuesdays": "pottery",
      "artistic vision": "artistic-vision",
      "get ink!": "get-ink",
      "vocal coaching": "singing",
      "extended voice lab": "extended-voice-lab",
      "performing words": "performing-words",
      "singing basics weekend": "singing-basics",
    };

    let targetId = reverseMapping[courseKey.toLowerCase()];

    if (!targetId) {
      const match = packCourses.find(
        (c) => c.courseName === courseKey || c.nameEn === courseKey,
      );
      if (match) targetId = match.id;
    }

    // Clean up any stray slashes if it falls back to the original key
    return targetId || courseKey.replace(/\//g, "");
  };

  const getCourseTitle = (key) => {
    // 1. Get the actual Firestore Document ID using your mapping function
    const targetDocId = resolveCourseId(key);

    // 2. Look up the course by its ID in the dynamic Firestore data
    const fromFirestore = packCourses.find((c) => c.id === targetDocId);

    if (fromFirestore) {
      return (
        fromFirestore[`name${currentLang === "en" ? "En" : "De"}`] ||
        fromFirestore.courseName
      );
    }

    // 3. Fallback to planets data if not found in Firestore
    const sanitizedKey = key.replace(/\//g, "");
    for (const planet of planets) {
      const course = planet.courses?.find(
        (c) => c.link === `/${sanitizedKey}` || c.text.en === key,
      );
      if (course) return course.text[currentLang];
    }

    return key;
  };

  const handleTopUp = async (courseTitleKey, specificPack = null) => {
    const targetDocId = resolveCourseId(courseTitleKey);
    const coursePricing = packCourses.find((c) => c.id === targetDocId);

    if (!coursePricing) {
      console.error("Pricing not found for:", targetDocId);
      return;
    }

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
        profileId: viewingProfileId,
        profileName: activeProfile.name,
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
    const targetDocId = resolveCourseId(courseKey);
    const coursePricing = packCourses.find((c) => c.id === targetDocId);

    if (!coursePricing) {
      console.error("Pricing not found for:", targetDocId);
      return;
    }

    if (coursePricing?.packs?.length > 1) {
      setShowPackPicker({ courseKey, packs: coursePricing.packs });
    } else {
      handleTopUp(courseKey);
    }
  };

  return (
    <div style={styles.container}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.2rem",
        }}
      >
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
          <Ticket size={22} color="#9960a8" /> {t.credits}
        </h2>

        {allProfiles.length > 1 && (
          <select
            value={viewingProfileId}
            onChange={(e) => setViewingProfileId(e.target.value)}
            style={styles.profileSelect}
          >
            {allProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasCredits ? (
        <div style={styles.emptyCard}>
          <p style={{ opacity: 0.5, margin: 0 }}>{t.noCredits}</p>
        </div>
      ) : (
        <div style={styles.creditsList}>
          {validCredits.map(([courseKey, amount]) => {
            const numericAmount = parseFloat(amount);

            const isPlural = numericAmount !== 1;
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
                    {/* FIX: Use the helper to show the pretty name */}
                    <span style={styles.creditsTitle}>
                      {getCourseTitle(courseKey)}
                    </span>
                  </div>

                  <div style={styles.creditsBalanceRow}>
                    <span style={styles.creditsNumber}>{numericAmount}</span>
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
              <div>
                <h3
                  style={{
                    ...styles.creditsTitle,
                    fontSize: "1.4rem",
                    marginBottom: "4px",
                  }}
                >
                  {t.buyPack}
                </h3>
                {/* Clear indicator of who the credits are for */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "#4e5f28",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {currentLang === "de" ? "Zuweisung an: " : "Assigning to: "}{" "}
                  {activeProfile.name}
                </p>
              </div>
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
              profileId={viewingProfileId}
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
  profileSelect: {
    padding: "6px 12px",
    borderRadius: "100px",
    border: "1px solid rgba(153, 96, 168, 0.3)",
    background: "rgba(202, 175, 243, 0.1)",
    color: "#9960a8",
    fontFamily: "Satoshi",
    fontWeight: "bold",
    fontSize: "0.85rem",
    outline: "none",
    cursor: "pointer",
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
    transform: "translateY(-2px)",
  },
  actionPod: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fdf8e1",
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
    backgroundColor: "#fffce3",
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
    background: "#fdf8e1",
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
