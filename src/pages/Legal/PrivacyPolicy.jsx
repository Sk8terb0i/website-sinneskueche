import React, { useState } from "react";
import Header from "../../components/Header/Header";

export default function PrivacyPolicy({ currentLang, setCurrentLang }) {
  // --- ADDED: Local Menu State ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const styles = {
    container: {
      padding: "160px 20px 80px",
      maxWidth: "800px",
      margin: "0 auto",
      fontFamily: "Satoshi",
      color: "#1c0700",
      lineHeight: "1.7",
    },
    title: {
      fontFamily: "Harmond-SemiBoldCondensed",
      fontSize: "3.5rem",
      marginBottom: "2.5rem",
    },
    sectionTitle: {
      fontFamily: "Harmond-SemiBoldCondensed",
      fontSize: "1.8rem",
      marginTop: "3rem",
      marginBottom: "1rem",
      color: "#9960a8",
    },
    text: {
      opacity: 0.8,
      fontSize: "1.05rem",
      marginBottom: "1.5rem",
    },
  };

  const content = {
    en: {
      title: "privacy policy",
      intro:
        "Your privacy is a priority at Sinnesküche. This policy explains how we handle your data when you visit our site or book a course.",
      sections: [
        {
          t: "1. responsible party",
          c: "Responsible for data processing: Atelier Sinnesküche, Sägestrasse 11, 8952 Schlieren, Switzerland. For any questions, contact us at hallo@sinneskueche.ch.",
        },
        {
          t: "2. data we collect",
          c: "When you create a profile, we store your name, email address, and phone number in Firebase (Google Cloud). This data is used exclusively to manage your account and bookings. We do not share this personal profile data with third parties for marketing purposes.",
        },
        {
          t: "3. payments (stripe)",
          c: "Payments are processed via Stripe. To facilitate your booking, necessary data is shared with Stripe. We do not store your credit card details on our servers; Stripe acts as an independent controller for this financial data.",
        },
        {
          t: "4. communication (brevo)",
          c: "We use Brevo to send automated booking confirmations and essential updates. Your email address is shared with Brevo solely for the purpose of delivering these service-related messages.",
        },
        {
          t: "5. analytics & maps",
          c: "To improve our website, we use Google Analytics. We also use embedded Google Maps to help you find our location. These services may collect your IP address and use cookies to track usage behavior.",
        },
        {
          t: "6. data retention",
          c: "Your profile and associated data will be automatically deleted after 2 years of account inactivity. You may also request deletion at any time.",
        },
        {
          t: "7. your rights",
          c: "You have the right to access, correct, or delete your personal data. Please reach out to hallo@sinneskueche.ch to exercise these rights.",
        },
      ],
    },
    de: {
      title: "datenschutzerklärung",
      intro:
        "Ihre Privatsphäre hat bei der Sinnesküche Priorität. Diese Richtlinie erklärt, wie wir mit Ihren Daten umgehen.",
      sections: [
        {
          t: "1. verantwortliche stelle",
          c: "Verantwortlich für die Datenverarbeitung: Atelier Sinnesküche, Sägestrasse 11, 8952 Schlieren, Schweiz. Bei Fragen wenden Sie sich an hallo@sinneskueche.ch.",
        },
        {
          t: "2. erhobene daten",
          c: "Wenn Sie ein Profil erstellen, speichern wir Ihren Namen, Ihre E-Mail-Adresse und Ihre Telefonnummer in Firebase (Google Cloud). Diese Daten werden ausschliesslich zur Verwaltung Ihres Kontos und Ihrer Buchungen verwendet. Wir geben diese Profildaten nicht zu Marketingzwecken an Dritte weiter.",
        },
        {
          t: "3. zahlungen (stripe)",
          c: "Zahlungen werden über Stripe abgewickelt. Zur Durchführung Ihrer Buchung werden notwendige Daten an Stripe übermittelt. Wir speichern keine Kreditkartendaten auf unseren Servern.",
        },
        {
          t: "4. kommunikation (brevo)",
          c: "Wir nutzen Brevo für den Versand automatisierter Buchungsbestätigungen. Ihre E-Mail-Adresse wird ausschliesslich zum Zweck der Zustellung dieser Servicenachrichten an Brevo weitergegeben.",
        },
        {
          t: "5. analyse & karten",
          c: "Zur Verbesserung unserer Website nutzen wir Google Analytics. Zudem verwenden wir Google Maps zur Darstellung unseres Standorts. Diese Dienste können Ihre IP-Adresse erfassen und Cookies zur Analyse verwenden.",
        },
        {
          t: "6. datenaufbewahrung",
          c: "Ihr Profil und die damit verbundenen Daten werden nach 2 Jahren Inaktivität automatisch gelöscht. Sie können auch jederzeit eine Löschung beantragen.",
        },
        {
          t: "7. ihre rechte",
          c: "Sie haben das Recht auf Auskunft, Berichtigung oder Löschung Ihrer Daten. Kontaktieren Sie uns hierfür unter hallo@sinneskueche.ch.",
        },
      ],
    },
  };

  const active = content[currentLang] || content.en;

  return (
    <div style={{ backgroundColor: "#fffce3", minHeight: "100vh" }}>
      {/* --- UPDATED: Header with state --- */}
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main style={styles.container}>
        <h1 style={styles.title}>{active.title}</h1>
        <p style={styles.text}>{active.intro}</p>

        {active.sections.map((section, index) => (
          <div key={index}>
            <h2 style={styles.sectionTitle}>{section.t}</h2>
            <p style={styles.text}>{section.c}</p>
          </div>
        ))}

        <div style={{ marginTop: "4rem", fontSize: "0.8rem", opacity: 0.4 }}>
          {currentLang === "en"
            ? "Last updated: April 2026"
            : "Stand: April 2026"}
        </div>
      </main>
    </div>
  );
}
