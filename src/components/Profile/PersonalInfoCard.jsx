import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { updateEmail, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { User, Mail, Phone, Edit2, Check, X, Loader2 } from "lucide-react";

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
  const [editPassword, setEditPassword] = useState("");

  useEffect(() => {
    if (userData) {
      setEditFirstName(userData.firstName || "");
      setEditLastName(userData.lastName || "");
      setEditEmail(userData.email || "");
      setEditPhone(userData.phone || "");
      setEditPassword(""); // Clear password field when opening edit mode
    }
  }, [userData, isEditing]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      if (editEmail !== userData.email) {
        await updateEmail(auth.currentUser, editEmail);
      }

      if (editPassword) {
        await updatePassword(auth.currentUser, editPassword);
      }

      await updateDoc(doc(db, "users", currentUser.uid), {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
      });
      setIsEditing(false);
    } catch (err) {
      // Firebase security rule: Changing email/password requires a recent login
      if (err.code === "auth/requires-recent-login") {
        alert(
          currentLang === "de"
            ? "Bitte melden Sie sich erneut an, um Ihr Passwort oder Ihre E-Mail zu ändern."
            : "Please log out and log back in to change your password or email.",
        );
      } else {
        alert("Error: " + err.message);
      }
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
          <button onClick={() => setIsEditing(true)} style={styles.iconBtn}>
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
            <label style={styles.label}>
              {t.firstName || (currentLang === "de" ? "Vorname" : "First Name")}
            </label>
            <input
              type="text"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>
              {t.lastName || (currentLang === "de" ? "Nachname" : "Last Name")}
            </label>
            <input
              type="text"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>{t.email || "Email"}</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>
              {t.phone || (currentLang === "de" ? "Telefon" : "Phone")}
            </label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label style={{ ...styles.label, color: "#ff4d4d" }}>
              {currentLang === "de" ? "Neues Passwort" : "New Password"}
            </label>
            <input
              type="password"
              placeholder={
                currentLang === "de"
                  ? "Leer lassen, um aktuelles beizubehalten"
                  : "Leave blank to keep current"
              }
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
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
        </>
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
};
