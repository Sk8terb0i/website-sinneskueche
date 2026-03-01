import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { updateEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { planets } from "../../data/planets";
import CreditHistoryCard from "./CreditHistoryCard"; // IMPORTED NEW COMPONENT
import {
  User,
  Mail,
  Phone,
  Edit2,
  Check,
  X,
  Loader2,
  Ticket,
  PlusCircle,
  Info, // IMPORTED ICON
} from "lucide-react";

export default function PersonalInfoCard({
  currentUser,
  userData,
  currentLang,
  packCourses,
  t,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // NEW: State to track which course history to show in the modal
  const [selectedHistoryCourse, setSelectedHistoryCourse] = useState(null);

  useEffect(() => {
    if (userData) {
      setEditFirstName(userData.firstName || "");
      setEditLastName(userData.lastName || "");
      setEditEmail(userData.email || "");
      setEditPhone(userData.phone || "");
    }
  }, [userData, isEditing]);

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

    if (!coursePricing) {
      console.error(
        "Top-up failed. Key:",
        courseTitleKey,
        "Doc ID:",
        targetDocId,
      );
      alert(
        currentLang === "en"
          ? "Pricing info not found for this course."
          : "Preisinformationen für diesen Kurs nicht gefunden.",
      );
      return;
    }

    setIsToppingUp(courseTitleKey);

    try {
      const functions = getFunctions();
      const createCheckout = httpsCallable(functions, "createStripeCheckout");

      const getBaseUrl = () => {
        const origin = window.location.origin;
        if (origin.includes("github.io")) {
          return `${origin}/website-sinneskueche/`;
        }
        return `${origin}/`;
      };

      const result = await createCheckout({
        mode: "pack",
        packPrice: parseFloat(coursePricing.priceFull),
        packSize: parseInt(coursePricing.packSize),
        coursePath: `/${targetDocId}`,
        selectedDates: [],
        currentLang: currentLang,
        successUrl: `${getBaseUrl()}#/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      });

      if (result.data?.url) window.location.assign(result.data.url);
    } catch (err) {
      console.error("Top up error:", err);
      setIsToppingUp(null);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      if (editEmail !== userData.email) {
        try {
          await updateEmail(auth.currentUser, editEmail);
        } catch (authError) {
          if (authError.code === "auth/requires-recent-login") {
            alert(
              currentLang === "en"
                ? "For security, please log out and log back in to change your email."
                : "Aus Sicherheitsgründen logge dich bitte aus und wieder ein.",
            );
            setIsUpdating(false);
            return;
          }
          throw authError;
        }
      }
      await updateDoc(doc(db, "users", currentUser.uid), {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
      });
      setIsEditing(false);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.avatarCircle}>
          <User size={40} color="#caaff3" />
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={styles.iconBtn}
            title={t.edit}
          >
            <Edit2 size={18} />
          </button>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              style={{ ...styles.iconBtn, color: "#4e5f28" }}
            >
              {isUpdating ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <Check size={18} />
              )}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={{ ...styles.iconBtn, color: "#ff4d4d" }}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={styles.editForm}>
          <div>
            <label style={styles.label}>{t.firstName}</label>
            <input
              type="text"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>{t.lastName}</label>
            <input
              type="text"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>{t.email}</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>{t.phone}</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>
      ) : (
        <>
          <h2 style={styles.name}>
            {userData.firstName} {userData.lastName}
          </h2>
          <div style={styles.infoRow}>
            <Mail size={16} style={{ opacity: 0.5 }} />
            <span>{userData.email}</span>
          </div>
          {userData.phone && (
            <div style={styles.infoRow}>
              <Phone size={16} style={{ opacity: 0.5 }} />
              <span>{userData.phone}</span>
            </div>
          )}

          <div style={styles.creditsBox}>
            {userData.credits && Object.keys(userData.credits).length > 0 ? (
              Object.entries(userData.credits).map(
                ([courseKey, amount], index) => (
                  <div
                    key={courseKey}
                    style={{
                      ...styles.creditEntry,
                      marginBottom:
                        index !== Object.keys(userData.credits).length - 1
                          ? "2rem"
                          : 0,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={styles.creditsHeader}>
                        <Ticket size={20} color="#9960a8" />
                        <span style={styles.creditsTitle}>{courseKey}</span>
                      </div>
                      <div style={styles.creditsBalanceRow}>
                        <span style={styles.creditsNumber}>{amount}</span>
                        <span style={styles.creditsLabel}>{t.remaining}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      {/* NEW: INFO BUTTON */}
                      <button
                        onClick={() => setSelectedHistoryCourse(courseKey)}
                        style={styles.infoActionBtn}
                        title="View History"
                      >
                        <Info size={18} />
                      </button>

                      <button
                        onClick={() => handleTopUp(courseKey)}
                        disabled={isToppingUp !== null}
                        style={styles.topUpBtn}
                      >
                        {isToppingUp === courseKey ? (
                          <Loader2
                            size={24}
                            className="spinner"
                            color="#4e5f28"
                          />
                        ) : (
                          <PlusCircle size={24} color="#4e5f28" />
                        )}
                      </button>
                    </div>
                  </div>
                ),
              )
            ) : (
              <div style={styles.creditsBalanceRow}>
                <span style={styles.creditsLabel}>{t.noCourses}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* NEW: MODAL OVERLAY FOR HISTORY */}
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
                // THIS IS THE STEP 2 FIX: Shows pretty name (e.g. Pottery Tuesdays)
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
    </section>
  );
}

const styles = {
  card: {
    backgroundColor: "#fdf8e1",
    padding: window.innerWidth < 768 ? "1.5rem" : "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  avatarCircle: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#caaff31e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: window.innerWidth < 768 ? "1.8rem" : "2.2rem",
    margin: "0 0 1.5rem 0",
    color: "#1c0700",
    wordBreak: "break-word",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontFamily: "Satoshi",
    fontSize: "0.95rem",
    color: "#1c0700",
    marginBottom: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  creditsBox: {
    marginTop: "2rem",
    padding: "1.2rem",
    backgroundColor: "rgba(202, 175, 243, 0.15)",
    borderRadius: "16px",
    border: "1px solid #caaff3",
  },
  creditEntry: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "nowrap",
  },
  creditsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  creditsTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.2rem",
    color: "#1c0700",
    textTransform: "lowercase",
  },
  creditsBalanceRow: { display: "flex", alignItems: "baseline", gap: "8px" },
  creditsNumber: {
    fontFamily: "Satoshi",
    fontWeight: "900",
    fontSize: "2rem",
    color: "#4e5f28",
  },
  creditsLabel: {
    fontFamily: "Satoshi",
    fontSize: "0.8rem",
    color: "#1c0700",
    opacity: 0.7,
    fontWeight: "600",
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
    opacity: 0.6,
    padding: "8px",
    display: "flex",
    alignItems: "center",
    transition: "opacity 0.2s ease",
    ":hover": { opacity: 1 },
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#1c070030",
    padding: "8px",
  },
  editForm: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: {
    fontSize: "0.6rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    opacity: 0.4,
    marginBottom: "4px",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    backgroundColor: "rgba(255, 252, 227, 0.4)",
    color: "#1c0700",
    boxSizing: "border-box",
  },
  // NEW: MODAL STYLES
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
    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
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
    fontFamily: "Satoshi",
    fontWeight: "bold",
    color: "#1c0700",
  },
};
