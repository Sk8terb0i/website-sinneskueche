import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { updateEmail } from "firebase/auth";
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

  useEffect(() => {
    if (userData) {
      setEditFirstName(userData.firstName || "");
      setEditLastName(userData.lastName || "");
      setEditEmail(userData.email || "");
      setEditPhone(userData.phone || "");
    }
  }, [userData, isEditing]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      if (editEmail !== userData.email) {
        await updateEmail(auth.currentUser, editEmail);
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
