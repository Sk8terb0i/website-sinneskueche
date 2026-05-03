import { useState, useEffect, useRef, useMemo } from "react";
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
  Plus,
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

  // --- PRONOUN STATES ---
  const [selectedStandard, setSelectedStandard] = useState([]);
  const [customPronouns, setCustomPronouns] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const pronounOptions = [
    { key: "they", label: currentLang === "de" ? "Keine" : "They/Them" },
    { key: "she", label: currentLang === "de" ? "Sie/Ihr" : "She/Her" },
    { key: "he", label: currentLang === "de" ? "Er/Ihm" : "He/Him" },
  ];

  // Helper to map keys back to labels for display badges
  const getLabel = (key) =>
    pronounOptions.find((o) => o.key === key)?.label || key;

  // Build the array of all profiles
  const linkedProfiles = userData?.linkedProfiles || [];
  const allProfiles = useMemo(
    () => [
      {
        isMain: true,
        firstName: userData?.firstName || "",
        lastName: userData?.lastName || "",
        email: userData?.email || "",
        phone: userData?.phone || "",
        pronouns: userData?.pronouns || "",
      },
      ...linkedProfiles.map((p) => ({ ...p, isMain: false })),
    ],
    [userData, linkedProfiles],
  );

  const currentProfile = allProfiles[currentIndex] || allProfiles[0];

  useEffect(() => {
    if (currentProfile && !isUpdating) {
      setEditFirstName(currentProfile.firstName || "");
      setEditLastName(currentProfile.lastName || "");
      setEditEmail(currentProfile.email || "");
      setEditPhone(currentProfile.phone || "");
      setEditPassword("");

      const saved = currentProfile.pronouns || "";
      if (saved === "") {
        setSelectedStandard([]);
        setCustomPronouns([]);
      } else {
        const parts = saved.split(", ").map((p) => p.trim());
        const standardKeys = ["they", "she", "he"];
        setSelectedStandard(parts.filter((p) => standardKeys.includes(p)));
        setCustomPronouns(parts.filter((p) => !standardKeys.includes(p)));
      }
      setShowCustomInput(false);
    }
  }, [currentIndex, isEditing, currentProfile]);

  const toggleStandard = (key) => {
    setSelectedStandard((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleAddCustom = () => {
    if (!customInput.trim()) return;
    if (!customPronouns.includes(customInput.trim())) {
      setCustomPronouns([...customPronouns, customInput.trim()]);
    }
    setCustomInput("");
  };

  const removeCustom = (val) => {
    setCustomPronouns(customPronouns.filter((p) => p !== val));
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const combined = [...selectedStandard, ...customPronouns].join(", ");

      if (currentIndex === 0) {
        if (editEmail !== userData.email)
          await updateEmail(auth.currentUser, editEmail);
        if (editPassword) await updatePassword(auth.currentUser, editPassword);
        await updateDoc(doc(db, "users", currentUser.uid), {
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          phone: editPhone,
          pronouns: combined,
        });
      } else {
        const updatedLinked = [...linkedProfiles];
        updatedLinked[currentIndex - 1] = {
          ...updatedLinked[currentIndex - 1],
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          pronouns: combined,
        };
        await updateDoc(doc(db, "users", currentUser.uid), {
          linkedProfiles: updatedLinked,
        });
      }
      setIsEditing(false);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const nextProfile = () =>
    setCurrentIndex((prev) => (prev + 1) % allProfiles.length);
  const prevProfile = () =>
    setCurrentIndex(
      (prev) => (prev - 1 + allProfiles.length) % allProfiles.length,
    );

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
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} style={styles.iconBtn}>
            <Edit2 size={18} />
          </button>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            {currentIndex !== 0 && (
              <button
                onClick={() => {
                  /* Remove Profile Logic */
                }}
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

      {isEditing ? (
        <div style={styles.editForm}>
          <div style={{ display: "flex", gap: "10px", flexDirection: "row" }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>
                {currentLang === "de" ? "Vorname" : "First Name"}
              </label>
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>
                {currentLang === "de" ? "Nachname" : "Last Name"}
              </label>
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* PRONOUN CHOICE LIST WITH CHECKMARKS */}
          <div>
            <label style={styles.label}>
              {currentLang === "de" ? "Pronomen" : "Pronouns"}
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {pronounOptions.map((opt) => {
                const isSelected = selectedStandard.includes(opt.key);
                return (
                  <div
                    key={opt.key}
                    onClick={() => toggleStandard(opt.key)}
                    style={{
                      ...styles.choiceItem,
                      border: isSelected
                        ? "1px solid #9960a8"
                        : "1px solid rgba(28, 7, 0, 0.1)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "6px",
                          border: `2px solid ${isSelected ? "#9960a8" : "#caaff3"}`,
                          backgroundColor: isSelected
                            ? "#9960a8"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && (
                          <Check size={14} color="#fdf8e1" strokeWidth={4} />
                        )}
                      </div>
                      <span
                        style={{
                          fontWeight: isSelected ? "700" : "400",
                          color: "#1c0700",
                        }}
                      >
                        {opt.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Custom Tags List */}
              {customPronouns.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    margin: "4px 0",
                  }}
                >
                  {customPronouns.map((p) => (
                    <div key={p} style={styles.tag}>
                      {p}{" "}
                      <X
                        size={12}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustom(p);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Choice Trigger */}
              {!showCustomInput ? (
                <div
                  onClick={() => setShowCustomInput(true)}
                  style={{
                    ...styles.choiceItem,
                    border: "1px dashed #9960a8",
                    color: "#9960a8",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={18} style={{ marginRight: "8px" }} />
                  <span>
                    {currentLang === "de"
                      ? "Eigene hinzufügen..."
                      : "Add custom..."}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder={
                      currentLang === "de" ? "z.B. xier..." : "e.g. ze..."
                    }
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), handleAddCustom())
                    }
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    style={styles.addTagBtn}
                  >
                    <Plus size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    style={{
                      ...styles.addTagBtn,
                      backgroundColor: "rgba(28,7,0,0.1)",
                      color: "#1c0700",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>
      ) : (
        <div style={{ flexGrow: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ ...styles.name, marginBottom: 0 }}>
              {currentProfile.firstName} {currentProfile.lastName}
            </h2>
            {currentProfile.pronouns && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {currentProfile.pronouns.split(", ").map((p, idx) => (
                  <div key={idx} style={styles.pronounBadge}>
                    {getLabel(p)}
                  </div>
                ))}
              </div>
            )}
          </div>
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
    padding: "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
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
    alignSelf: "flex-end",
    marginTop: "auto",
  },
  navBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    color: "#9960a8",
  },
  counterText: {
    fontFamily: "Satoshi",
    fontSize: "0.85rem",
    fontWeight: "bold",
    color: "#9960a8",
  },
  name: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "2.2rem",
    color: "#1c0700",
    wordBreak: "break-word",
  },
  pronounBadge: {
    backgroundColor: "rgba(153, 96, 168, 0.15)",
    color: "#9960a8",
    padding: "4px 12px",
    borderRadius: "100px",
    fontSize: "0.75rem",
    fontWeight: "800",
    textTransform: "lowercase",
    border: "1px solid rgba(153, 96, 168, 0.2)",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
  choiceItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tag: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(78, 95, 40, 0.1)",
    color: "#4e5f28",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "bold",
  },
  addTagBtn: {
    backgroundColor: "#9960a8",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "0 12px",
    cursor: "pointer",
  },
};
