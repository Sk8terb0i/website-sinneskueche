import { useState, useEffect } from "react";
import { X, Loader2, Info, ChevronLeft } from "lucide-react";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function AuthOverlay({ isOpen, onClose, currentLang }) {
  const [view, setView] = useState("login"); // "login", "register", or "reset"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [closeActive, setCloseActive] = useState(false);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const isMobile = window.innerWidth < 768;

  // Reset overlay state when closed
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    if (!isOpen) {
      setTimeout(() => {
        setView("login");
        setError("");
        setMessage("");
      }, 500);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Email Validation Helper
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError(
        currentLang === "en"
          ? "Please enter a valid email."
          : "Bitte gib eine gültige E-Mail an.",
      );
      return;
    }

    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      auth.languageCode = currentLang;
      await sendPasswordResetEmail(auth, email);
      setMessage(
        currentLang === "en"
          ? `Reset link sent to ${email}`
          : `Link an ${email} gesendet`,
      );

      // Auto-switch back to login after success so they can sign in once reset
      setTimeout(() => setView("login"), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login and Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isValidEmail(email)) {
      setError(
        currentLang === "en"
          ? "Invalid email format."
          : "Ungültiges E-Mail-Format.",
      );
      return;
    }

    setIsLoading(true);

    try {
      if (view === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        // Register new user
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        // Store extra profile info in Firestore
        await setDoc(doc(db, "users", userCred.user.uid), {
          firstName,
          lastName,
          email,
          phone,
          role: "user",
          createdAt: new Date().toISOString(),
        });
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    en: {
      login: "login",
      register: "register",
      reset: "reset password",
      email: "email",
      password: "password",
      firstName: "first name",
      lastName: "last name",
      phone: "phone (optional)",
      forgot: "forgot password?",
      submitLogin: "sign in",
      submitRegister: "create account",
      submitReset: "send reset link",
      toggleToRegister: "don't have an account? register here",
      toggleToLogin: "already have an account? login here",
      backToLogin: "back to login",
      close: "close",
    },
    de: {
      login: "anmelden",
      register: "registrieren",
      reset: "passwort zurücksetzen",
      email: "e-mail",
      password: "passwort",
      firstName: "vorname",
      lastName: "nachname",
      phone: "telefon (optional)",
      forgot: "passwort vergessen?",
      submitLogin: "einloggen",
      submitRegister: "konto erstellen",
      submitReset: "link senden",
      toggleToRegister: "noch kein konto? hier registrieren",
      toggleToLogin: "bereits ein konto? hier anmelden",
      backToLogin: "zurück zum login",
      close: "schließen",
    },
  }[currentLang || "en"];

  return (
    <>
      {/* 1. AUTOFILL STYLE FIX */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #fffce3 inset !important;
          -webkit-text-fill-color: #1c0700 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .auth-drawer-input {
          transition: background-color 0.2s ease, border-color 0.2s ease !important;
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(28, 7, 0, 0.15)",
          backdropFilter: isOpen
            ? isMobile
              ? "blur(2px)"
              : "blur(6px)"
            : "blur(0px)",
          WebkitBackdropFilter: isOpen
            ? isMobile
              ? "blur(2px)"
              : "blur(6px)"
            : "blur(0px)",
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transition: "opacity 0.5s ease, backdrop-filter 0.5s ease",
        }}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: isMobile ? "90vw" : "420px",
          height: "100dvh",
          backgroundColor: "#fffce3",
          zIndex: 9999,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          padding: isMobile ? "1rem 1.5rem" : "3rem 4rem",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingBottom: "1rem",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseActive(true)}
            onMouseLeave={() => setCloseActive(false)}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "Satoshi",
              fontSize: "0.75rem",
              cursor: "pointer",
              color: closeActive ? "#9960a8" : "#1c0700",
              transition: "color 0.2s ease",
            }}
          >
            <span>{t.close}</span>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: isMobile ? "2.5rem" : "3rem",
              margin: "0 0 1.5rem 0",
              color: "#1c0700",
            }}
          >
            {t[view]}
          </h1>

          {error && <div style={styles.error}>{error}</div>}
          {message && (
            <div style={styles.message}>
              <Info size={14} /> {message}
            </div>
          )}

          <form
            onSubmit={view === "reset" ? handleResetPassword : handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {view === "register" && (
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>{t.firstName}</label>
                  <input
                    className="auth-drawer-input"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>{t.lastName}</label>
                  <input
                    className="auth-drawer-input"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={styles.label}>{t.email}</label>
              <input
                className="auth-drawer-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>

            {view === "register" && (
              <div>
                <label style={styles.label}>{t.phone}</label>
                <input
                  className="auth-drawer-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={styles.input}
                />
              </div>
            )}

            {view !== "reset" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <label style={styles.label}>{t.password}</label>
                  {view === "login" && (
                    <button
                      type="button"
                      onClick={() => setView("reset")}
                      style={styles.forgotBtn}
                    >
                      {t.forgot}
                    </button>
                  )}
                </div>
                <input
                  className="auth-drawer-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
            )}

            <button type="submit" disabled={isLoading} style={styles.button}>
              {isLoading ? (
                <Loader2 size={18} className="spinner" />
              ) : view === "login" ? (
                t.submitLogin
              ) : view === "register" ? (
                t.submitRegister
              ) : (
                t.submitReset
              )}
            </button>
          </form>

          {view === "reset" ? (
            <button onClick={() => setView("login")} style={styles.toggleBtn}>
              <ChevronLeft
                size={14}
                style={{ verticalAlign: "middle", marginRight: "4px" }}
              />
              {t.backToLogin}
            </button>
          ) : (
            <button
              onClick={() => {
                setView(view === "login" ? "register" : "login");
                setError("");
                setMessage("");
              }}
              style={styles.toggleBtn}
            >
              {view === "login" ? t.toggleToRegister : t.toggleToLogin}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  label: {
    fontSize: "0.6rem",
    fontFamily: "Satoshi",
    fontWeight: "bold",
    textTransform: "uppercase",
    opacity: 0.4,
    marginBottom: "4px",
    display: "block",
    letterSpacing: "1px",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    backgroundColor: "rgba(255, 252, 227, 0.5)",
    fontFamily: "Satoshi",
    fontSize: "0.95rem",
    boxSizing: "border-box",
    outline: "none",
    color: "#1c0700",
  },
  button: {
    padding: "14px",
    backgroundColor: "#caaff3",
    border: "none",
    borderRadius: "100px",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#1c0700",
    fontSize: "0.9rem",
    display: "flex",
    justifyContent: "center",
    marginTop: "10px",
    fontFamily: "Satoshi",
    transition: "all 0.2s ease",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#4e5f28",
    fontFamily: "Satoshi",
    fontSize: "0.8rem",
    cursor: "pointer",
    marginTop: "1.5rem",
    width: "100%",
    opacity: 0.7,
    textDecoration: "underline",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    color: "#9960a8",
    fontSize: "0.65rem",
    fontWeight: "bold",
    textTransform: "lowercase",
    cursor: "pointer",
    padding: 0,
    opacity: 0.8,
  },
  error: {
    color: "#ff4d4d",
    fontSize: "0.8rem",
    textAlign: "center",
    marginBottom: "1rem",
    backgroundColor: "#ff4d4d10",
    padding: "10px",
    borderRadius: "12px",
    fontFamily: "Satoshi",
  },
  message: {
    color: "#4e5f28",
    fontSize: "0.8rem",
    textAlign: "center",
    marginBottom: "1rem",
    backgroundColor: "#4e5f2810",
    padding: "10px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    justifyContent: "center",
    fontFamily: "Satoshi",
  },
};
