import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, getDocs, deleteDoc, doc } from "firebase/firestore";
import {
  Ticket,
  Trash2,
  User,
  Mail,
  CreditCard,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  btnStyle,
  inputStyle,
} from "./AdminStyles";

export default function PackCodesTab({ isMobile, currentLang }) {
  const [packCodes, setPackCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [columnCount, setColumnCount] = useState(1);

  const labels = {
    en: {
      title: "Active Session Packs",
      search: "Search codes, emails...",
      refresh: "Refresh",
      loading: "Loading credits...",
      noMatch: "No codes match your search.",
      noActive: "No active pack credits found.",
      total: "Total",
      credits: "Credits",
      profCreated: "Profile Created:",
      codeCreated: "Code Created:",
      left: "left",
      collapse: "Collapse",
      show: "Show",
      more: "More",
      errProf:
        "This balance is attached to a registered user profile. To modify it, please go to the 'Profiles' tab and edit the user directly.",
      delConfirm:
        "Are you sure you want to delete this guest pack code? Any remaining credits will be lost forever.",
      errDel: "Error deleting code: ",
    },
    de: {
      title: "Aktive Session-Packs",
      search: "Codes, E-Mails suchen...",
      refresh: "Aktualisieren",
      loading: "Guthaben wird geladen...",
      noMatch: "Keine Codes gefunden.",
      noActive: "Keine aktiven Pakete gefunden.",
      total: "Gesamt",
      credits: "Credits",
      profCreated: "Profil erstellt:",
      codeCreated: "Code erstellt:",
      left: "übrig",
      collapse: "Einklappen",
      show: "Zeige",
      more: "weitere",
      errProf:
        "Dieses Guthaben ist mit einem registrierten Profil verknüpft. Um es zu ändern, bearbeite den Nutzer direkt im Tab 'Profile'.",
      delConfirm:
        "Bist du sicher, dass du diesen Gast-Code löschen möchtest? Alle verbleibenden Credits gehen dauerhaft verloren.",
      errDel: "Fehler beim Löschen: ",
    },
  }[currentLang || "en"];

  useEffect(() => {
    fetchPackCodes();
    const updateColumns = () => {
      if (window.innerWidth < 800) setColumnCount(1);
      else if (window.innerWidth < 1200) setColumnCount(2);
      else setColumnCount(3);
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const fetchPackCodes = async () => {
    setIsLoading(true);
    try {
      const codesQuery = query(collection(db, "pack_codes"));
      const codesSnap = await getDocs(codesQuery);
      let allCredits = codesSnap.docs.map((doc) => ({
        id: doc.id,
        isProfileCredit: false,
        ...doc.data(),
      }));

      const usersQuery = query(collection(db, "users"));
      const usersSnap = await getDocs(usersQuery);

      usersSnap.docs.forEach((doc) => {
        const userData = doc.data();
        if (userData.credits && typeof userData.credits === "object") {
          Object.entries(userData.credits).forEach(([courseKey, count]) => {
            if (count > 0) {
              const fullName =
                [userData.firstName, userData.lastName]
                  .filter(Boolean)
                  .join(" ") || "Registered User";
              allCredits.push({
                id: `user_${doc.id}_${courseKey}`,
                userId: doc.id,
                isProfileCredit: true,
                code: "PROFILE BALANCE",
                buyerEmail: userData.email || "",
                buyerName: fullName,
                courseKey: courseKey,
                remainingCredits: count,
                createdAt: userData.createdAt || new Date().toISOString(),
              });
            }
          });
        }
      });

      allCredits.sort((a, b) => {
        const timeA = a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : new Date(a.createdAt).getTime() || 0;
        const timeB = b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : new Date(b.createdAt).getTime() || 0;
        return timeB - timeA;
      });

      setPackCodes(allCredits);
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (codeObj) => {
    if (codeObj.isProfileCredit) {
      alert(labels.errProf);
      return;
    }
    if (window.confirm(labels.delConfirm)) {
      try {
        await deleteDoc(doc(db, "pack_codes", codeObj.id));
        fetchPackCodes();
      } catch (error) {
        alert(labels.errDel + error.message);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    try {
      if (timestamp.seconds)
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
      return new Date(timestamp).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const filteredCodes = packCodes.filter((code) => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;
    const codeString = String(code.code || "").toLowerCase();
    const emailString = String(
      code.buyerEmail || code.email || code.userEmail || "",
    ).toLowerCase();
    const nameString = String(
      code.buyerName || code.name || code.userName || "",
    ).toLowerCase();
    const courseString = String(
      code.courseKey || code.coursePath || "",
    ).toLowerCase();
    return (
      codeString.includes(searchLower) ||
      emailString.includes(searchLower) ||
      nameString.includes(searchLower) ||
      courseString.includes(searchLower)
    );
  });

  const groupedCodes = filteredCodes.reduce((acc, code) => {
    const rawEmail =
      code.buyerEmail || code.email || code.userEmail || "no-email";
    const rawName = code.buyerName || code.name || code.userName || "Guest";
    const emailKey = String(rawEmail).toLowerCase().trim();
    const nameKey = String(rawName).toLowerCase().trim();
    const userKey = `${emailKey}_${nameKey}`;
    const rawCourse =
      code.courseKey || code.coursePath || code.course || "General";
    const courseKey = String(rawCourse).replace(/\//g, "").trim() || "General";

    if (!acc[userKey]) {
      acc[userKey] = {
        userKey: userKey,
        email: rawEmail !== "no-email" ? rawEmail : "No email provided",
        name: rawName,
        totalCreditsAllCourses: 0,
        courses: {},
      };
    }
    if (!acc[userKey].courses[courseKey]) {
      acc[userKey].courses[courseKey] = {
        courseName: courseKey,
        totalCredits: 0,
        codes: [],
      };
    }
    acc[userKey].courses[courseKey].codes.push(code);
    acc[userKey].courses[courseKey].totalCredits += Number(
      code.remainingCredits || 0,
    );
    acc[userKey].totalCreditsAllCourses += Number(code.remainingCredits || 0);
    return acc;
  }, {});

  const groupedArray = Object.values(groupedCodes);
  const columns = Array.from({ length: columnCount }, () => []);
  groupedArray.forEach((group, index) => {
    columns[index % columnCount].push(group);
  });

  return (
    <section>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
          <Ticket size={18} /> {labels.title}
        </h3>

        <div
          style={{
            display: "flex",
            gap: "10px",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9960a8",
              }}
            />
            <input
              type="text"
              placeholder={labels.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: "36px",
                marginBottom: 0,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={fetchPackCodes}
            style={{
              ...btnStyle,
              width: "auto",
              padding: "0 14px",
              backgroundColor: "rgba(28,7,0,0.05)",
              color: "#1c0700",
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ opacity: 0.5 }}>{labels.loading}</p>
      ) : groupedArray.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            opacity: 0.5,
            padding: "2rem",
          }}
        >
          {searchTerm ? labels.noMatch : labels.noActive}
        </div>
      ) : (
        <div
          style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}
        >
          {columns.map((colGroups, colIndex) => (
            <div
              key={colIndex}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                minWidth: 0,
              }}
            >
              {colGroups.map((userGroup) => {
                const courseKeys = Object.keys(userGroup.courses);
                const hasMultipleCourses = courseKeys.length > 1;

                return (
                  <div
                    key={userGroup.userKey}
                    style={{
                      ...cardStyle,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      borderTop: "4px solid #4e5f28",
                      marginBottom: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        borderBottom: "1px solid rgba(28,7,0,0.1)",
                        paddingBottom: "10px",
                        gap: "8px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            color: "#1c0700",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <User
                            size={16}
                            color="#9960a8"
                            style={{ flexShrink: 0 }}
                          />{" "}
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {userGroup.name}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.85rem",
                            opacity: 0.7,
                            marginTop: "4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Mail size={14} style={{ flexShrink: 0 }} />{" "}
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {userGroup.email}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: "#caaff3",
                          color: "#1c0700",
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontWeight: "900",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.85rem",
                          flexShrink: 0,
                        }}
                      >
                        <CreditCard size={14} />{" "}
                        {userGroup.totalCreditsAllCourses} {labels.total}
                      </div>
                    </div>

                    {courseKeys.map((cKey) => {
                      const courseData = userGroup.courses[cKey];
                      const groupKey = `${userGroup.userKey}_${cKey}`;
                      const isExpanded = expandedGroups[groupKey];
                      const displayedCodes = isExpanded
                        ? courseData.codes
                        : courseData.codes.slice(0, 1);

                      return (
                        <div
                          key={groupKey}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            marginTop: "4px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                textTransform: "uppercase",
                                color: "#9960a8",
                                letterSpacing: "1px",
                              }}
                            >
                              {courseData.courseName}
                            </span>
                            {hasMultipleCourses && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  opacity: 0.6,
                                  fontWeight: "bold",
                                }}
                              >
                                {courseData.totalCredits} {labels.credits}
                              </span>
                            )}
                          </div>

                          {displayedCodes.map((code) => (
                            <div
                              key={code.id}
                              style={{
                                backgroundColor: code.isProfileCredit
                                  ? "rgba(78, 95, 40, 0.05)"
                                  : "rgba(28,7,0,0.03)",
                                border: code.isProfileCredit
                                  ? "1px solid rgba(78, 95, 40, 0.2)"
                                  : "1px solid transparent",
                                padding: "10px",
                                borderRadius: "8px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontWeight: "900",
                                    letterSpacing: "1px",
                                    color: code.isProfileCredit
                                      ? "#4e5f28"
                                      : "#1c0700",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {code.isProfileCredit && (
                                    <ShieldCheck size={14} />
                                  )}{" "}
                                  {code.code}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.65rem",
                                    opacity: 0.5,
                                    marginTop: "2px",
                                  }}
                                >
                                  {code.isProfileCredit
                                    ? labels.profCreated
                                    : labels.codeCreated}{" "}
                                  {formatDate(code.createdAt)}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "0.85rem",
                                    color: "#4e5f28",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {code.remainingCredits} {labels.left}
                                </span>
                                <button
                                  onClick={() => handleDelete(code)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: code.isProfileCredit
                                      ? "#1c070040"
                                      : "#ff4d4d",
                                    cursor: code.isProfileCredit
                                      ? "not-allowed"
                                      : "pointer",
                                    padding: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title={
                                    code.isProfileCredit
                                      ? "Edit profile credits in Profiles tab"
                                      : "Delete Code"
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {courseData.codes.length > 1 && (
                            <button
                              onClick={() => toggleGroup(groupKey)}
                              style={{
                                background: "rgba(153, 96, 168, 0.1)",
                                border: "none",
                                color: "#9960a8",
                                padding: "8px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "6px",
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                                marginTop: "2px",
                                marginBottom: "8px",
                              }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={16} /> {labels.collapse}
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={16} /> {labels.show}{" "}
                                  {courseData.codes.length - 1} {labels.more}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
