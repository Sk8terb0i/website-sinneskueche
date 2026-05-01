import { useState, useEffect } from "react";
import Header from "../components/Header/Header";
import CourseTitle from "../components/CourseTitle/CourseTitle";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, CheckCircle, Send } from "lucide-react";
import { useAuth } from "../contexts/AuthContext"; // Import useAuth
import "./Course.css";

const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const getImage = (filename) =>
  planetImages[`../assets/planets/${filename}`]?.default || "";

export default function Contact({ currentLang, setCurrentLang }) {
  const { currentUser, userData } = useAuth(); // Get user data from context
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Autofill logic
  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email || "");
      if (userData?.firstName) {
        setName(`${userData.firstName} ${userData.lastName || ""}`.trim());
      } else if (currentUser.displayName) {
        setName(currentUser.displayName);
      }
    }
  }, [currentUser, userData]);

  const config = {
    desktop: {
      topIcon: { top: "-35px", left: "-60px" },
      bottomIcon: { top: "40px", left: "200px" },
      titleSize: "4.5rem",
    },
    mobile: {
      topIcon: { top: "-10px", left: "-10px" },
      bottomIcon: { top: "15px", left: "calc(100% - 35px)" },
      titleSize: "2.8rem",
    },
  };

  const icons = [getImage("icon_phone_1.png"), getImage("icon_phone_2.png")];

  const content = {
    en: {
      title: "Contact",
      welcome: "Get in touch with us",
      name: "Your Name",
      email: "Your Email",
      subject: "Subject",
      message: "Your Message",
      send: "Send Message",
      sending: "Sending...",
      successTitle: "Message Sent!",
      successDesc:
        "Thank you for reaching out. We will get back to you as soon as possible.",
      sendAnother: "Send another message",
    },
    de: {
      title: "Kontakt",
      welcome: "Schreib uns eine Nachricht",
      name: "Dein Name",
      email: "Deine E-Mail",
      subject: "Betreff",
      message: "Deine Nachricht",
      send: "Nachricht senden",
      sending: "Sendet...",
      successTitle: "Nachricht gesendet!",
      successDesc:
        "Vielen Dank für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.",
      sendAnother: "Weitere Nachricht senden",
    },
  };

  const current = content[currentLang || "en"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "contact_messages"), {
        name,
        email,
        subject,
        message,
        status: "new",
        userId: currentUser?.uid || "guest", // Added userId for internal tracking
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      // Reset only subject and message; keep name/email if user is logged in
      setSubject("");
      setMessage("");
    } catch (error) {
      alert("Error sending message: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    main: {
      maxWidth: "800px",
      margin: "0 auto",
      padding: "160px 20px 80px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      position: "relative",
    },
    welcomeText: {
      fontSize: "0.9rem",
      fontStyle: "italic",
      letterSpacing: "0.15em",
      color: "#1c0700",
      opacity: 0.6,
      marginBottom: "40px",
      fontWeight: "500",
    },
    formContainer: {
      width: "100%",
      backgroundColor: "#fdf8e1",
      padding: window.innerWidth < 768 ? "2rem 1.5rem" : "3rem",
      borderRadius: "32px",
      border: "1px solid rgba(153, 96, 168, 0.15)",
      boxShadow: "0 20px 40px rgba(0,0,0,0.03)",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
      textAlign: "left",
    },
    input: {
      width: "100%",
      padding: "16px 20px",
      borderRadius: "16px",
      border: "1px solid rgba(28, 7, 0, 0.1)",
      backgroundColor: "#fffce3",
      fontSize: "1rem",
      color: "#1c0700",
      fontFamily: "Satoshi, sans-serif",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "16px 20px",
      borderRadius: "16px",
      border: "1px solid rgba(28, 7, 0, 0.1)",
      backgroundColor: "#fffce3",
      fontSize: "1rem",
      color: "#1c0700",
      fontFamily: "Satoshi, sans-serif",
      minHeight: "150px",
      resize: "vertical",
      boxSizing: "border-box",
    },
    submitBtn: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
      width: "100%",
      padding: "18px",
      backgroundColor: "#caaff3",
      color: "#1c0700",
      border: "none",
      borderRadius: "100px",
      fontSize: "1.05rem",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "transform 0.2s, opacity 0.2s",
      marginTop: "10px",
    },
    successBox: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1rem",
      textAlign: "center",
    },
  };

  return (
    <div className="course-container">
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <style>
        {`
          @media (max-width: 768px) {
            .contact-main { padding-top: 100px !important; }
            .course-title-wrapper { margin-bottom: 10px; }
            .submit-btn:active { transform: scale(0.98); }
          }
          .submit-btn:hover { opacity: 0.9; }
        `}
      </style>

      <main style={styles.main} className="contact-main">
        <div className="course-title-wrapper">
          <CourseTitle title={current.title} config={config} icons={icons} />
        </div>

        <p style={styles.welcomeText}>{current.welcome}</p>

        <div style={styles.formContainer}>
          {success ? (
            <div style={styles.successBox}>
              <CheckCircle
                size={60}
                color="#4e5f28"
                style={{ marginBottom: "20px" }}
              />
              <h2
                style={{
                  fontFamily: "Harmond-SemiBoldCondensed",
                  fontSize: "2.5rem",
                  margin: "0 0 10px 0",
                  color: "#1c0700",
                }}
              >
                {current.successTitle}
              </h2>
              <p style={{ opacity: 0.7, marginBottom: "30px" }}>
                {current.successDesc}
              </p>
              <button
                onClick={() => setSuccess(false)}
                style={{
                  ...styles.submitBtn,
                  backgroundColor: "transparent",
                  border: "2px solid #caaff3",
                  width: "auto",
                  padding: "12px 30px",
                }}
              >
                {current.sendAnother}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "1.2rem",
                  flexDirection: window.innerWidth < 768 ? "column" : "row",
                }}
              >
                <input
                  type="text"
                  placeholder={current.name}
                  required
                  style={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder={current.email}
                  required
                  style={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder={current.subject}
                required
                style={styles.input}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                placeholder={current.message}
                required
                style={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                style={styles.submitBtn}
                className="submit-btn"
              >
                {loading ? (
                  <Loader2 className="spinner" size={20} />
                ) : (
                  <Send size={20} />
                )}
                {loading ? current.sending : current.send}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
