import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut, updateEmail } from "firebase/auth"; // Added updateEmail
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header/Header";
import {
  LogOut,
  User,
  Calendar,
  Mail,
  Phone,
  Edit2,
  Check,
  X,
  Loader2,
} from "lucide-react";

export default function Profile({ currentLang, setCurrentLang }) {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState(""); // Added email state
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    if (!currentUser || userData?.role === "admin") {
      navigate("/");
    } else if (userData) {
      setEditFirstName(userData.firstName || "");
      setEditLastName(userData.lastName || "");
      setEditEmail(userData.email || "");
      setEditPhone(userData.phone || "");
    }
  }, [currentUser, userData, navigate]);

  if (!currentUser || !userData) return null;

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      // 1. Update Auth Email if changed
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

      // 2. Update Firestore document
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

  const t = {
    en: {
      title: "my profile",
      logout: "log out",
      edit: "edit info",
      save: "save",
      cancel: "cancel",
      firstName: "first name",
      lastName: "last name",
      email: "email address",
      phone: "phone",
      myCourses: "my booked courses",
      noCourses: "you haven't booked any courses yet.",
      browseCourses: "browse courses",
    },
    de: {
      title: "mein profil",
      logout: "abmelden",
      edit: "bearbeiten",
      save: "speichern",
      cancel: "abbrechen",
      firstName: "vorname",
      lastName: "nachname",
      email: "e-mail adresse",
      phone: "telefon",
      myCourses: "meine gebuchten kurse",
      noCourses: "du hast noch keine kurse gebucht.",
      browseCourses: "kurse durchstöbern",
    },
  }[currentLang];

  return (
    <div style={styles.pageWrapper}>
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main style={styles.main}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>{t.title}</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={16} /> {t.logout}
          </button>
        </div>

        <div style={styles.grid}>
          {/* Personal Info Card */}
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
              </>
            )}
          </section>

          {/* Booked Courses Card */}
          <section style={{ ...styles.card, flex: 2 }}>
            <h3 style={styles.sectionHeading}>
              <Calendar size={20} color="#4e5f28" />
              {t.myCourses}
            </h3>

            <div style={styles.emptyState}>
              <p style={{ opacity: 0.6 }}>{t.noCourses}</p>
              <button onClick={() => navigate("/")} style={styles.browseBtn}>
                {t.browseCourses}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: "100vh",
    backgroundColor: "#fffce3",
    paddingBottom: "5rem",
  },
  main: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "140px 20px 20px 20px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "3.5rem",
    color: "#1c0700",
    margin: 0,
    textTransform: "lowercase",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fdf8e1",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    padding: "10px 20px",
    borderRadius: "100px",
    cursor: "pointer",
    fontFamily: "Satoshi",
    fontSize: "0.85rem",
    fontWeight: "bold",
    color: "#1c0700",
    transition: "all 0.2s",
  },
  grid: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
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
  sectionHeading: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    margin: "0 0 2rem 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1c0700",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#1c070030",
    transition: "color 0.2s",
    padding: "8px",
  },
  editForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
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
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 1rem",
    backgroundColor: "rgba(28, 7, 0, 0.02)",
    borderRadius: "20px",
    textAlign: "center",
    fontFamily: "Satoshi",
  },
  browseBtn: {
    marginTop: "1.5rem",
    padding: "12px 30px",
    backgroundColor: "#caaff3",
    border: "none",
    borderRadius: "100px",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#1c0700",
    fontFamily: "Satoshi",
    fontSize: "0.9rem",
    transition: "transform 0.2s ease",
  },
};
