import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import {
  LogOut,
  Lock,
  Loader2,
  Calendar as CalendarIcon,
  Tag,
  LayoutGrid,
  Ticket,
  CreditCard,
  Users,
  FileText,
  Bell,
  CalendarClock,
  Pin,
  Mail,
  Flame,
} from "lucide-react";

// Components & Styles
import Header from "../../components/Header/Header";
import EventsTab from "./EventsTab";
import PricingTab from "./PricingTab";
import RentalTab from "./RentalTab";
import PromotionsTab from "./PromotionsTab";
import PackCodesTab from "./PackCodesTab";
import ProfilesTab from "./ProfilesTab";
import TermsTab from "./TermsTab";
import RemindersTab from "./RemindersTab";
import ScheduleTab from "./ScheduleTab";
import EmailTemplatesTab from "./EmailTemplatesTab";
import FiringTab from "./FiringTab";
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
  const [adminData, setAdminData] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [hasNewRentalRequests, setHasNewRentalRequests] = useState(false);

  const labels = {
    en: {
      loginTitle: "Atelier Login",
      email: "Email",
      password: "Password",
      forgot: "Forgot?",
      signIn: "Sign In",
      fullAdmin: "Full Admin",
      courseAdmin: "Course Admin",
      logout: "Logout",
      events: "Events",
      profiles: "Profiles",
      courseMgmt: "Course Management",
      schedule: "Work Schedule",
      reminders: "Reminders",
      terms: "Terms",
      emails: "Email Templates",
      packCodes: "Pack Codes",
      promotions: "Promotions",
      rental: "Rental",
      defaultView: "Default View",
      setDefault: "Set as Default",
      firing: "Firing Schedule",
    },
    de: {
      loginTitle: "Atelier Login",
      email: "E-Mail",
      password: "Passwort",
      forgot: "Vergessen?",
      signIn: "Anmelden",
      fullAdmin: "Haupt-Admin",
      courseAdmin: "Kurs-Admin",
      logout: "Abmelden",
      events: "Termine",
      profiles: "Profile",
      courseMgmt: "Kurse Verwalten",
      schedule: "Stundenplan",
      reminders: "Erinnerungen",
      terms: "AGB",
      emails: "E-Mail Vorlagen",
      packCodes: "Punkte-Pakete",
      promotions: "Rabattcodes",
      rental: "Vermietung",
      defaultView: "Standardansicht",
      setDefault: "Als Standard setzen",
      firing: "Brennplan",
    },
  }[currentLang || "en"];

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash;
    if (hash.includes("?tab=")) {
      const tabFromUrl = new URLSearchParams(hash.split("?")[1]).get("tab");
      if (tabFromUrl) return tabFromUrl;
    }
    return localStorage.getItem("adminActiveTab") || "events";
  });

  const [defaultTab, setDefaultTab] = useState(() => {
    return localStorage.getItem("adminDefaultTab") || "events";
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const data = userDoc.data();
          if (
            userDoc.exists() &&
            (data.role === "admin" || data.role === "course_admin")
          ) {
            setUser(currentUser);
            setAdminData(data);
            const isFullAdmin = data.role === "admin";
            const savedTab = localStorage.getItem("adminActiveTab") || "events";
            if (
              !isFullAdmin &&
              (savedTab === "profiles" ||
                savedTab === "pack-codes" ||
                savedTab === "rental")
            ) {
              setActiveTab("events");
            }
          } else {
            setUser(null);
            setAdminData(null);
          }
        } catch (error) {
          console.error("Admin check error:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        setAdminData(null);
      }
      setCheckingRole(false);
    });
    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!user || adminData?.role !== "admin") return;
    const unsubscribe = onSnapshot(collection(db, "rent_requests"), (snap) => {
      const hasPending = snap.docs.some((doc) => {
        const data = doc.data();
        return (
          data.status === "pending" || data.status === "new" || !data.status
        );
      });
      setHasNewRentalRequests(hasPending);
    });
    return () => unsubscribe();
  }, [user, adminData]);

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

  const handleSetDefaultTab = () => {
    localStorage.setItem("adminDefaultTab", activeTab);
    setDefaultTab(activeTab);
  };

  if (checkingRole && !user)
    return (
      <div style={{ ...loginWrapperStyle, backgroundColor: "#fffce3" }}>
        <Loader2 className="spinner" size={40} color="#caaff3" />
      </div>
    );

  if (!user || !adminData) {
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
            backgroundColor: "#fdf8e1",
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
              {labels.loginTitle}
            </h1>
          </div>
          <label style={labelStyle}>{labels.email}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              ...inputStyle,
              backgroundColor: "rgba(255, 252, 227, 0.4)",
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
            <label style={labelStyle}>{labels.password}</label>
            <button
              type="button"
              onClick={() => email && sendPasswordResetEmail(auth, email)}
              style={forgotLinkStyle}
            >
              {labels.forgot}
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
            {isLoading ? (
              <Loader2 className="spinner" size={18} />
            ) : (
              labels.signIn
            )}
          </button>
        </form>
      </div>
    );
  }

  const isFullAdmin = adminData.role === "admin";

  const groupStyle = {
    ...tabContainerStyle,
    backgroundColor: "rgba(28, 7, 0, 0.04)",
    borderRadius: "100px",
    padding: "4px",
    display: "flex",
    flexShrink: 0,
    gap: "4px",
  };

  return (
    <div
      style={{
        padding: isMobile ? "100px 1rem 2rem" : "140px 4vw 4vw",
        minHeight: "100vh",
        fontFamily: "Satoshi",
        color: "#1c0700",
        backgroundColor: "#fffce3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />
      <header style={{ ...headerStyle(isMobile), marginBottom: "2rem" }}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: isMobile ? "2.2rem" : "3.5rem",
              marginBottom: "0.2rem",
              textTransform: "lowercase",
            }}
          >
            atelier management
          </h1>
          <p
            style={{
              opacity: 0.5,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {isFullAdmin ? labels.fullAdmin : labels.courseAdmin}: {user.email}
          </p>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{
            ...logoutBtnStyle,
            backgroundColor: "#fdf8e1",
            border: "1px solid rgba(28, 7, 0, 0.1)",
            borderRadius: "100px",
            padding: "8px 16px",
          }}
        >
          <LogOut size={16} /> {!isMobile && labels.logout}
        </button>
      </header>

      {/* HORIZONTAL TAB NAVIGATION WITH GROUPS */}
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          paddingBottom: "10px",
          marginBottom: "1rem",
          display: "flex",
          flexWrap: isMobile ? "nowrap" : "wrap",
          gap: "1.5rem",
        }}
        className="hide-scrollbar"
      >
        <div style={groupStyle}>
          <button
            onClick={() => setActiveTab("events")}
            style={{
              ...tabButtonStyle(activeTab === "events"),
              backgroundColor:
                activeTab === "events" ? "#caaff3" : "transparent",
              borderRadius: "100px",
              color: "#1c0700",
            }}
          >
            <CalendarIcon size={16} /> {labels.events}
          </button>
          {isFullAdmin && (
            <button
              onClick={() => setActiveTab("profiles")}
              style={{
                ...tabButtonStyle(activeTab === "profiles"),
                backgroundColor:
                  activeTab === "profiles" ? "#caaff3" : "transparent",
                borderRadius: "100px",
                color: "#1c0700",
              }}
            >
              <Users size={16} /> {labels.profiles}
            </button>
          )}
        </div>

        <div style={groupStyle}>
          <button
            onClick={() => setActiveTab("course-management")}
            style={{
              ...tabButtonStyle(activeTab === "course-management"),
              backgroundColor:
                activeTab === "course-management" ? "#caaff3" : "transparent",
              borderRadius: "100px",
              color: "#1c0700",
            }}
          >
            <Tag size={16} /> {labels.courseMgmt}
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            style={{
              ...tabButtonStyle(activeTab === "schedule"),
              backgroundColor:
                activeTab === "schedule" ? "#caaff3" : "transparent",
              borderRadius: "100px",
              color: "#1c0700",
            }}
          >
            <CalendarClock size={16} /> {labels.schedule}
          </button>

          <button
            onClick={() => setActiveTab("reminders")}
            style={{
              ...tabButtonStyle(activeTab === "reminders"),
              backgroundColor:
                activeTab === "reminders" ? "#caaff3" : "transparent",
              borderRadius: "100px",
              color: "#1c0700",
            }}
          >
            <Bell size={16} /> {labels.reminders}
          </button>
          <button
            onClick={() => setActiveTab("terms")}
            style={{
              ...tabButtonStyle(activeTab === "terms"),
              backgroundColor:
                activeTab === "terms" ? "#caaff3" : "transparent",
              borderRadius: "100px",
              color: "#1c0700",
            }}
          >
            <FileText size={16} /> {labels.terms}
          </button>
          <button
            onClick={() => setActiveTab("emails")}
            style={{
              ...tabButtonStyle(activeTab === "emails"),
              backgroundColor:
                activeTab === "emails" ? "#caaff3" : "transparent",
              borderRadius: "100px",
              color: "#1c0700",
            }}
          >
            <Mail size={16} /> {labels.emails}
          </button>
        </div>

        <div style={groupStyle}>
          {isFullAdmin && (
            <button
              onClick={() => setActiveTab("pack-codes")}
              style={{
                ...tabButtonStyle(activeTab === "pack-codes"),
                backgroundColor:
                  activeTab === "pack-codes" ? "#caaff3" : "transparent",
                borderRadius: "100px",
                color: "#1c0700",
              }}
            >
              <CreditCard size={16} /> {labels.packCodes}
            </button>
          )}
          <button
            onClick={() => setActiveTab("promotions")}
            style={{
              ...tabButtonStyle(activeTab === "promotions"),
              backgroundColor:
                activeTab === "promotions" ? "#caaff3" : "transparent",
              borderRadius: "100px",
              color: "#1c0700",
            }}
          >
            <Ticket size={16} /> {labels.promotions}
          </button>
        </div>

        {isFullAdmin && (
          <div style={groupStyle}>
            <button
              onClick={() => setActiveTab("rental")}
              style={{
                ...tabButtonStyle(activeTab === "rental"),
                backgroundColor:
                  activeTab === "rental" ? "#caaff3" : "transparent",
                borderRadius: "100px",
                color: "#1c0700",
                position: "relative",
              }}
            >
              <LayoutGrid size={16} /> {labels.rental}
              {hasNewRentalRequests && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#ff4d4d",
                    borderRadius: "50%",
                  }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("firing")}
              style={{
                ...tabButtonStyle(activeTab === "firing"),
                backgroundColor:
                  activeTab === "firing" ? "#caaff3" : "transparent",
                borderRadius: "100px",
                color: "#1c0700",
              }}
            >
              <Flame size={16} /> {labels.firing}
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1.5rem",
        }}
      >
        <button
          onClick={handleSetDefaultTab}
          style={{
            background: "none",
            border: "none",
            color: defaultTab === activeTab ? "#9960a8" : "#4e5f28",
            cursor: "pointer",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: "700",
            opacity: defaultTab === activeTab ? 1 : 0.6,
            padding: "4px 8px",
            borderRadius: "8px",
            backgroundColor:
              defaultTab === activeTab
                ? "rgba(202, 175, 243, 0.15)"
                : "transparent",
            transition: "all 0.2s ease",
          }}
        >
          <Pin size={14} fill={defaultTab === activeTab ? "#9960a8" : "none"} />
          {defaultTab === activeTab ? labels.defaultView : labels.setDefault}
        </button>
      </div>

      <div style={{ animation: "fadeIn 0.4s ease-out" }}>
        {activeTab === "events" && (
          <EventsTab
            isMobile={isMobile}
            currentLang={currentLang}
            userRole={adminData.role}
            allowedCourses={adminData.allowedCourses || []}
          />
        )}
        {activeTab === "profiles" && isFullAdmin && (
          <ProfilesTab
            isMobile={isMobile}
            currentUserRole={adminData.role}
            currentLang={currentLang}
          />
        )}
        {activeTab === "course-management" && (
          <PricingTab
            isMobile={isMobile}
            userRole={adminData.role}
            allowedCourses={adminData.allowedCourses || []}
            currentLang={currentLang}
          />
        )}
        {activeTab === "schedule" && (
          <ScheduleTab
            isMobile={isMobile}
            userRole={adminData.role}
            allowedCourses={adminData.allowedCourses || []}
            currentLang={currentLang}
          />
        )}
        {activeTab === "promotions" && (
          <PromotionsTab
            isMobile={isMobile}
            currentLang={currentLang}
            userRole={adminData.role}
            allowedCourses={adminData.allowedCourses || []}
          />
        )}
        {activeTab === "reminders" && (
          <RemindersTab
            isMobile={isMobile}
            userRole={adminData.role}
            allowedCourses={adminData.allowedCourses || []}
            currentLang={currentLang}
          />
        )}
        {activeTab === "terms" && (
          <TermsTab
            isMobile={isMobile}
            userRole={adminData.role}
            allowedCourses={adminData.allowedCourses || []}
          />
        )}
        {activeTab === "emails" && (
          <EmailTemplatesTab isMobile={isMobile} currentLang={currentLang} />
        )}
        {isFullAdmin && (
          <>
            {activeTab === "pack-codes" && (
              <PackCodesTab isMobile={isMobile} currentLang={currentLang} />
            )}
            {activeTab === "rental" && (
              <RentalTab isMobile={isMobile} currentLang={currentLang} />
            )}
            {activeTab === "firing" && (
              <FiringTab isMobile={isMobile} currentLang={currentLang} />
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
