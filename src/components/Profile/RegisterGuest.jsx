import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { auth, db } from "../../firebase";
import * as S from "../PriceDisplay/PriceDisplayStyles";

export default function RegisterGuest({ currentLang }) {
  const [searchParams] = useSearchParams();
  const guestEmail = searchParams.get("email") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestNameData, setGuestNameData] = useState({
    firstName: "",
    lastName: "",
  });

  // NEW: Sub-User State
  const [subUsers, setSubUsers] = useState([]);

  // Pre-fetch the guest's name from their previous records so the profile isn't empty
  useEffect(() => {
    const fetchGuestName = async () => {
      if (!guestEmail) return;
      const q = query(
        collection(db, "bookings"),
        where("guestEmail", "==", guestEmail),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fullGuestName = snap.docs[0].data().guestName || "";
        const [first, ...last] = fullGuestName.split(" ");
        setGuestNameData({
          firstName: first || "",
          lastName: last.join(" ") || "",
        });
      }
    };
    fetchGuestName();
  }, [guestEmail]);

  // Sub-User Handlers
  const addSubUser = () => {
    setSubUsers([
      ...subUsers,
      {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        firstName: "",
        lastName: "",
      },
    ]);
  };

  const updateSubUser = (id, field, value) => {
    setSubUsers(
      subUsers.map((su) => (su.id === id ? { ...su, [field]: value } : su)),
    );
  };

  const removeSubUser = (id) => {
    setSubUsers(subUsers.filter((su) => su.id !== id));
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        guestEmail,
        password,
      );
      const newUid = userCred.user.uid;
      const batch = writeBatch(db);

      // 1. Link Bookings (Correctly identifies guest sessions)
      const bookingQuery = query(
        collection(db, "bookings"),
        where("guestEmail", "==", guestEmail),
      );
      const bookingSnap = await getDocs(bookingQuery);

      bookingSnap.forEach((d) => {
        batch.update(doc(db, "bookings", d.id), {
          userId: newUid,
          guestEmail: null,
          guestName: null,
        });
      });

      // 2. Link Pack Codes (Uses buyerEmail to find your unspent credits)
      const codesQuery = query(
        collection(db, "pack_codes"),
        where("buyerEmail", "==", guestEmail),
      );
      const codesSnap = await getDocs(codesQuery);

      let initialCredits = {};
      codesSnap.forEach((d) => {
        const data = d.data();
        const courseKey = data.courseKey;
        initialCredits[courseKey] =
          (initialCredits[courseKey] || 0) + data.remainingCredits;
        batch.delete(doc(db, "pack_codes", d.id));
      });

      // 3. Prepare linked profiles
      const linkedProfiles = subUsers
        .filter((su) => su.firstName.trim() || su.lastName.trim())
        .map((su) => ({
          id: su.id,
          firstName: su.firstName.trim(),
          lastName: su.lastName.trim(),
          email: "",
          credits: {},
          createdAt: new Date().toISOString(),
        }));

      // 4. Create Profile with both email, name, and sub-users
      await setDoc(doc(db, "users", newUid), {
        email: guestEmail,
        firstName: guestNameData.firstName,
        lastName: guestNameData.lastName,
        role: "user",
        credits: initialCredits,
        linkedProfiles, // <-- NEW
        createdAt: new Date().toISOString(),
      });

      await batch.commit();
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "140px 20px 60px",
        maxWidth: "400px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontFamily: "Harmond-SemiBoldCondensed",
          fontSize: "2.5rem",
          marginBottom: "1rem",
        }}
      >
        {currentLang === "en"
          ? "complete your profile"
          : "profil vervollständigen"}
      </h2>
      <p
        style={{
          marginBottom: "2rem",
          opacity: 0.7,
          fontSize: "0.9rem",
          lineHeight: "1.5",
        }}
      >
        {currentLang === "en"
          ? `Welcome ${guestNameData.firstName || ""}! Enter a password to save your data for ${guestEmail}`
          : `Willkommen ${guestNameData.firstName || ""}! Gib ein Passwort ein, um deine Daten für ${guestEmail} zu speichern`}
      </p>

      <form
        onSubmit={handleRegistration}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <input
          type="password"
          placeholder={
            currentLang === "en" ? "Choose a password" : "Passwort wählen"
          }
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={S.guestInputStyle}
        />

        {/* NEW: Sub-Users Section */}
        <div
          style={{
            marginTop: "1rem",
            borderTop: "1px dashed rgba(28,7,0,0.1)",
            paddingTop: "1.5rem",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <label
              style={{
                fontSize: "0.75rem",
                fontWeight: "bold",
                textTransform: "uppercase",
                opacity: 0.5,
                letterSpacing: "1px",
              }}
            >
              {currentLang === "en"
                ? "Family / Sub-Users"
                : "Familie / Unterkonten"}
            </label>
            <button
              type="button"
              onClick={addSubUser}
              style={{
                background: "none",
                border: "none",
                color: "#9960a8",
                fontSize: "0.8rem",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Plus size={16} />{" "}
              {currentLang === "en" ? "Add Person" : "Person hinzufügen"}
            </button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {subUsers.map((su) => (
              <div
                key={su.id}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  backgroundColor: "rgba(202,175,243,0.15)",
                  padding: "10px",
                  borderRadius: "12px",
                }}
              >
                <input
                  type="text"
                  placeholder={currentLang === "en" ? "First name" : "Vorname"}
                  value={su.firstName}
                  onChange={(e) =>
                    updateSubUser(su.id, "firstName", e.target.value)
                  }
                  style={{
                    ...S.guestInputStyle,
                    backgroundColor: "#fffce3",
                    padding: "10px",
                  }}
                  required
                />
                <input
                  type="text"
                  placeholder={currentLang === "en" ? "Last name" : "Nachname"}
                  value={su.lastName}
                  onChange={(e) =>
                    updateSubUser(su.id, "lastName", e.target.value)
                  }
                  style={{
                    ...S.guestInputStyle,
                    backgroundColor: "#fffce3",
                    padding: "10px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeSubUser(su.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff4d4d",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: "#1c0700", opacity: 0.8, fontSize: "0.8rem" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ ...S.primaryBtnStyle(false), marginTop: "10px" }}
        >
          {loading
            ? currentLang === "en"
              ? "Creating Profile..."
              : "Profil wird erstellt..."
            : currentLang === "en"
              ? "Save & View Profile"
              : "Speichern & Profil ansehen"}
        </button>
      </form>
    </div>
  );
}
