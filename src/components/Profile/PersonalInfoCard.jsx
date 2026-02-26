import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { updateEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
// Import planets for course title lookup
import { planets } from "../../data/planets";
import {
  User,
  Mail,
  Phone,
  Edit2,
  Check,
  X,
  Loader2,
  Ticket,
} from "lucide-react";

export default function PersonalInfoCard({
  currentUser,
  userData,
  currentLang,
  t,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    if (userData) {
      setEditFirstName(userData.firstName || "");
      setEditLastName(userData.lastName || "");
      setEditEmail(userData.email || "");
      setEditPhone(userData.phone || "");
    }
  }, [userData, isEditing]);

  // Helper function to find the course title based on the link
  const getCourseTitle = (link) => {
    for (const planet of planets) {
      const course = planet.courses?.find((c) => c.link === link);
      if (course) return course.text[currentLang];
    }
    return link?.replace("/", "").replace(/-/g, " ") || "course";
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
                : "Aus Sicherheitsgründen logge dich bitte aus und wieder ein, um deine E-Mail zu ändern.",
            );
            setIsUpdating(false);
            return;
          }
          throw authError;
        }
      }

      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
      });

      setIsEditing(false);
    } catch (err) {
      alert("Error updating profile: " + err.message);
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
              title={t.save}
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
              title={t.cancel}
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
                ([course, amount], index) => (
                  <div
                    key={course}
                    style={{
                      marginBottom:
                        index !== Object.keys(userData.credits).length - 1
                          ? "2rem"
                          : 0,
                    }}
                  >
                    <div style={styles.creditsHeader}>
                      <Ticket size={20} color="#9960a8" />
                      <span style={styles.creditsTitle}>
                        {getCourseTitle(course)} {t.credits}
                      </span>
                    </div>

                    <div style={styles.creditsBalanceRow}>
                      <span style={styles.creditsNumber}>{amount}</span>
                      <span style={styles.creditsLabel}>{t.remaining}</span>
                    </div>
                  </div>
                ),
              )
            ) : (
              <div>
                <div style={styles.creditsHeader}>
                  <Ticket size={20} color="#9960a8" />
                  <span style={styles.creditsTitle}>{t.credits}</span>
                </div>
                <div style={styles.creditsBalanceRow}>
                  <span style={styles.creditsNumber}>0</span>
                  <span style={styles.creditsLabel}>{t.remaining}</span>
                </div>
              </div>
            )}
          </div>
        </>
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
    flex: 1,
    minWidth: "320px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
  },
  avatarCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "#caaff31e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "2.2rem",
    margin: "0 0 1.5rem 0",
    color: "#1c0700",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontFamily: "Satoshi",
    fontSize: "0.95rem",
    color: "#1c0700",
    marginBottom: "12px",
  },
  creditsBox: {
    marginTop: "2rem",
    padding: "1.5rem",
    backgroundColor: "rgba(202, 175, 243, 0.15)",
    borderRadius: "16px",
    border: "1px solid #caaff3",
  },
  creditsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  creditsTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.4rem",
    color: "#1c0700",
    textTransform: "lowercase",
  },
  creditsBalanceRow: { display: "flex", alignItems: "baseline", gap: "8px" },
  creditsNumber: {
    fontFamily: "Satoshi",
    fontWeight: "900",
    fontSize: "2.5rem",
    color: "#4e5f28",
  },
  creditsLabel: {
    fontFamily: "Satoshi",
    fontSize: "0.9rem",
    color: "#1c0700",
    opacity: 0.7,
    fontWeight: "600",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#1c070030",
    transition: "color 0.2s",
    padding: "8px",
  },
  editForm: { display: "flex", flexDirection: "column", gap: "1.2rem" },
  label: {
    fontSize: "0.6rem",
    fontFamily: "Satoshi",
    fontWeight: "bold",
    textTransform: "uppercase",
    opacity: 0.4,
    marginBottom: "6px",
    display: "block",
    letterSpacing: "0.05rem",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    backgroundColor: "rgba(255, 252, 227, 0.4)",
    fontFamily: "Satoshi",
    fontSize: "1rem",
    boxSizing: "border-box",
    outline: "none",
    color: "#1c0700",
  },
};
