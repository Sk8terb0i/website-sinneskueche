import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  increment,
} from "firebase/firestore";
import {
  Ticket,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  X,
  ShieldCheck,
} from "lucide-react";
import { planets } from "../../data/planets";
import * as S from "./AdminStyles";

export default function PackCodesTab({ isMobile, currentLang }) {
  const [userCredits, setUserCredits] = useState([]);
  const [guestCodes, setGuestCodes] = useState([]);
  const [giftCards, setGiftCards] = useState([]); // NEW: State for monetary gift cards
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [addAmount, setAddAmount] = useState(1);

  const labels = {
    en: {
      title: "Credits & Packs",
      search: "Search...",
      users: "User Balances",
      giftCards: "Gift Cards", // NEW
      guests: "Session Pack Codes",
      addBtn: "Add Credit",
      selectUser: "Search any user...",
      loading: "Loading...",
      deleteConfirm: "Delete code?",
    },
    de: {
      title: "Guthaben & Codes",
      search: "Suchen...",
      users: "Nutzer-Guthaben",
      giftCards: "Geschenkkarten", // NEW
      guests: "Gast-Codes",
      addBtn: "Guthaben hinzufügen",
      selectUser: "Nutzer suchen...",
      loading: "Laden...",
      deleteConfirm: "Code löschen?",
    },
  }[currentLang || "en"];

  const [courseSettings, setCourseSettings] = useState([]); // NEW: State for dynamic courses

  // Helper to ensure backward compatibility with how legacy credits were saved
  const getCreditKeyForDB = (id) => {
    const mapping = {
      pottery: "pottery tuesdays",
      "artistic-vision": "artistic vision",
      "get-ink": "get ink!",
      singing: "vocal coaching",
      "extended-voice-lab": "extended voice lab",
      "performing-words": "performing words",
      "singing-basics": "singing basics weekend",
    };
    return mapping[id] || id;
  };

  // Helper to display pretty names for credits
  const getCourseTitle = (key) => {
    const match = courseSettings.find(
      (c) =>
        c.id === key || getCreditKeyForDB(c.id) === key || c.nameEn === key,
    );
    if (match) return currentLang === "de" ? match.nameDe : match.nameEn;
    return key;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [codesSnap, usersSnap, giftSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, "pack_codes"))),
        getDocs(query(collection(db, "users"))),
        getDocs(query(collection(db, "gift_cards"))),
        getDocs(query(collection(db, "course_settings"))), // NEW: Fetch all courses
      ]);

      // 1. Process User Balances (Main & Linked Profiles)
      const everyUser = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const usersWithCredits = [];

      everyUser.forEach((u) => {
        // Main account credits
        const mainCredits = u.credits || {};
        const hasMainCredits = Object.values(mainCredits).some((v) => v > 0);
        if (hasMainCredits) {
          usersWithCredits.push({ ...u, isMain: true });
        }

        // Sub-profile credits
        if (u.linkedProfiles) {
          u.linkedProfiles.forEach((lp) => {
            const subCredits = lp.credits || {};
            if (Object.values(subCredits).some((v) => v > 0)) {
              usersWithCredits.push({
                id: `${u.id}_${lp.id}`,
                parentId: u.id,
                realSubId: lp.id,
                firstName: lp.firstName,
                lastName: lp.lastName + " (Sub)",
                credits: subCredits,
                isMain: false,
              });
            }
          });
        }
      });

      // 2. Process Codes, Filter Expirations, and Categorize
      const now = new Date();
      const allPackCodes = [];

      for (const d of codesSnap.docs) {
        const data = d.data();
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.createdAt
            ? new Date(data.createdAt)
            : null;

        // Auto-delete guest session codes if older than 1 year
        if (
          createdAt &&
          now - createdAt > 365 * 24 * 60 * 60 * 1000 &&
          !data.recipientName
        ) {
          await deleteDoc(doc(db, "pack_codes", d.id));
          continue;
        }

        allPackCodes.push({
          id: d.id,
          ...data,
          createdAt,
          source: "pack_codes",
        });
      }

      const allMonetaryGifts = giftSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt
              ? new Date(data.createdAt)
              : null,
          source: "gift_cards",
        };
      });

      const gifts = [
        ...allMonetaryGifts,
        ...allPackCodes.filter((c) => c.recipientName),
      ];

      const sessionPacks = allPackCodes.filter((c) => !c.recipientName);

      // Extract all courses (base + sub-courses) from settings
      const fetchedCourses = settingsSnap.docs.map((d) => ({
        id: d.id,
        nameEn: d.data().nameEn || d.data().courseName || d.id,
        nameDe: d.data().nameDe || d.data().courseName || d.id,
      }));

      // 3. Update States
      setCourseSettings(fetchedCourses);
      setGuestCodes(sessionPacks);
      setGiftCards(gifts);
      setUserCredits(usersWithCredits);
      setAllUsers(everyUser);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateBalance = async (user, courseKey, delta) => {
    setIsUpdating(true);
    try {
      const isMainUser = user.isMain !== false;
      const parentId = isMainUser ? user.id : user.parentId;
      const userRef = doc(db, "users", parentId);

      // ✅ FIX: Use the 'isMainUser' boolean instead of 'user.isMain'
      if (isMainUser) {
        await updateDoc(userRef, {
          [`credits.${courseKey}`]: increment(delta),
        });
      } else {
        const snap = await getDoc(userRef);
        // ✅ SAFETY FIX: Default to an empty array if linkedProfiles is undefined
        const linkedProfiles = snap.data().linkedProfiles || [];
        const updatedLinked = linkedProfiles.map((lp) => {
          if (lp.id === user.realSubId) {
            const cur = lp.credits?.[courseKey] || 0;
            return {
              ...lp,
              credits: { ...lp.credits, [courseKey]: Math.max(0, cur + delta) },
            };
          }
          return lp;
        });
        await updateDoc(userRef, { linkedProfiles: updatedLinked });
      }
      fetchData();
    } catch (e) {
      alert(e.message);
    }
    setIsUpdating(false);
  };

  const updateGuestBalance = async (codeId, delta) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "pack_codes", codeId), {
        remainingCredits: increment(delta),
      });
      fetchData();
    } catch (e) {
      alert(e.message);
    }
    setIsUpdating(false);
  };

  const updateGiftBalance = async (codeId, delta) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "gift_cards", codeId), {
        remainingBalance: increment(delta),
      });
      fetchData();
    } catch (e) {
      alert(e.message);
    }
    setIsUpdating(false);
  };

  const handleDeleteGift = async (id) => {
    if (window.confirm(labels.deleteConfirm)) {
      await deleteDoc(doc(db, "gift_cards", id));
      fetchData();
    }
  };

  const handleDeleteGuest = async (id) => {
    if (window.confirm(labels.deleteConfirm)) {
      await deleteDoc(doc(db, "pack_codes", id));
      fetchData();
    }
  };

  const filterFn = (list) =>
    list.filter((item) => {
      const s = searchTerm.toLowerCase();
      const name = (
        item.buyerName ||
        item.recipientName || // NEW: Search by gift recipient
        item.firstName ||
        item.name ||
        ""
      ).toLowerCase();
      const code = (item.id || "").toLowerCase();
      return name.includes(s) || code.includes(s);
    });

  const renderControls = (val, onUpdate) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px", // Reduced gap to bring buttons closer to the number
        backgroundColor: "rgba(28, 7, 0, 0.04)",
        padding: "4px 8px", // Tighter padding inside the pill
        borderRadius: "100px",
        border: "1px solid rgba(78, 95, 40, 0.1)",
        minWidth: isMobile ? "90px" : "auto",
        justifyContent: "center",
      }}
    >
      <button
        onClick={() => onUpdate(-1)}
        disabled={isUpdating}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          fontWeight: "900",
          color: "#4e5f28",
          fontSize: "1.2rem",
          width: "24px", // Fixed width
          height: "24px", // Fixed height
          padding: 0, // Kill browser default padding
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0, // Helps vertically center the minus sign perfectly
        }}
      >
        -
      </button>
      <input
        key={val}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        defaultValue={val}
        disabled={isUpdating}
        onBlur={(e) => {
          const num = parseInt(e.target.value);
          if (!isNaN(num) && num !== val) {
            onUpdate(num - val);
          } else {
            e.target.value = val;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
        }}
        style={{
          fontWeight: "900",
          width: "24px",
          padding: 0,
          textAlign: "center",
          fontSize: "0.95rem",
          color: "#1c0700",
          background: "none",
          border: "none",
          outline: "none",
        }}
      />
      <button
        onClick={() => onUpdate(1)}
        disabled={isUpdating}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          fontWeight: "900",
          color: "#4e5f28",
          fontSize: "1.2rem",
          width: "24px", // Fixed width
          height: "24px", // Fixed height
          padding: 0, // Kill browser default padding
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0, // Helps vertically center the plus sign perfectly
        }}
      >
        +
      </button>
    </div>
  );

  return (
    <section>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: "2.5rem",
          gap: "1.2rem",
        }}
      >
        <h3 style={{ ...S.sectionTitleStyle, margin: 0 }}>
          <Ticket size={20} /> {labels.title}
        </h3>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <div style={{ position: "relative", flex: isMobile ? 1 : "initial" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.3,
              }}
            />
            <input
              type="text"
              placeholder={labels.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...S.inputStyle,
                paddingLeft: "36px",
                marginBottom: 0,
                width: isMobile ? "100%" : "240px",
                backgroundColor: "#fdf8e1",
              }}
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: "#9960a8",
              color: "#fffce3",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(153, 96, 168, 0.2)",
              flexShrink: 0,
            }}
          >
            <Plus size={22} />
          </button>
          <button
            onClick={fetchData}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.4,
              flexShrink: 0,
            }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ textAlign: "center", opacity: 0.5 }}>{labels.loading}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {/* User Section */}
          <div>
            <h4
              style={{
                fontSize: "0.7rem",
                fontWeight: "900",
                opacity: 0.4,
                textTransform: "uppercase",
                marginBottom: "1rem",
                letterSpacing: "1.5px",
              }}
            >
              {labels.users}
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {filterFn(userCredits).map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    padding: isMobile ? "16px 20px" : "14px 24px",
                    backgroundColor: "#fdf8e1",
                    borderRadius: "16px",
                    border: "1px solid rgba(28,7,0,0.06)",
                    gap: isMobile ? "12px" : "0",
                  }}
                >
                  <p
                    style={{
                      fontWeight: "800",
                      margin: 0,
                      color: "#1c0700",
                      fontSize: "0.95rem",
                    }}
                  >
                    {u.firstName} {u.lastName}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      gap: isMobile ? "10px" : "20px",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {Object.entries(u.credits || {})
                      .filter(([_, v]) => v > 0)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: isMobile
                              ? "space-between"
                              : "flex-start",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: "900",
                              opacity: 0.4,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {getCourseTitle(k)}
                          </span>
                          {renderControls(v, (d) => updateBalance(u, k, d))}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gift Cards Section */}
          <div>
            <h4
              style={{
                fontSize: "0.7rem",
                fontWeight: "900",
                opacity: 0.4,
                textTransform: "uppercase",
                marginBottom: "1rem",
                letterSpacing: "1.5px",
              }}
            >
              {labels.giftCards}
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {filterFn(giftCards).map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    padding: isMobile ? "16px 20px" : "14px 24px",
                    backgroundColor: "#fdf8e1",
                    borderRadius: "16px",
                    border: "1px solid rgba(28,7,0,0.06)",
                    gap: isMobile ? "12px" : "0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "900",
                        margin: 0,
                        color:
                          g.source === "gift_cards" ? "#4e5f28" : "#9960a8",
                        letterSpacing: "1px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {g.id}
                    </p>
                    <p
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: "800",
                        opacity: 0.4,
                        margin: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      {g.source === "pack_codes" ? `${g.courseKey} • ` : ""}
                      {g.buyerName}{" "}
                      {g.recipientName ? `→ ${g.recipientName}` : ""}
                      {g.createdAt &&
                        ` • ${g.createdAt.toLocaleDateString(currentLang === "en" ? "en-GB" : "de-DE", { day: "2-digit", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isMobile ? "space-between" : "flex-end",
                      gap: isMobile ? "12px" : "18px",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {/* Handle Monetary Updates */}
                    {g.source === "gift_cards" ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{ fontSize: "0.8rem", fontWeight: "bold" }}
                        >
                          {g.remainingBalance} CHF
                        </span>
                        {renderControls("", (d) =>
                          updateGiftBalance(g.id, d * 5),
                        )}
                      </div>
                    ) : (
                      /* Handle Session Pack Gift Updates */
                      renderControls(g.remainingCredits, (d) =>
                        updateGuestBalance(g.id, d),
                      )
                    )}

                    <button
                      onClick={() =>
                        g.source === "gift_cards"
                          ? handleDeleteGift(g.id)
                          : handleDeleteGuest(g.id)
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4d",
                        cursor: "pointer",
                        opacity: 0.3,
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guest Section */}
          <div>
            <h4
              style={{
                fontSize: "0.7rem",
                fontWeight: "900",
                opacity: 0.4,
                textTransform: "uppercase",
                marginBottom: "1rem",
                letterSpacing: "1.5px",
              }}
            >
              {labels.guests}
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {filterFn(guestCodes).map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    padding: isMobile ? "16px 20px" : "14px 24px",
                    backgroundColor: "#fdf8e1",
                    borderRadius: "16px",
                    border: "1px solid rgba(28,7,0,0.06)",
                    gap: isMobile ? "12px" : "0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "900",
                        margin: 0,
                        color: "#9960a8",
                        letterSpacing: "1px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {g.id}
                    </p>
                    <p
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: "800",
                        opacity: 0.4,
                        margin: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      {g.courseKey} • {g.buyerName}{" "}
                      {g.recipientName ? `(For: ${g.recipientName})` : ""}
                      {g.createdAt &&
                        ` • ${g.createdAt.toLocaleDateString(currentLang === "en" ? "en-GB" : "de-DE", { day: "2-digit", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isMobile ? "space-between" : "flex-end",
                      gap: isMobile ? "12px" : "18px",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {renderControls(g.remainingCredits, (d) =>
                      updateGuestBalance(g.id, d),
                    )}
                    <button
                      onClick={() => handleDeleteGuest(g.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4d",
                        cursor: "pointer",
                        opacity: 0.3,
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28,7,0,0.3)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              width: "100%",
              maxWidth: "440px",
              borderRadius: "28px",
              padding: isMobile ? "1.5rem" : "2.5rem",
              position: "relative",
              boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                border: "none",
                background: "none",
                cursor: "pointer",
                opacity: 0.3,
              }}
            >
              <X size={24} />
            </button>
            <h3
              style={{
                margin: "0 0 1.5rem 0",
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: isMobile ? "1.6rem" : "2rem",
                color: "#1c0700",
              }}
            >
              {labels.addBtn}
            </h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder={labels.selectUser}
                style={{
                  ...S.inputStyle,
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: "14px",
                  flex: 1,
                  marginBottom: 0,
                }}
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
              />
              <input
                type="number"
                placeholder="Qty"
                style={{
                  ...S.inputStyle,
                  backgroundColor: "rgba(255,255,255,0.5)",
                  borderRadius: "14px",
                  width: "80px",
                  marginBottom: 0,
                  textAlign: "center",
                }}
                value={addAmount}
                onChange={(e) => setAddAmount(parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
            <div
              style={{
                maxHeight: isMobile ? "280px" : "320px",
                overflowY: "auto",
                marginTop: "1.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
              className="custom-scrollbar"
            >
              {allUsers
                .filter((u) =>
                  (u.firstName + " " + (u.lastName || ""))
                    .toLowerCase()
                    .includes(modalSearch.toLowerCase()),
                )
                .slice(0, 8)
                .map((u) => (
                  <div
                    key={u.id}
                    style={{
                      padding: "14px",
                      border: "1px solid rgba(28,7,0,0.08)",
                      borderRadius: "16px",
                      backgroundColor: "rgba(255,255,255,0.4)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "800",
                          fontSize: "0.95rem",
                          color: "#1c0700",
                        }}
                      >
                        {u.firstName} {u.lastName}
                      </p>
                      <ShieldCheck size={18} color="#4e5f28" opacity={0.3} />
                    </div>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      {courseSettings.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => {
                            // Safely map the ID back to the legacy key to prevent breaking old logic
                            updateBalance(
                              u,
                              getCreditKeyForDB(course.id),
                              addAmount,
                            );
                            setIsAddModalOpen(false);
                          }}
                          style={{
                            fontSize: "0.55rem",
                            padding: "6px 12px",
                            borderRadius: "100px",
                            border: "1.5px solid #4e5f28",
                            background: "none",
                            cursor: "pointer",
                            fontWeight: "900",
                            textTransform: "uppercase",
                            color: "#4e5f28",
                          }}
                        >
                          +{" "}
                          {currentLang === "de" ? course.nameDe : course.nameEn}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
