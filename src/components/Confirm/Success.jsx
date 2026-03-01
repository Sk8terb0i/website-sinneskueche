import { CheckCircle, Mail, Ticket } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../Header/Header";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function Success({ currentLang, setCurrentLang }) {
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get("session_id");
  const redeemedCode = searchParams.get("code");
  const remainingParam = searchParams.get("remaining");

  // Determine if a pack was part of this transaction based on the presence of redemption data
  // or logic passed back from Stripe (handled by your webhook)
  const remainingCredits =
    remainingParam &&
    remainingParam !== "undefined" &&
    remainingParam !== "null"
      ? parseInt(remainingParam, 10)
      : null;

  const content = {
    en: {
      title: "booking successful",
      message: "Thank you! Your transaction was successful.",
      confirmation:
        "Your selected dates are confirmed. You will receive a confirmation email shortly.",
      memberPack: "Your credits have been added to your profile balance.",
      guestPack:
        "Since you purchased a session pack, we have sent a unique booking code to your email for future use.",
      redeemNote:
        remainingCredits > 0
          ? `You have ${remainingCredits} ${remainingCredits === 1 ? "session" : "sessions"} left on your code: ${redeemedCode}`
          : `You have used the last session on your code: ${redeemedCode}.`,
      button: "Go to Profile",
      home: "Back to Home",
    },
    de: {
      title: "buchung erfolgreich",
      message: "Vielen Dank! Die Transaktion war erfolgreich.",
      confirmation:
        "Deine gewählten Termine sind bestätigt. Du erhältst in Kürze eine Bestätigungs-E-Mail.",
      memberPack: "Dein Guthaben wurde deinem Profil gutgeschrieben.",
      guestPack:
        "Da du eine Karte gekauft hast, haben wir dir einen Buchungscode per E-Mail gesendet.",
      redeemNote:
        remainingCredits > 0
          ? `Du hast noch ${remainingCredits} ${remainingCredits === 1 ? "Termin" : "Termine"} auf deinem Code übrig: ${redeemedCode}`
          : `Du hast den letzten Termin auf deinem Code aufgebraucht: ${redeemedCode}.`,
      button: "Zum Profil",
      home: "Zurück zur Startseite",
    },
  };

  const t = content[currentLang];

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

        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.message}>{t.message}</p>
        <p style={styles.confirmation}>{t.confirmation}</p>

        {/* SCENARIO 1: REDEEMED AN EXISTING CODE */}
        {redeemedCode && remainingCredits !== null && (
          <div style={styles.infoBox}>
            <Ticket size={20} color="#9960a8" />
            <p style={styles.infoText}>{t.redeemNote}</p>
          </div>
        )}

        {/* SCENARIO 2: BOUGHT A PACK AS A GUEST (Non-redemption checkout) */}
        {!currentUser && !redeemedCode && sessionId && (
          <div
            style={{
              ...styles.infoBox,
              backgroundColor: "rgba(78, 95, 40, 0.1)",
              borderColor: "rgba(78, 95, 40, 0.2)",
            }}
          >
            <Mail size={20} color="#4e5f28" />
            <p style={{ ...styles.infoText, color: "#4e5f28" }}>
              {t.guestPack}
            </p>
          </div>
        )}

        {/* SCENARIO 3: BOUGHT A PACK AS A LOGGED-IN USER */}
        {currentUser && !redeemedCode && sessionId && (
          <div style={styles.infoBox}>
            <Ticket size={20} color="#9960a8" />
            <p style={styles.infoText}>{t.memberPack}</p>
          </div>
        )}

        <div style={styles.buttonContainer}>
          {currentUser && (
            <Link to="/profile" style={styles.primaryBtn}>
              {t.button}
            </Link>
          )}

          <Link
            to="/"
            style={currentUser ? styles.secondaryBtn : styles.primaryBtn}
          >
            {t.home}
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
    marginBottom: "0.5rem",
    fontWeight: "700",
  },
  confirmation: {
    fontSize: "0.95rem",
    color: "#1c0700",
    opacity: 0.7,
    marginBottom: "2.5rem",
    lineHeight: "1.5",
  },
  infoBox: {
    backgroundColor: "rgba(202, 175, 243, 0.15)",
    padding: "18px 25px",
    borderRadius: "16px",
    border: "1px solid #caaff3",
    marginBottom: "2.5rem",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
  },
  infoText: {
    color: "#9960a8",
    fontWeight: "700",
    margin: 0,
    fontSize: "0.95rem",
    lineHeight: "1.4",
  },
  buttonContainer: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  primaryBtn: {
    padding: "1rem 2.5rem",
    backgroundColor: "#9960a8",
    color: "#fdf8e1", // Off-white/Cream
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "700",
    fontFamily: "Satoshi",
    transition: "transform 0.2s ease",
  },
  secondaryBtn: {
    padding: "1rem 2.5rem",
    backgroundColor: "transparent",
    color: "#1c0700",
    border: "1px solid rgba(28, 7, 0, 0.2)",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Satoshi",
  },
};
