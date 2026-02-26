import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  LogOut,
  Lock,
  Loader2,
  Calendar as CalendarIcon,
  Tag,
  LayoutGrid,
} from "lucide-react";

// Components & Styles
import Header from "../../components/Header/Header"; // Imported from path provided
import EventsTab from "./EventsTab";
import PricingTab from "./PricingTab";
import RentalTab from "./RentalTab";
import {
  loginWrapperStyle,
  loginCardStyle,
  headerStyle,
  logoutBtnStyle,
  tabContainerStyle,
  tabButtonStyle,
  labelStyle,
  inputStyle,
  btnStyle,
  forgotLinkStyle,
} from "./AdminStyles";

export default function Admin({ currentLang, setCurrentLang }) {
  const [user, setUser] = useState(null);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [activeTab, setActiveTab] = useState("events");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            setUser(currentUser);
            setIsAdminRole(true);
          } else {
            setUser(null);
            setIsAdminRole(false);
          }
        } catch (error) {
          console.error("Admin check error:", error);
          setUser(null);
          setIsAdminRole(false);
        }
      } else {
        setUser(null);
        setIsAdminRole(false);
      }
      setCheckingRole(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading Screen (Matches Profile palette)
  if (checkingRole && !user) {
    return (
      <div style={{ ...loginWrapperStyle, backgroundColor: "#fffce3" }}>
        <Loader2 className="spinner" size={40} color="#caaff3" />
      </div>
    );
  }

  // --- LOGIN VIEW (NO PURE WHITE) ---
  if (!user || !isAdminRole) {
    return (
      <div style={{ ...loginWrapperStyle, backgroundColor: "#fffce3" }}>
        <Header
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          isMenuOpen={isMenuOpen}
          onMenuToggle={setIsMenuOpen}
        />
        <form
          onSubmit={handleLogin}
          style={{
            ...loginCardStyle(isMobile),
            backgroundColor: "#fdf8e1", // Card background
            border: "1px solid rgba(28, 7, 0, 0.05)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <Lock
              size={isMobile ? 32 : 40}
              color="#caaff3"
              style={{ marginBottom: "1rem" }}
            />
            <h1
              style={{
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "2rem",
                color: "#1c0700",
              }}
            >
              Atelier Login
            </h1>
          </div>

          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              ...inputStyle,
              backgroundColor: "rgba(255, 252, 227, 0.4)", // Themed input
              border: "1px solid rgba(28, 7, 0, 0.1)",
              marginBottom: "1.2rem",
            }}
            required
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <label style={labelStyle}>Password</label>
            <button
              type="button"
              onClick={() => {
                if (email) sendPasswordResetEmail(auth, email);
              }}
              style={forgotLinkStyle}
            >
              Forgot?
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              ...inputStyle,
              backgroundColor: "rgba(255, 252, 227, 0.4)",
              border: "1px solid rgba(28, 7, 0, 0.1)",
              marginBottom: "2rem",
            }}
            required
          />
          <button type="submit" disabled={isLoading} style={btnStyle}>
            {isLoading ? <Loader2 className="spinner" size={18} /> : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  // --- DASHBOARD VIEW (NO PURE WHITE) ---
  return (
    <div
      style={{
        padding: isMobile ? "100px 1.5rem 1.5rem" : "140px 4vw 4vw", // Space for fixed header
        minHeight: "100vh",
        fontFamily: "Satoshi",
        color: "#1c0700",
        backgroundColor: "#fffce3",
      }}
    >
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <header style={{ ...headerStyle(isMobile), marginBottom: "3rem" }}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: isMobile ? "2.5rem" : "3.5rem",
              marginBottom: "0.2rem",
              textTransform: "lowercase",
            }}
          >
            atelier management
          </h1>
          <p
            style={{
              opacity: 0.5,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Admin: {user.email}
          </p>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{
            ...logoutBtnStyle,
            backgroundColor: "#fdf8e1",
            border: "1px solid rgba(28, 7, 0, 0.1)",
            borderRadius: "100px",
          }}
        >
          <LogOut size={16} /> {!isMobile && "Logout"}
        </button>
      </header>

      {/* --- TAB NAVIGATION (Pill-style) --- */}
      <div
        style={{
          ...tabContainerStyle,
          backgroundColor: "rgba(28, 7, 0, 0.03)",
          borderRadius: "100px",
          padding: "6px",
          display: "inline-flex",
        }}
      >
        <button
          onClick={() => setActiveTab("events")}
          style={{
            ...tabButtonStyle(activeTab === "events"),
            backgroundColor: activeTab === "events" ? "#caaff3" : "transparent",
            borderRadius: "100px",
            color: "#1c0700",
          }}
        >
          <CalendarIcon size={18} /> Events
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          style={{
            ...tabButtonStyle(activeTab === "pricing"),
            backgroundColor:
              activeTab === "pricing" ? "#caaff3" : "transparent",
            borderRadius: "100px",
            color: "#1c0700",
          }}
        >
          <Tag size={18} /> Pricing
        </button>
        <button
          onClick={() => setActiveTab("rental")}
          style={{
            ...tabButtonStyle(activeTab === "rental"),
            backgroundColor: activeTab === "rental" ? "#caaff3" : "transparent",
            borderRadius: "100px",
            color: "#1c0700",
          }}
        >
          <LayoutGrid size={18} /> Rental
        </button>
      </div>

      <div style={{ animation: "fadeIn 0.4s ease-out", marginTop: "2.5rem" }}>
        {activeTab === "events" && <EventsTab isMobile={isMobile} />}
        {activeTab === "pricing" && <PricingTab isMobile={isMobile} />}
        {activeTab === "rental" && <RentalTab isMobile={isMobile} />}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
