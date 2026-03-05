import React, { useState, useRef, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { storage, db } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header/Header";
import {
  Camera,
  UploadCloud,
  CheckCircle,
  Loader2,
  XCircle,
  Search,
  PlusCircle,
  Home,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export default function StudentFiringForm() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [step, setStep] = useState("email"); // Now acts as 'lookup' step
  const [userCode, setUserCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [existingObjects, setExistingObjects] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [lang, setLang] = useState(() => {
    const savedLang = localStorage.getItem("userLanguage");
    return savedLang === "de" || savedLang === "en" ? savedLang : "en";
  });

  // --- LOGIC: FETCH PIECES BY CODE ---
  const fetchPieces = useCallback(async (targetCode) => {
    if (!targetCode) return;
    setLoading(true);
    setError("");
    try {
      const lookupFn = httpsCallable(getFunctions(), "getStudentObjects");
      const res = await lookupFn({ userCode: targetCode.toUpperCase() });
      setExistingObjects(res.data);
      setStep("selection");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- AUTO-LOOKUP FOR LOGGED IN USERS ---
  useEffect(() => {
    const initUser = async () => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          let code = snap.data()?.firingCode;

          // Generate a hidden code for users if they don't have one
          if (!code) {
            code = Math.random().toString(36).substring(2, 6).toUpperCase();
            await updateDoc(userRef, { firingCode: code });
          }

          setUserCode(code);
          fetchPieces(code);
        } catch (err) {
          console.error("Error fetching user code", err);
        }
      }
    };
    initUser();
  }, [currentUser, fetchPieces]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    localStorage.setItem("userLanguage", lang);
    document.documentElement.lang = lang;
    return () => window.removeEventListener("resize", handleResize);
  }, [lang]);

  const fileInputRef = useRef(null);

  const labels = {
    en: {
      title: "Firing Registration",
      lookupStep: "Enter your code",
      lookupDesc: "Enter your 4-character code to find your pieces.",
      codePlaceholder: "4-character code (e.g. A1B2)",
      namePlaceholder: "Full Name",
      emailPlaceholder: "Email Address",
      findExisting: "Search my pieces",
      registerDirectly: "Register new object",
      registerDirectlyDesc: "Start a fresh registration (Initial Bisque).",
      noExisting: "No objects found. Register a new one below.",
      isThisYours: "Manage your pieces here",
      glazeAction: "Move to Glaze firing",
      orRegisterNew: "None of these / New object",
      takePhoto: "Open Camera",
      submit: "Confirm Registration",
      successTitle: "All Set!",
      successText:
        "Your object is in the queue. We'll email you when it's ready!",
      goHome: "Back to Home",
      goProfile: "My Profile",
      or: "OR",
      processing: "Processing...",
      searching: "Finding your pieces...",
      back: "Back",
      codeTaken: "This code is already in use. Please choose another.",
      codeLength: "Code must be exactly 4 characters.",
      requiredFields: "Please fill out all fields.",
    },
    de: {
      title: "Brenn-Registrierung",
      lookupStep: "Code eingeben",
      lookupDesc: "Gib deinen 4-stelligen Code ein, um deine Stücke zu finden.",
      codePlaceholder: "4-stelliger Code (z.B. A1B2)",
      namePlaceholder: "Vollständiger Name",
      emailPlaceholder: "E-Mail Adresse",
      findExisting: "Meine Stücke suchen",
      registerDirectly: "Neues Objekt registrieren",
      registerDirectlyDesc: "Beginne eine neue Registrierung (Bisque Fire).",
      noExisting: "Keine Objekte gefunden. Registriere ein neues unten.",
      isThisYours: "Verwalte deine Objekte hier",
      glazeAction: "Zum Glasurbrand bewegen",
      orRegisterNew: "Keines davon / Neu registrieren",
      takePhoto: "Kamera öffnen",
      submit: "Registrierung bestätigen",
      successTitle: "Erledigt!",
      successText:
        "Dein Objekt ist in der Warteschlange. Wir melden uns per E-Mail!",
      goHome: "Zur Startseite",
      goProfile: "Mein Profil",
      or: "ODER",
      processing: "Verarbeitung...",
      searching: "Suche deine Stücke...",
      back: "Zurück",
      codeTaken: "Dieser Code ist bereits vergeben. Bitte wähle einen anderen.",
      codeLength: "Der Code muss genau 4 Zeichen lang sein.",
      requiredFields: "Bitte fülle alle Felder aus.",
    },
  }[lang];

  const handleLookup = (e) => {
    e.preventDefault();
    if (userCode.length !== 4) return setError(labels.codeLength);
    fetchPieces(userCode);
  };

  const handleMoveStage = async (objectId) => {
    setLoading(true);
    try {
      const moveFn = httpsCallable(getFunctions(), "moveToGlazeStage");
      await moveFn({ objectId, currentLang: lang });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewRegistration = async (e) => {
    e.preventDefault();
    if (!imageFile) return setError("Photo required.");
    setError("");

    const isFirstTimeGuest = !currentUser && existingObjects.length === 0;
    const finalCode = userCode.toUpperCase();

    if (isFirstTimeGuest) {
      if (finalCode.length !== 4) return setError(labels.codeLength);
      if (!guestName || !guestEmail) return setError(labels.requiredFields);

      // Check if code is truly unique
      setLoading(true);
      try {
        const q = query(
          collection(db, "firings"),
          where("userCode", "==", finalCode),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLoading(false);
          return setError(labels.codeTaken);
        }
      } catch (err) {
        setLoading(false);
        return setError("Database error. Please try again.");
      }
    }

    // Determine email and name to attach
    // If existing objects exist, inherit email/name from the previous piece. Otherwise use form state.
    const finalEmail =
      currentUser?.email ||
      (existingObjects.length > 0 ? existingObjects[0].email : guestEmail);
    const finalName =
      currentUser?.displayName ||
      (existingObjects.length > 0 ? existingObjects[0].name : guestName);

    setLoading(true);
    try {
      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `firings/${Date.now()}.${fileExt}`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      const registerFn = httpsCallable(getFunctions(), "registerFiringObject");
      await registerFn({
        email: finalEmail.toLowerCase(),
        name: finalName || "Guest",
        userCode: finalCode,
        stage: "bisque",
        imageUrl,
        currentLang: lang,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDivider = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        margin: "2rem 0",
        color: "rgba(28,7,0,0.25)",
      }}
    >
      <div
        style={{ flex: 1, height: "1px", backgroundColor: "rgba(28,7,0,0.1)" }}
      />
      <span
        style={{
          padding: "0 15px",
          fontSize: "0.75rem",
          fontWeight: "900",
          letterSpacing: "1.5px",
        }}
      >
        {labels.or}
      </span>
      <div
        style={{ flex: 1, height: "1px", backgroundColor: "rgba(28,7,0,0.1)" }}
      />
    </div>
  );

  const RegisterNewCard = () => (
    <div
      onClick={() => setStep("form")}
      style={{
        ...sectionStyle,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <PlusCircle size={22} color="#4e5f28" />
        <ArrowRight size={18} opacity={0.2} />
      </div>
      <h3
        style={{
          margin: 0,
          fontWeight: isMobile ? "600" : "700",
          fontSize: "1.1rem",
        }}
      >
        {labels.registerDirectly}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: "0.8rem",
          opacity: 0.5,
          fontWeight: "400",
        }}
      >
        {labels.registerDirectlyDesc}
      </p>
    </div>
  );

  if (success) {
    return (
      <div style={containerStyle}>
        <Header
          currentLang={lang}
          setCurrentLang={setLang}
          isMenuOpen={isMenuOpen}
          onMenuToggle={setIsMenuOpen}
        />
        <div style={cardStyle}>
          <CheckCircle
            size={isMobile ? 50 : 70}
            color="#4e5f28"
            style={{ marginBottom: "1.5rem" }}
          />
          <h2
            style={{ ...titleStyle, fontSize: isMobile ? "2.2rem" : "3.2rem" }}
          >
            {labels.successTitle}
          </h2>
          <p
            style={{
              opacity: 0.7,
              lineHeight: 1.6,
              marginBottom: "2.5rem",
              fontSize: isMobile ? "0.95rem" : "1.1rem",
            }}
          >
            {labels.successText}
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <button
              onClick={() => navigate("/")}
              style={{
                ...primaryBtnStyle,
                backgroundColor: "#caaff3",
                color: "#1c0700",
              }}
            >
              <Home size={18} /> {labels.goHome}
            </button>
            {currentUser && (
              <button
                onClick={() => navigate("/profile")}
                style={primaryBtnStyle}
              >
                <UserIcon size={18} /> {labels.goProfile}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <Header
        currentLang={lang}
        setCurrentLang={setLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          opacity: loading && currentUser && step === "email" ? 0.5 : 1,
        }}
      >
        <h1 style={titleStyle}>{labels.title}</h1>

        {loading && currentUser && step === "email" && (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <Loader2
              className="spinner"
              size={40}
              color="#caaff3"
              style={{ marginBottom: "1rem" }}
            />
            <p style={{ fontWeight: "600", opacity: 0.6 }}>
              {labels.searching}
            </p>
          </div>
        )}

        {/* STEP 1: LOOKUP GUEST VIEW */}
        {step === "email" && (!currentUser || !loading) && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {!currentUser && (
              <>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{labels.lookupStep}</label>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.5,
                      marginBottom: "1.2rem",
                      fontWeight: "400",
                    }}
                  >
                    {labels.lookupDesc}
                  </p>
                  <form
                    onSubmit={handleLookup}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="text"
                      maxLength="4"
                      placeholder={labels.codePlaceholder}
                      value={userCode}
                      onChange={(e) =>
                        setUserCode(e.target.value.toUpperCase())
                      }
                      required
                      style={{ ...inputStyle, textTransform: "uppercase" }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        ...primaryBtnStyle,
                        padding: "14px",
                        borderRadius: "14px",
                      }}
                    >
                      {loading ? (
                        <Loader2 className="spinner" size={18} />
                      ) : (
                        <Search size={18} />
                      )}
                      {loading ? labels.processing : labels.findExisting}
                    </button>
                  </form>
                </div>
                {renderDivider()}
              </>
            )}
            <RegisterNewCard />
          </div>
        )}

        {/* STEP 2: PIECES LIST */}
        {step === "selection" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {existingObjects.length > 0 ? (
              <div style={sectionStyle}>
                <p
                  style={{
                    fontWeight: isMobile ? "600" : "700",
                    marginBottom: "1.2rem",
                    textAlign: "center",
                  }}
                >
                  {labels.isThisYours}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {existingObjects.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => !loading && handleMoveStage(obj.id)}
                      style={{ ...objectCardStyle, opacity: loading ? 0.6 : 1 }}
                    >
                      <img
                        src={obj.imageUrl}
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "8px",
                          objectFit: "cover",
                        }}
                        alt="Pottery"
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                          {new Date(
                            obj.createdAt?._seconds * 1000,
                          ).toLocaleDateString()}
                        </div>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#9960a8",
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {loading ? (
                            <Loader2 size={12} className="spinner" />
                          ) : (
                            labels.glazeAction
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {!currentUser && (
                  <button
                    onClick={() => setStep("form")}
                    style={secondaryBtnStyle}
                  >
                    {labels.orRegisterNew}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ ...sectionStyle, textAlign: "center" }}>
                <p style={{ marginBottom: "0", opacity: 0.7 }}>
                  {labels.noExisting}
                </p>
              </div>
            )}
            {currentUser && <RegisterNewCard />}
          </div>
        )}

        {/* STEP 3: REGISTRATION FORM */}
        {step === "form" && (
          <form onSubmit={handleNewRegistration}>
            <button
              type="button"
              onClick={() => setStep(currentUser ? "selection" : "email")}
              style={{
                background: "none",
                border: "none",
                color: "#1c0700",
                opacity: 0.5,
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              <ArrowLeft size={16} /> {labels.back}
            </button>

            {/* ONLY SHOW THESE FIELDS IF IT IS A FIRST TIME GUEST */}
            {!currentUser && existingObjects.length === 0 && (
              <div
                style={{
                  ...sectionStyle,
                  marginBottom: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <label style={labelStyle}>Guest Information</label>
                <input
                  type="text"
                  maxLength="4"
                  placeholder={labels.codePlaceholder}
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  required
                  style={{ ...inputStyle, textTransform: "uppercase" }}
                />
                <input
                  type="text"
                  placeholder={labels.namePlaceholder}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  style={inputStyle}
                />
                <input
                  type="email"
                  placeholder={labels.emailPlaceholder}
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value.toLowerCase())}
                  required
                  style={inputStyle}
                />
              </div>
            )}

            <div style={sectionStyle}>
              <label style={labelStyle}>{labels.takePhoto}</label>
              {imagePreview ? (
                <div
                  style={{
                    position: "relative",
                    borderRadius: "16px",
                    overflow: "hidden",
                    aspectRatio: "1 / 1",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#fdf8e1",
                  }}
                >
                  <img
                    src={imagePreview}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: loading ? 0.6 : 1,
                    }}
                    alt="preview"
                  />
                  {!loading && (
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      style={removeImgStyle}
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current.click()}
                  style={cameraBoxStyle}
                >
                  <Camera size={30} /> {labels.takePhoto}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...primaryBtnStyle, opacity: loading ? 0.8 : 1 }}
            >
              {loading ? (
                <Loader2 className="spinner" size={22} />
              ) : (
                <UploadCloud size={22} />
              )}
              {loading ? labels.processing : labels.submit}
            </button>
          </form>
        )}
        {error && (
          <p
            style={{
              color: "#ff4d4d",
              textAlign: "center",
              marginTop: "1rem",
              fontWeight: "600",
            }}
          >
            {error}
          </p>
        )}
      </div>
      <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// --- STYLES (NO PLAIN WHITE) ---
const containerStyle = {
  minHeight: "100vh",
  backgroundColor: "#fffce3",
  padding: "100px 1.2rem 2rem",
  fontFamily: "Satoshi, sans-serif",
  color: "#1c0700",
};
const titleStyle = {
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "2.8rem",
  margin: "0 0 1.5rem 0",
  lineHeight: 1,
  textAlign: "center",
  fontWeight: "normal",
};
const labelStyle = {
  display: "block",
  fontWeight: "600",
  marginBottom: "0.5rem",
  fontSize: "0.95rem",
};
const sectionStyle = {
  backgroundColor: "#fdf8e1",
  padding: "1.2rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.06)",
  marginBottom: "0.5rem",
};
const cardStyle = {
  textAlign: "center",
  backgroundColor: "#fdf8e1",
  padding: "2.5rem 1.5rem",
  borderRadius: "32px",
  border: "1px solid rgba(28,7,0,0.1)",
  maxWidth: "500px",
  margin: "0 auto",
};
const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid rgba(28, 7, 0, 0.1)",
  backgroundColor: "#fffce3",
  fontSize: "1rem",
  boxSizing: "border-box",
  color: "#1c0700",
};
const primaryBtnStyle = {
  width: "100%",
  padding: "16px",
  backgroundColor: "#9960a8",
  color: "#fdf8e1",
  border: "none",
  borderRadius: "100px",
  fontSize: "1rem",
  fontWeight: "700",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.2s ease",
};
const secondaryBtnStyle = {
  width: "100%",
  padding: "12px",
  background: "none",
  border: "1px solid rgba(153,96,168,0.2)",
  color: "#9960a8",
  borderRadius: "100px",
  marginTop: "1rem",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.85rem",
};
const objectCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px",
  backgroundColor: "#fffce3",
  borderRadius: "14px",
  border: "1px solid rgba(202,175,243,0.2)",
  cursor: "pointer",
  transition: "all 0.2s ease",
};
const cameraBoxStyle = {
  width: "100%",
  aspectRatio: "1 / 1",
  border: "2px dashed #caaff3",
  borderRadius: "16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  color: "#9960a8",
  fontWeight: "600",
  backgroundColor: "rgba(202,175,243,0.03)",
  cursor: "pointer",
};
const removeImgStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  background: "rgba(0,0,0,0.5)",
  color: "#fffce3",
  border: "none",
  borderRadius: "50%",
  width: "30px",
  height: "30px",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};
