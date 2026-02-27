import { CheckCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../Header/Header";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function Success({ currentLang, setCurrentLang }) {
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // Grab the redemption data from the URL
  const redeemedCode = searchParams.get("code");
  const remainingParam = searchParams.get("remaining");

  // BULLETPROOF PARSING:
  // Turns the URL text into a real number, and protects against "undefined" or "null"
  const remainingCredits =
    remainingParam &&
    remainingParam !== "undefined" &&
    remainingParam !== "null"
      ? parseInt(remainingParam, 10)
      : null;

  const content = {
    en: {
      title: "booking successful",
      message: "Thank you for your booking! Your transaction was successful.",
      creditsNote: currentUser
        ? "If you purchased a pack, your credits have been added to your profile and your selected dates are confirmed."
        : "Your selected dates are confirmed. You will receive a confirmation email shortly.",
      redeemNote:
        remainingCredits > 0
          ? `You have ${remainingCredits} ${remainingCredits === 1 ? "session" : "sessions"} left on your code: ${redeemedCode}`
          : `You have used the last session on your code: ${redeemedCode}.`,
      button: "Go to Profile",
      home: "Back to Home",
    },
    de: {
      title: "buchung erfolgreich",
      message:
        "Vielen Dank für deine Buchung! Die Transaktion war erfolgreich.",
      creditsNote: currentUser
        ? "Wenn du eine Karte gekauft hast, wurde das Guthaben deinem Profil hinzugefügt und deine gewählten Termine sind bestätigt."
        : "Deine gewählten Termine sind bestätigt. Du erhältst in Kürze eine Bestätigungs-E-Mail.",
      redeemNote:
        remainingCredits > 0
          ? `Du hast noch ${remainingCredits} ${remainingCredits === 1 ? "Termin" : "Termine"} auf deinem Code übrig: ${redeemedCode}`
          : `Du hast den letzten Termin auf deinem Code aufgebraucht: ${redeemedCode}.`,
      button: "Zum Profil",
      home: "Zurück zur Startseite",
    },
  };

  return (
    <div
      className="course-container"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main style={styles.main}>
        <CheckCircle
          size={80}
          color="#4e5f28"
          style={{ marginBottom: "2rem" }}
        />

        <h1 style={styles.title}>{content[currentLang].title}</h1>

        <p style={styles.message}>{content[currentLang].message}</p>

        {/* If it was a code redemption and we successfully parsed the number, show the purple box! */}
        {redeemedCode && remainingCredits !== null ? (
          <div style={styles.codeBox}>
            <p style={styles.codeText}>{content[currentLang].redeemNote}</p>
          </div>
        ) : (
          <p style={styles.creditsNote}>{content[currentLang].creditsNote}</p>
        )}

        <div style={styles.buttonContainer}>
          {/* Only show "Go to Profile" if a user is logged in */}
          {currentUser && (
            <Link to="/profile" style={styles.primaryBtn}>
              {content[currentLang].button}
            </Link>
          )}

          <Link
            to="/"
            style={currentUser ? styles.secondaryBtn : styles.primaryBtn}
          >
            {content[currentLang].home}
          </Link>
        </div>

        {sessionId && (
          <p style={{ marginTop: "3rem", fontSize: "0.7rem", opacity: 0.4 }}>
            Session ID: {sessionId}
          </p>
        )}
      </main>
    </div>
  );
}

const styles = {
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "120px 20px 40px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "3rem",
    color: "#1c0700",
    marginBottom: "1rem",
    textTransform: "lowercase",
  },
  message: {
    fontSize: "1.1rem",
    color: "#1c0700",
    marginBottom: "1rem",
    fontWeight: "500",
  },
  creditsNote: {
    fontSize: "0.9rem",
    color: "#1c0700",
    opacity: 0.7,
    marginBottom: "2.5rem",
    lineHeight: "1.5",
  },
  codeBox: {
    backgroundColor: "rgba(202, 175, 243, 0.2)",
    padding: "15px 25px",
    borderRadius: "12px",
    border: "1px solid #caaff3",
    marginBottom: "2.5rem",
  },
  codeText: {
    color: "#9960a8",
    fontWeight: "700",
    margin: 0,
    fontSize: "1.05rem",
  },
  buttonContainer: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  primaryBtn: {
    padding: "1rem 2rem",
    backgroundColor: "#9960a8",
    color: "#ffffff",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "700",
    fontFamily: "Satoshi",
  },
  secondaryBtn: {
    padding: "1rem 2rem",
    backgroundColor: "transparent",
    color: "#1c0700",
    border: "1px solid rgba(28, 7, 0, 0.2)",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Satoshi",
  },
};
