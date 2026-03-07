import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
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
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Settings,
  Check,
  GripVertical,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  Trash2,
  Paintbrush,
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
import MessagesTab from "./MessagesTab";
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
  const [isCustomizingNav, setIsCustomizingNav] = useState(false);

  const [navConfig, setNavConfig] = useState(null);
  const [pendingRentalCount, setPendingRentalCount] = useState(0);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 900;
  const isCompactNav = windowWidth < 1850;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const labels = {
    en: {
      loginTitle: "Atelier Login",
      email: "Email",
      password: "Password",
      forgot: "Forgot?",
      signIn: "Sign In",
      fullAdmin: "Admin",
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
      messages: "Messages",
      customize: "Customize Nav",
      save: "Save Layout",
      addGroup: "Add Group",
      deleteGroup: "Delete Group",
      groupName: "Group Name",
      setGroupColor: "Set Group Color",
    },
    de: {
      loginTitle: "Atelier Login",
      email: "E-Mail",
      password: "Passwort",
      forgot: "Vergessen?",
      signIn: "Anmelden",
      fullAdmin: "Admin",
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
      messages: "Nachrichten",
      customize: "Nav anpassen",
      save: "Layout speichern",
      addGroup: "Gruppe hinzufügen",
      deleteGroup: "Gruppe löschen",
      groupName: "Gruppenname",
      setGroupColor: "Gruppenfarbe setzen",
    },
  }[currentLang || "en"];

  const DEFAULT_NAV = {
    groups: [
      {
        id: "g1",
        name: { en: "Management", de: "Verwaltung" },
        items: ["events", "profiles"],
      },
      {
        id: "g2",
        name: { en: "Tools", de: "Werkzeuge" },
        items: [
          "course-management",
          "schedule",
          "reminders",
          "terms",
          "emails",
        ],
      },
      {
        id: "g3",
        name: { en: "Marketing", de: "Marketing" },
        items: ["pack-codes", "promotions"],
      },
      {
        id: "g4",
        name: { en: "Studio", de: "Studio" },
        items: ["firing", "messages", "rental"],
      },
    ],
    tabSettings: {},
  };

  const TAB_META = {
    events: {
      icon: <CalendarIcon size={18} />,
      label: labels.events,
      adminOnly: false,
    },
    profiles: {
      icon: <Users size={18} />,
      label: labels.profiles,
      adminOnly: true,
    },
    "course-management": {
      icon: <Tag size={18} />,
      label: labels.courseMgmt,
      adminOnly: false,
    },
    schedule: {
      icon: <CalendarClock size={18} />,
      label: labels.schedule,
      adminOnly: false,
    },
    reminders: {
      icon: <Bell size={18} />,
      label: labels.reminders,
      adminOnly: false,
    },
    terms: {
      icon: <FileText size={18} />,
      label: labels.terms,
      adminOnly: false,
    },
    emails: {
      icon: <Mail size={18} />,
      label: labels.emails,
      adminOnly: false,
    },
    "pack-codes": {
      icon: <CreditCard size={18} />,
      label: labels.packCodes,
      adminOnly: true,
    },
    promotions: {
      icon: <Ticket size={18} />,
      label: labels.promotions,
      adminOnly: false,
    },
    rental: {
      icon: <LayoutGrid size={18} />,
      label: labels.rental,
      adminOnly: true,
    },
    firing: {
      icon: <Flame size={18} />,
      label: labels.firing,
      adminOnly: true,
    },
    messages: {
      icon: <MessageSquare size={18} />,
      label: labels.messages,
      adminOnly: true,
    },
  };

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
    const handleResize = () => setWindowWidth(window.innerWidth);
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
            setNavConfig(data.navConfig || DEFAULT_NAV);
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

  const handleSaveNav = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { navConfig: navConfig });
      setIsCustomizingNav(false);
    } catch (e) {
      alert("Error saving layout: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addGroup = () => {
    setNavConfig((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        {
          id: Date.now().toString(),
          name: { en: "New Group", de: "Neue Gruppe" },
          items: [],
        },
      ],
    }));
  };

  const deleteGroup = (groupIdx) => {
    if (navConfig.groups.length <= 1)
      return alert("You must have at least one group.");
    const newConfig = { ...navConfig };
    const itemsToMove = newConfig.groups[groupIdx].items;
    newConfig.groups.splice(groupIdx, 1);
    newConfig.groups[0].items = [...newConfig.groups[0].items, ...itemsToMove];
    setNavConfig(newConfig);
  };

  const moveItem = (groupIdx, itemIdx, direction) => {
    const newConfig = { ...navConfig };
    const items = [...newConfig.groups[groupIdx].items];
    const targetIdx = direction === "up" ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    [items[itemIdx], items[targetIdx]] = [items[targetIdx], items[itemIdx]];
    newConfig.groups[groupIdx].items = items;
    setNavConfig(newConfig);
  };

  const updateGroupName = (groupIdx, lang, val) => {
    const newConfig = { ...navConfig };
    newConfig.groups[groupIdx].name[lang] = val;
    setNavConfig(newConfig);
  };

  const updateTabColor = (tabKey, color) => {
    setNavConfig((prev) => ({
      ...prev,
      tabSettings: {
        ...prev.tabSettings,
        [tabKey]: { ...prev.tabSettings[tabKey], color },
      },
    }));
  };

  const updateGroupColor = (groupIdx, color) => {
    const newConfig = { ...navConfig };
    const items = newConfig.groups[groupIdx].items;
    items.forEach((tabKey) => {
      newConfig.tabSettings[tabKey] = {
        ...newConfig.tabSettings[tabKey],
        color,
      };
    });
    setNavConfig(newConfig);
  };

  // Logic to determine if a group has a uniform color
  const getGroupUniformColor = (items) => {
    if (items.length === 0) return null;
    const colors = items.map(
      (id) => navConfig?.tabSettings?.[id]?.color || "#caaff3",
    );
    const firstColor = colors[0];
    return colors.every((c) => c === firstColor) ? firstColor : null;
  };

  useEffect(() => {
    if (!user || adminData?.role !== "admin") return;
    const unsubscribe = onSnapshot(collection(db, "rent_requests"), (snap) => {
      const pending = snap.docs.filter((doc) => {
        const data = doc.data();
        return (
          data.status === "pending" || data.status === "new" || !data.status
        );
      });
      setPendingRentalCount(pending.length);
    });
    return () => unsubscribe();
  }, [user, adminData]);

  useEffect(() => {
    if (!user || adminData?.role !== "admin") return;
    const unsubscribe = onSnapshot(
      collection(db, "contact_messages"),
      (snap) => {
        const unread = snap.docs.filter((doc) => doc.data().status === "new");
        setPendingMessageCount(unread.length);
      },
    );
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

  const TabBadge = ({ count }) => {
    if (count <= 0) return null;
    return (
      <span
        style={{
          backgroundColor: "#9960a8",
          color: "white",
          fontSize: "10px",
          fontWeight: "bold",
          padding: "2px 6px",
          borderRadius: "10px",
          marginLeft: "6px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "18px",
          height: "18px",
          lineHeight: 1,
        }}
      >
        {count}
      </span>
    );
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

  const visibleGroups =
    navConfig?.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((itemKey) => {
          const meta = TAB_META[itemKey];
          if (!meta) return false;
          return meta.adminOnly ? isFullAdmin : true;
        }),
      }))
      .filter((g) => g.items.length > 0) || [];

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
              fontSize: isMobile ? "2rem" : "3.5rem",
              marginBottom: "0.2rem",
              textTransform: "lowercase",
            }}
          >
            atelier management
          </h1>
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <p
              style={{
                opacity: 0.5,
                fontSize: "0.75rem",
              }}
            >
              {isFullAdmin ? labels.fullAdmin : labels.courseAdmin}:{" "}
              {adminData?.firstName || user.email}
            </p>
            <button
              onClick={() =>
                isCustomizingNav ? handleSaveNav() : setIsCustomizingNav(true)
              }
              style={{
                background: isCustomizingNav
                  ? "#4e5f28"
                  : "rgba(202, 175, 243, 0.2)",
                color: isCustomizingNav ? "white" : "#9960a8",
                border: "none",
                borderRadius: "100px",
                padding: "4px 12px",
                fontSize: isMobile ? "8px" : "11px",
                fontWeight: isMobile ? "500" : "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {isCustomizingNav ? <Check size={14} /> : <Settings size={14} />}
              {isCustomizingNav ? labels.save : labels.customize}
            </button>
          </div>
        </div>
      </header>

      {isCustomizingNav ? (
        /* --- CUSTOMIZATION UI --- */
        <div
          style={{
            backgroundColor: "rgba(28, 7, 0, 0.03)",
            padding: "2rem",
            borderRadius: "24px",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "2rem",
            }}
          >
            {navConfig.groups.map((group, gIdx) => {
              const uniformColor = getGroupUniformColor(group.items);
              return (
                <div
                  key={group.id}
                  style={{
                    backgroundColor: "white",
                    padding: "1.5rem",
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          fontSize: "10px",
                          fontWeight: "900",
                          opacity: 0.5,
                        }}
                      >
                        {labels.groupName} (EN / DE)
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          marginTop: "5px",
                        }}
                      >
                        <input
                          style={{ ...inputStyle, padding: "8px" }}
                          value={group.name.en}
                          onChange={(e) =>
                            updateGroupName(gIdx, "en", e.target.value)
                          }
                        />
                        <input
                          style={{ ...inputStyle, padding: "8px" }}
                          value={group.name.de}
                          onChange={(e) =>
                            updateGroupName(gIdx, "de", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "5px",
                        marginLeft: "10px",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "8px",
                          fontWeight: "900",
                          opacity: 0.5,
                        }}
                      >
                        {labels.setGroupColor}
                      </label>
                      <div style={{ position: "relative" }}>
                        <Paintbrush
                          size={14}
                          style={{
                            position: "absolute",
                            pointerEvents: "none",
                            top: "5px",
                            left: "5px",
                            opacity: 0.5,
                          }}
                        />
                        <input
                          type="color"
                          value={uniformColor || "#caaff3"}
                          onChange={(e) =>
                            updateGroupColor(gIdx, e.target.value)
                          }
                          style={{
                            width: "24px",
                            height: "24px",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                          }}
                        />
                      </div>
                      <button
                        onClick={() => deleteGroup(gIdx)}
                        style={{
                          border: "none",
                          background: "rgba(255, 77, 77, 0.1)",
                          color: "#ff4d4d",
                          padding: "5px",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      border: uniformColor
                        ? `2px solid ${uniformColor}`
                        : "none",
                      padding: uniformColor ? "10px" : "0",
                      borderRadius: "12px",
                    }}
                  >
                    {group.items.map((item, iIdx) => {
                      const meta = TAB_META[item];
                      const settings = navConfig.tabSettings?.[item] || {};
                      return (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px",
                            border: uniformColor
                              ? "1px solid rgba(0,0,0,0.05)"
                              : `2px solid ${settings.color || "#caaff3"}`,
                            borderRadius: "10px",
                          }}
                        >
                          <GripVertical size={16} style={{ opacity: 0.3 }} />
                          <div
                            style={{
                              flex: 1,
                              fontWeight: "700",
                              fontSize: "14px",
                            }}
                          >
                            {meta?.label}
                          </div>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <input
                              type="color"
                              value={settings.color || "#caaff3"}
                              onChange={(e) =>
                                updateTabColor(item, e.target.value)
                              }
                              style={{
                                width: "20px",
                                height: "20px",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                              }}
                            />
                            <button
                              onClick={() => moveItem(gIdx, iIdx, "up")}
                              style={{
                                border: "none",
                                background: "#f5f5f5",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              onClick={() => moveItem(gIdx, iIdx, "down")}
                              style={{
                                border: "none",
                                background: "#f5f5f5",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button
              onClick={addGroup}
              style={{
                height: "fit-content",
                border: "2px dashed rgba(78, 95, 40, 0.2)",
                color: "#4e5f28",
                padding: "2rem",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                background: "none",
                cursor: "pointer",
              }}
            >
              <PlusCircle size={32} /> {labels.addGroup}
            </button>
          </div>
        </div>
      ) : isCompactNav ? (
        /* --- COMPACT SELECTOR --- */
        <div
          style={{ marginBottom: "1.5rem", position: "relative", zIndex: 100 }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                backgroundColor:
                  navConfig?.tabSettings?.[activeTab]?.color || "#caaff3",
                borderRadius: "16px",
                border: "none",
                color: "#1c0700",
                fontWeight: "800",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {TAB_META[activeTab]?.icon} {TAB_META[activeTab]?.label}
                {activeTab === "rental" && (
                  <TabBadge count={pendingRentalCount} />
                )}
                {activeTab === "messages" && (
                  <TabBadge count={pendingMessageCount} />
                )}
              </div>
              {isMobileMenuOpen ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
            <button
              onClick={handleSetDefaultTab}
              style={{
                padding: "14px",
                borderRadius: "16px",
                border: "1px solid rgba(28, 7, 0, 0.1)",
                backgroundColor:
                  defaultTab === activeTab
                    ? "rgba(153, 96, 168, 0.1)"
                    : "#fdf8e1",
                color: defaultTab === activeTab ? "#9960a8" : "#1c070040",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Pin
                size={20}
                fill={defaultTab === activeTab ? "#9960a8" : "none"}
              />
            </button>
          </div>

          {isMobileMenuOpen && (
            <div
              style={{
                marginTop: "8px",
                backgroundColor: "#fdf8e1",
                borderRadius: "24px",
                padding: "12px",
                border: "1px solid rgba(28, 7, 0, 0.1)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                maxHeight: "65vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {visibleGroups.map((group) => {
                const uniformColor = getGroupUniformColor(group.items);
                return (
                  <div
                    key={group.id}
                    style={{
                      border: uniformColor
                        ? `2px solid ${uniformColor}`
                        : "none",
                      borderRadius: "16px",
                      padding: uniformColor ? "8px" : "0",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: "900",
                        textTransform: "uppercase",
                        color: "#4e5f28",
                        opacity: 0.6,
                        marginBottom: "8px",
                        paddingLeft: "8px",
                      }}
                    >
                      {group.name[currentLang || "en"]}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {group.items.map((tabKey) => {
                        const tabColor =
                          navConfig?.tabSettings?.[tabKey]?.color || "#caaff3";
                        return (
                          <button
                            key={tabKey}
                            onClick={() => {
                              setActiveTab(tabKey);
                              setIsMobileMenuOpen(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              border: uniformColor
                                ? "none"
                                : `2px solid ${tabColor}`,
                              backgroundColor:
                                activeTab === tabKey ? tabColor : "transparent",
                              color: "#1c0700",
                              fontWeight: activeTab === tabKey ? "800" : "500",
                              fontSize: "0.95rem",
                              textAlign: "left",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flex: 1,
                              }}
                            >
                              {TAB_META[tabKey].icon} {TAB_META[tabKey].label}
                            </div>
                            {tabKey === "rental" && (
                              <TabBadge count={pendingRentalCount} />
                            )}
                            {tabKey === "messages" && (
                              <TabBadge count={pendingMessageCount} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* --- HORIZONTAL NAV --- */
        <>
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              paddingBottom: "10px",
              marginBottom: "1rem",
              display: "flex",
              gap: "1.5rem",
            }}
            className="hide-scrollbar"
          >
            {visibleGroups.map((group) => {
              const uniformColor = getGroupUniformColor(group.items);
              return (
                <div
                  key={group.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "900",
                      textTransform: "uppercase",
                      opacity: 0.4,
                      marginLeft: "12px",
                    }}
                  >
                    {group.name[currentLang || "en"]}
                  </span>
                  <div
                    style={{
                      ...tabContainerStyle,
                      backgroundColor: "rgba(28, 7, 0, 0.04)",
                      borderRadius: "100px",
                      padding: "4px",
                      display: "flex",
                      gap: "4px",
                      border: uniformColor
                        ? `2px solid ${uniformColor}`
                        : "none",
                    }}
                  >
                    {group.items.map((tabKey) => {
                      const tabColor =
                        navConfig?.tabSettings?.[tabKey]?.color || "#caaff3";
                      return (
                        <button
                          key={tabKey}
                          onClick={() => setActiveTab(tabKey)}
                          style={{
                            ...tabButtonStyle(activeTab === tabKey),
                            backgroundColor:
                              activeTab === tabKey ? tabColor : "transparent",
                            border: uniformColor
                              ? "none"
                              : `2px solid ${tabColor}`,
                            borderRadius: "100px",
                            color: "#1c0700",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {TAB_META[tabKey].icon} {TAB_META[tabKey].label}
                          {tabKey === "rental" && (
                            <TabBadge count={pendingRentalCount} />
                          )}
                          {tabKey === "messages" && (
                            <TabBadge count={pendingMessageCount} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
              }}
            >
              <Pin
                size={14}
                fill={defaultTab === activeTab ? "#9960a8" : "none"}
              />{" "}
              {defaultTab === activeTab
                ? labels.defaultView
                : labels.setDefault}
            </button>
          </div>
        </>
      )}

      {/* --- TAB CONTENT AREA --- */}
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
            {activeTab === "messages" && (
              <MessagesTab isMobile={isMobile} currentLang={currentLang} />
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
