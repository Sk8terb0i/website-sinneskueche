import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { updateEmail, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import {
  User,
  Mail,
  Phone,
  Edit2,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Trash2,
} from "lucide-react";

export default function PersonalInfoCard({
  currentUser,
  userData,
  currentLang,
  t,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Build the array of all profiles (Main User + Linked)
  const linkedProfiles = userData?.linkedProfiles || [];
  const allProfiles = [
    {
      isMain: true,
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      phone: userData?.phone || "",
    },
    ...linkedProfiles,
  ];

  const currentProfile = allProfiles[currentIndex] || allProfiles[0];

  useEffect(() => {
    if (currentProfile && !isUpdating) {
      setEditFirstName(currentProfile.firstName || "");
      setEditLastName(currentProfile.lastName || "");
      setEditEmail(currentProfile.email || "");
      setEditPhone(currentProfile.phone || "");
      setEditPassword("");
    }
  }, [currentIndex, userData, isEditing]);

  const nextProfile = () =>
    setCurrentIndex((prev) => (prev + 1) % allProfiles.length);
  const prevProfile = () =>
    setCurrentIndex(
      (prev) => (prev - 1 + allProfiles.length) % allProfiles.length,
    );

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      if (currentIndex === 0) {
        // Update Main User
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
      } else {
        // Update Linked Profile
        const updatedLinked = [...linkedProfiles];
        updatedLinked[currentIndex - 1] = {
          ...updatedLinked[currentIndex - 1],
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
        };
        await updateDoc(doc(db, "users", currentUser.uid), {
          linkedProfiles: updatedLinked,
        });
      }
      setIsEditing(false);
    } catch (err) {
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

  const handleRemoveProfile = async () => {
    if (
      !window.confirm(
        currentLang === "de"
          ? "Möchten Sie diese Person wirklich entfernen?"
          : "Are you sure you want to remove this person?",
      )
    )
      return;

    setIsUpdating(true);
    try {
      const updatedLinked = [...linkedProfiles];
      updatedLinked.splice(currentIndex - 1, 1); // Remove the currently selected linked profile

      await updateDoc(doc(db, "users", currentUser.uid), {
        linkedProfiles: updatedLinked,
      });
      setIsEditing(false);
      setCurrentIndex(0); // Jump back to main user
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
          {currentIndex === 0 ? (
            <User size={40} color="#caaff3" />
          ) : (
            <Users size={40} color="#caaff3" />
          )}
        </div>

        {/* Action Buttons */}
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} style={styles.iconBtn}>
            <Edit2 size={18} />
          </button>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            {currentIndex !== 0 && (
              <button
                onClick={handleRemoveProfile}
                disabled={isUpdating}
                style={{ ...styles.iconBtn, color: "#ff4d4d" }}
              >
                <Trash2 size={18} />
              </button>
            )}
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

      {/* Sub Label for Linked Profiles */}
      {!isEditing && currentIndex !== 0 && (
        <p style={styles.subLabel}>
          {currentLang === "de" ? "Verknüpftes Profil" : "Linked Profile"}
        </p>
      )}

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
          {/* Only show Phone and Password fields for the Main User */}
          {currentIndex === 0 && (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div style={{ flexGrow: 1 }}>
          <h2 style={styles.name}>
            {currentProfile.firstName} {currentProfile.lastName}
          </h2>
          {currentProfile.email && (
            <div style={styles.infoRow}>
              <Mail size={16} style={{ opacity: 0.5 }} />
              <span>{currentProfile.email}</span>
            </div>
          )}
          {currentProfile.phone && currentIndex === 0 && (
            <div style={styles.infoRow}>
              <Phone size={16} style={{ opacity: 0.5 }} />
              <span>{currentProfile.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* New Carousel Controls at Bottom Right */}
      {!isEditing && allProfiles.length > 1 && (
        <div style={styles.carouselNav}>
          <button onClick={prevProfile} style={styles.navBtn}>
            <ChevronLeft size={18} />
          </button>
          <span style={styles.counterText}>
            {currentIndex + 1} / {allProfiles.length}
          </span>
          <button onClick={nextProfile} style={styles.navBtn}>
            <ChevronRight size={18} />
          </button>
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
    display: "flex",
    flexDirection: "column", // Keeps content stacked naturally
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
  carouselNav: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "rgba(202, 175, 243, 0.15)",
    padding: "6px 12px",
    borderRadius: "100px",
    alignSelf: "flex-end", // Pushes the nav to the bottom right
    marginTop: "auto", // Ensures it stays at the bottom if content is short
    paddingTop: "6px", // Minor adjustment for visual balance
  },
  navBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    color: "#9960a8",
  },
  counterText: {
    fontFamily: "Satoshi",
    fontSize: "0.85rem",
    fontWeight: "bold",
    color: "#9960a8",
    letterSpacing: "1px",
  },
  subLabel: {
    fontSize: "0.7rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    opacity: 0.5,
    margin: "0 0 4px 0",
    color: "#caaff3",
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
