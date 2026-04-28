import { useState } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { UserPlus, Check, X, Loader2 } from "lucide-react";

export default function FamilyMemberCard({
  currentUser,
  userData,
  currentLang,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const linkedProfiles = userData?.linkedProfiles || [];

  // Maximum of 4 linked profiles (+ 1 main user = 5 total)
  if (linkedProfiles.length >= 4) {
    return null;
  }

  const handleAddProfile = async () => {
    if (!newFirstName || !newLastName) return;

    setIsUpdating(true);
    try {
      const updatedLinked = [
        ...linkedProfiles,
        {
          id: Date.now().toString(),
          firstName: newFirstName,
          lastName: newLastName,
          email: newEmail,
        },
      ];

      await updateDoc(doc(db, "users", currentUser.uid), {
        linkedProfiles: updatedLinked,
      });

      // Reset form
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setIsAdding(false);
    } catch (err) {
      alert("Error adding person: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const labels = {
    en: {
      addBtn: "Add another person",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email (Optional)",
      title: "Book for friends & family",
      description:
        "Add up to 4 people to easily buy tickets and book sessions together.",
    },
    de: {
      addBtn: "Weitere Person hinzufügen",
      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail (Optional)",
      title: "Für Freunde & Familie buchen",
      description:
        "Fügen Sie bis zu 4 Personen hinzu, um gemeinsam Tickets und Kurse zu buchen.",
    },
  }[currentLang || "en"];

  if (!isAdding) {
    return (
      <section style={styles.card}>
        <div style={styles.emptyState}>
          <div style={styles.header}>
            <div style={styles.iconCircle}>
              <UserPlus size={20} color="#caaff3" />
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px 0", color: "#1c0700" }}>
                {labels.title}
              </h4>
              <p style={styles.emptyText}>{labels.description}</p>
            </div>
          </div>
          <button onClick={() => setIsAdding(true)} style={styles.addBtn}>
            <UserPlus size={16} /> {labels.addBtn}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ ...styles.card, padding: "1.5rem" }}>
      <div style={styles.cardHeader}>
        <h4 style={{ margin: 0, color: "#1c0700" }}>{labels.addBtn}</h4>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleAddProfile}
            disabled={isUpdating || !newFirstName || !newLastName}
            style={{
              ...styles.iconBtn,
              color: !newFirstName || !newLastName ? "#ccc" : "#4e5f28",
            }}
          >
            {isUpdating ? (
              <Loader2 size={18} className="spinner" />
            ) : (
              <Check size={18} />
            )}
          </button>
          <button
            onClick={() => setIsAdding(false)}
            style={{ ...styles.iconBtn, color: "#ff4d4d" }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div style={styles.editForm}>
        <div>
          <label style={styles.label}>{labels.firstName} *</label>
          <input
            type="text"
            value={newFirstName}
            onChange={(e) => setNewFirstName(e.target.value)}
            style={styles.input}
          />
        </div>
        <div>
          <label style={styles.label}>{labels.lastName} *</label>
          <input
            type="text"
            value={newLastName}
            onChange={(e) => setNewLastName(e.target.value)}
            style={styles.input}
          />
        </div>
        <div>
          <label style={styles.label}>{labels.email}</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>
    </section>
  );
}

const styles = {
  card: {
    backgroundColor: "#fdf8e1",
    padding: window.innerWidth < 768 ? "1.5rem" : "2rem",
    borderRadius: "24px",
    border: "1px dashed rgba(202, 175, 243, 0.8)",
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  iconCircle: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#caaff31e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
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
  emptyState: {
    display: "flex",
    flexDirection: "column",
  },
  emptyText: {
    fontSize: "0.85rem",
    opacity: 0.7,
    margin: 0,
    lineHeight: "1.4",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "#caaff3",
    color: "#1c0700",
    border: "none",
    padding: "10px 16px",
    borderRadius: "100px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.85rem",
    width: window.innerWidth < 768 ? "100%" : "fit-content",
  },
};
