import React, { useState, useEffect } from "react";
import { auth } from "../../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  LogOut,
  Lock,
  Loader2,
  Calendar as CalendarIcon,
  Tag,
  LayoutGrid,
} from "lucide-react";

// Components & Styles
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

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [activeTab, setActiveTab] = useState("events");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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

  if (!user) {
    return (
      <div style={loginWrapperStyle}>
        <form onSubmit={handleLogin} style={loginCardStyle(isMobile)}>
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
            style={{ ...inputStyle, marginBottom: "1.2rem" }}
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
              onClick={() => sendPasswordResetEmail(auth, email)}
              style={forgotLinkStyle}
            >
              Forgot?
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: "2rem" }}
            required
          />
          <button type="submit" disabled={isLoading} style={btnStyle}>
            {isLoading ? <Loader2 className="spinner" size={18} /> : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: isMobile ? "1.5rem" : "4vw",
        minHeight: "100vh",
        fontFamily: "Satoshi",
        color: "#1c0700",
      }}
    >
      <header style={headerStyle(isMobile)}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: isMobile ? "2.2rem" : "3.5rem",
              marginBottom: "0.2rem",
            }}
          >
            Atelier Management
          </h1>
          <p style={{ opacity: 0.6, fontSize: "0.85rem" }}>
            Admin: {user.email}
          </p>
        </div>
        <button onClick={() => signOut(auth)} style={logoutBtnStyle}>
          <LogOut size={16} /> {!isMobile && "Logout"}
        </button>
      </header>

      {/* --- TAB NAVIGATION --- */}
      <div style={tabContainerStyle}>
        <button
          onClick={() => setActiveTab("events")}
          style={tabButtonStyle(activeTab === "events")}
        >
          <CalendarIcon size={18} /> Events
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          style={tabButtonStyle(activeTab === "pricing")}
        >
          <Tag size={18} /> Pricing
        </button>
        <button
          onClick={() => setActiveTab("rental")}
          style={tabButtonStyle(activeTab === "rental")}
        >
          <LayoutGrid size={18} /> Rental
        </button>
      </div>

      {/* --- DYNAMIC TAB CONTENT --- */}
      {activeTab === "events" && <EventsTab isMobile={isMobile} />}
      {activeTab === "pricing" && <PricingTab isMobile={isMobile} />}
      {activeTab === "rental" && <RentalTab isMobile={isMobile} />}
    </div>
  );
}
