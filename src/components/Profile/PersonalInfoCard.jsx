import { useState, useEffect, useRef, useMemo } from "react";
import { auth, db } from "../../firebase";
// Fixed: Added verifyBeforeUpdateEmail and removed deprecated updateEmail
import { updatePassword, verifyBeforeUpdateEmail } from "firebase/auth";
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
  const [editPrefLang, setEditPrefLang] = useState("");

  // --- PRONOUN STATES ---
  const [selectedStandard, setSelectedStandard] = useState([]);
  const [stdOverride, setStdOverride] = useState("");
  const [customPronouns, setCustomPronouns] = useState([]);
  const [customEn, setCustomEn] = useState("");
  const [customDe, setCustomDe] = useState("");
  const [isSame, setIsSame] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const pronounOptions = [
    { key: "they", en: "They/Them", de: "Keine" },
    { key: "she", en: "She/Her", de: "Sie/Ihr" },
    { key: "he", en: "He/Him", de: "Er/Ihm" },
  ];

  const getLabel = (key) =>
    pronounOptions.find((o) => o.key === key)?.label || key;

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
        preferredLanguage: userData?.preferredLanguage || "en",
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
      setEditPrefLang(currentProfile.preferredLanguage || "en");
      setEditPassword("");

      const saved = currentProfile.pronouns || "";
      if (saved === "") {
        setSelectedStandard([]);
        setCustomPronouns([]);
      } else {
        const parts = saved.split(", ").map((p) => p.trim());
        const newSelected = [];
        const newCustom = [];

        parts.forEach((part) => {
          // Check if this string matches a standard option (e.g., "She/Her / Sie/Ihr")
          const match = pronounOptions.find(
            (opt) => `${opt.en} / ${opt.de}` === part,
          );
          if (match) {
            newSelected.push(match.key);
          } else {
            // If it doesn't match, it's a custom pronoun; split it back into EN/DE
            const [en, de] = part.split(" / ");
            newCustom.push({ en: en || part, de: de || en || part });
          }
        });
        setSelectedStandard(newSelected);
        setCustomPronouns(newCustom);
      }
      setShowCustomInput(false);
    }
  }, [currentIndex, isEditing, currentProfile]);

  const toggleStandard = (key) => {
    setSelectedStandard((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const removeCustom = (val) => {
    setCustomPronouns(customPronouns.filter((p) => p !== val));
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const stdParts = selectedStandard.map((key) => {
        const opt = pronounOptions.find((o) => o.key === key);
        const enVal =
          key === "they" && currentLang === "de" && stdOverride
            ? stdOverride
            : opt.en;
        const deVal =
          key === "they" && currentLang === "en" && stdOverride
            ? stdOverride
            : opt.de;
        return `${enVal} / ${deVal}`;
      });

      const customParts = customPronouns.map((p) => `${p.en} / ${p.de}`);
      const combined = [...stdParts, ...customParts].join(", ");

      if (currentIndex === 0) {
        // 1. Handle Email Change Securely with verifyBeforeUpdateEmail
        if (editEmail !== userData.email) {
          await verifyBeforeUpdateEmail(auth.currentUser, editEmail);
          alert(
            currentLang === "de"
              ? "Bitte bestätige deine neue E-Mail-Adresse über den Link, den wir dir geschickt haben."
              : "Please confirm your new email via the link sent to your inbox.",
          );
        }

        if (editPassword) await updatePassword(auth.currentUser, editPassword);

        // 2. Update Firestore (Note: email is omitted here to wait for verification)
        await updateDoc(doc(db, "users", currentUser.uid), {
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          pronouns: combined,
          preferredLanguage: editPrefLang,
        });
      } else {
        const updatedLinked = [...linkedProfiles];
        updatedLinked[currentIndex - 1] = {
          ...updatedLinked[currentIndex - 1],
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          pronouns: combined,
          preferredLanguage: editPrefLang,
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
            ? "Bitte logge dich erneut ein, um diese sensible Änderung vorzunehmen."
            : "Please log in again to make this sensitive change.",
        );
      } else {
        alert("Error: " + err.message);
      }
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
                  /* Remove Profile logic here */
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

          <div>
            <label style={styles.label}>
              {currentLang === "de" ? "Pronomen" : "Pronouns"}
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {pronounOptions.map((opt) => {
                const isSelected = selectedStandard.includes(opt.key);
                const isNeutral = opt.key === "they";

                return (
                  <div key={opt.key}>
                    <div
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
                            width: 20,
                            height: 20,
                            border: "1px solid #9960a8",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isSelected
                              ? "#9960a8"
                              : "transparent",
                          }}
                        >
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        <span
                          style={{ fontWeight: isSelected ? "700" : "400" }}
                        >
                          {currentLang === "de" ? opt.de : opt.en}
                        </span>
                      </div>
                    </div>

                    {isSelected && isNeutral && (
                      <div style={{ marginLeft: "32px", marginTop: "8px" }}>
                        <label style={{ ...styles.label, fontSize: "0.5rem" }}>
                          {currentLang === "de"
                            ? "Englische Version (Standard: They/Them)"
                            : "German version (Default: Keine)"}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            currentLang === "de"
                              ? "e.g. They/Them..."
                              : "z.B. xier..."
                          }
                          value={stdOverride}
                          onChange={(e) => setStdOverride(e.target.value)}
                          style={{ ...styles.input, padding: "8px" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {customPronouns.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    margin: "4px 0",
                  }}
                >
                  {customPronouns.map((p, idx) => (
                    <div key={idx} style={styles.tag}>
                      {p.en} / {p.de}{" "}
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

              {!showCustomInput ? (
                <div
                  onClick={() => setShowCustomInput(true)}
                  style={{ ...styles.choiceItem, border: "1px dashed #9960a8" }}
                >
                  <Plus size={18} style={{ marginRight: "8px" }} />
                  <span>
                    {currentLang === "de"
                      ? "Eigene hinzufügen..."
                      : "Add custom..."}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    padding: "12px",
                    border: "1px solid rgba(28,7,0,0.1)",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>English</label>
                      <input
                        value={customEn}
                        onChange={(e) => setCustomEn(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    {!isSame && (
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Deutsch</label>
                        <input
                          value={customDe}
                          onChange={(e) => setCustomDe(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                    )}
                  </div>

                  <div
                    onClick={() => setIsSame(!isSame)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      opacity: 0.7,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: "1px solid #9960a8",
                        borderRadius: 3,
                        backgroundColor: isSame ? "#9960a8" : "transparent",
                      }}
                    >
                      {isSame && <Check size={12} color="white" />}
                    </div>
                    <span style={{ fontSize: "0.7rem" }}>
                      {currentLang === "de"
                        ? "Keine Übersetzung"
                        : "No translation needed"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        const entry = {
                          en: customEn,
                          de: isSame ? customEn : customDe,
                        };
                        setCustomPronouns([...customPronouns, entry]);
                        setCustomEn("");
                        setCustomDe("");
                        setIsSame(false);
                      }}
                      style={{ ...styles.addTagBtn, flex: 1, padding: "8px" }}
                    >
                      {currentLang === "de" ? "Hinzufügen" : "Add"}
                    </button>
                    <button
                      onClick={() => setShowCustomInput(false)}
                      style={{
                        ...styles.addTagBtn,
                        backgroundColor: "#eee",
                        color: "#000",
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
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

          {/* Fixed: Added Phone Number input field back to the Edit Form */}
          {currentIndex === 0 && (
            <div>
              <label style={styles.label}>
                {currentLang === "de" ? "Telefonnummer" : "Phone Number"}
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                style={styles.input}
                placeholder="+41..."
              />
            </div>
          )}

          <div>
            <label style={styles.label}>
              {currentLang === "de"
                ? "Bevorzugte Sprache"
                : "Preferred Language"}
            </label>
            <select
              value={editPrefLang}
              onChange={(e) => setEditPrefLang(e.target.value)}
              style={styles.input}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
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
                    {/* Splits "EN / DE" and picks the one matching currentLang */}
                    {p.split(" / ")[currentLang === "de" ? 1 : 0]}
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
