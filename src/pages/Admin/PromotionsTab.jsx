import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { planets } from "../../data/planets";
import {
  Ticket,
  Trash2,
  Clock,
  Hash,
  Percent,
  Star,
  ChevronDown,
} from "lucide-react";
import {
  formCardStyle,
  sectionTitleStyle,
  labelStyle,
  inputStyle,
  btnStyle,
  cardStyle,
  toggleContainerStyle,
  toggleOptionStyle,
} from "./AdminStyles";

export default function PromotionsTab({
  isMobile,
  currentLang,
  userRole,
  allowedCourses = [],
}) {
  const [promoCodes, setPromoCodes] = useState([]);
  const [code, setCode] = useState("");
  const [coursePath, setCoursePath] = useState("");

  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const courseDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target)
      ) {
        setIsCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [applyTo, setApplyTo] = useState("both");
  const [discountType, setDiscountType] = useState("free");
  const [discountValue, setDiscountValue] = useState(5);
  const [limitType, setLimitType] = useState("uses");
  const [maxUses, setMaxUses] = useState(1);
  const [expiryDate, setExpiryDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isFullAdmin = userRole === "admin";

  const labels = {
    en: {
      titleNew: "New Promo Code",
      codeName: "Code Name",
      applyTo: "Apply to Course",
      validFor: "Valid For",
      both: "Both",
      pack: "Pack",
      single: "Single",
      discType: "Discount Type",
      free: "Free Session",
      percent: "% Discount",
      discPercent: "Discount Percentage (%)",
      limitBy: "Limit By",
      maxUses: "Max Uses",
      expiry: "Expiry Date",
      totalUses: "Total Number of Uses",
      validUntil: "Valid Until",
      genIng: "Generating...",
      genBtn: "Generate Code",
      active: "Active Promotions",
      myCourses: "(My Courses)",
      off: "OFF",
      used: "used",
      expires: "Expires:",
      noCodes: "No active codes.",
    },
    de: {
      titleNew: "Neuer Rabattcode",
      codeName: "Code-Name",
      applyTo: "Gilt für Kurs",
      validFor: "Gültig für",
      both: "Beides",
      pack: "Paket",
      single: "Einzeln",
      discType: "Rabatt-Typ",
      free: "Gratis Session",
      percent: "% Rabatt",
      discPercent: "Rabatt in Prozent (%)",
      limitBy: "Begrenzt durch",
      maxUses: "Max. Nutzungen",
      expiry: "Ablaufdatum",
      totalUses: "Gesamtanzahl Nutzungen",
      validUntil: "Gültig bis",
      genIng: "Erstelle...",
      genBtn: "Code erstellen",
      active: "Aktive Rabattcodes",
      myCourses: "(Meine Kurse)",
      off: "RABATT",
      used: "genutzt",
      expires: "Läuft ab:",
      noCodes: "Keine aktiven Codes.",
    },
  }[currentLang || "en"];

  const [availableCourses, setAvailableCourses] = useState([]);
  const [calendarGroups, setCalendarGroups] = useState({});

  useEffect(() => {
    const fetchCoursesAndGroups = async () => {
      // 1. Fetch Calendar Groups
      const cgSnap = await getDocs(collection(db, "calendar_groups"));
      const cgMap = {};
      cgSnap.docs.forEach((d) => (cgMap[d.id] = d.data().includedLinks || []));
      setCalendarGroups(cgMap);

      // 2. Fetch Base and Custom Courses
      const base = Array.from(
        new Map(
          planets
            .filter((p) => p.type === "courses")
            .flatMap((p) => p.courses || [])
            .filter((c) => c.link)
            .map((c) => [c.link, c]),
        ).values(),
      );
      try {
        const snap = await getDocs(collection(db, "custom_courses"));
        const custom = snap.docs.map((d) => ({
          link: d.data().link,
          text: { en: d.data().nameEn, de: d.data().nameDe },
        }));
        const combined = [...base, ...custom];
        const filtered = combined.filter(
          (c) => isFullAdmin || allowedCourses.includes(c.link),
        );
        setAvailableCourses(filtered);
        if (filtered.length > 0) setCoursePath("all"); // Default to 'All Courses'
      } catch (err) {
        const filtered = base.filter(
          (c) => isFullAdmin || allowedCourses.includes(c.link),
        );
        setAvailableCourses(filtered);
        if (filtered.length > 0) setCoursePath("all");
      }
    };
    fetchCoursesAndGroups();
    fetchCodes();
  }, [userRole, allowedCourses, isFullAdmin]);

  const fetchCodes = async () => {
    const q = query(
      collection(db, "promo_codes"),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    const allCodes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const filteredCodes = allCodes.filter(
      (pc) => isFullAdmin || allowedCourses.includes(pc.coursePath),
    );
    setPromoCodes(filteredCodes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addDoc(collection(db, "promo_codes"), {
        code: code.toUpperCase().trim(),
        coursePath,
        applyTo,
        discountType,
        discountValue: discountType === "free" ? 100 : parseInt(discountValue),
        limitType,
        maxUses: limitType === "uses" ? parseInt(maxUses) : null,
        expiryDate: limitType === "date" ? expiryDate : null,
        timesUsed: 0,
        createdAt: serverTimestamp(),
        createdByRole: userRole,
      });
      setCode("");
      fetchCodes();
    } catch (err) {
      alert("Error creating code: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCode = async (id) => {
    if (window.confirm("Delete this promo code?")) {
      try {
        await deleteDoc(doc(db, "promo_codes", id));
        fetchCodes();
      } catch (err) {
        alert("Error deleting code: " + err.message);
      }
    }
  };

  return (
    <div style={{ display: isMobile ? "block" : "flex", gap: "2rem" }}>
      <section style={{ width: isMobile ? "100%" : "400px" }}>
        <div style={formCardStyle}>
          <h3 style={sectionTitleStyle}>
            <Ticket size={18} /> {labels.titleNew}
          </h3>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
          >
            <div>
              <label style={labelStyle}>{labels.codeName}</label>
              <input
                style={inputStyle}
                placeholder="e.g. SUMMER24"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div style={{ position: "relative" }} ref={courseDropdownRef}>
              <label style={labelStyle}>{labels.applyTo}</label>
              <div
                onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  userSelect: "none",
                  backgroundColor: "rgba(255, 252, 227, 0.4)",
                }}
              >
                <span style={{ fontFamily: "monospace" }}>
                  {coursePath === "all"
                    ? currentLang === "en"
                      ? "-- All Courses --"
                      : "-- Alle Kurse --"
                    : availableCourses.find((c) => c.link === coursePath)?.text[
                        currentLang || "en"
                      ] || coursePath}
                </span>
                <ChevronDown
                  size={18}
                  style={{
                    transform: isCourseDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    color: "#1c0700",
                    opacity: 0.5,
                  }}
                />
              </div>

              {isCourseDropdownOpen && (
                <div
                  className="custom-scrollbar"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "-4px",
                    backgroundColor: "#fffce3",
                    border: "1px solid rgba(202, 175, 243, 0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(28, 7, 0, 0.1)",
                    zIndex: 50,
                    maxHeight: "300px",
                    overflowY: "auto",
                    padding: "8px",
                  }}
                >
                  <div
                    onClick={() => {
                      setCoursePath("all");
                      setIsCourseDropdownOpen(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      backgroundColor:
                        coursePath === "all"
                          ? "rgba(202, 175, 243, 0.2)"
                          : "transparent",
                      color: coursePath === "all" ? "#9960a8" : "#1c0700",
                      fontWeight: coursePath === "all" ? "bold" : "normal",
                      marginBottom: "8px",
                      fontFamily: "monospace",
                    }}
                  >
                    -- {currentLang === "en" ? "All Courses" : "Alle Kurse"} --
                  </div>

                  {(() => {
                    const renderedLinks = new Set();
                    const groups = [];

                    const baseCourses = Array.from(
                      new Map(
                        planets
                          .filter((p) => p.type === "courses")
                          .flatMap((p) => p.courses || [])
                          .filter((c) => c.link)
                          .map((c) => [c.link, c]),
                      ).values(),
                    ).filter(
                      (base) =>
                        isFullAdmin || allowedCourses.includes(base.link),
                    );

                    baseCourses.forEach((base) => {
                      const baseId = base.link.replace(/\//g, "");
                      const includedLinks = calendarGroups[baseId] || [
                        base.link,
                      ];

                      const groupOptions = includedLinks
                        .map((l) =>
                          availableCourses.find((ac) => ac.link === l),
                        )
                        .filter(Boolean);

                      if (groupOptions.length > 0) {
                        groups.push(
                          <div key={baseId} style={{ marginBottom: "8px" }}>
                            <div
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: "900",
                                textTransform: "uppercase",
                                color: "#4e5f28",
                                padding: "8px 12px 4px 12px",
                                opacity: 0.6,
                              }}
                            >
                              {base.text[currentLang || "en"]} Group
                            </div>
                            {groupOptions.map((opt) => {
                              renderedLinks.add(opt.link);
                              const isSelected = coursePath === opt.link;
                              return (
                                <div
                                  key={opt.link}
                                  onClick={() => {
                                    setCoursePath(opt.link);
                                    setIsCourseDropdownOpen(false);
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    backgroundColor: isSelected
                                      ? "rgba(202, 175, 243, 0.2)"
                                      : "transparent",
                                    color: isSelected ? "#9960a8" : "#1c0700",
                                    fontWeight: isSelected ? "bold" : "normal",
                                    transition: "background-color 0.2s",
                                    fontSize: "0.9rem",
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <span>{opt.text[currentLang || "en"]}</span>
                                  {opt.link !== base.link && (
                                    <span
                                      style={{
                                        fontSize: "0.65rem",
                                        opacity: 0.5,
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {opt.link}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>,
                        );
                      }
                    });

                    const ungrouped = availableCourses.filter(
                      (ac) => !renderedLinks.has(ac.link),
                    );
                    if (ungrouped.length > 0) {
                      groups.push(
                        <div key="ungrouped" style={{ marginBottom: "8px" }}>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: "900",
                              textTransform: "uppercase",
                              color: "#ff4d4d",
                              padding: "8px 12px 4px 12px",
                              opacity: 0.8,
                            }}
                          >
                            Unassigned
                          </div>
                          {ungrouped.map((opt) => {
                            const isSelected = coursePath === opt.link;
                            return (
                              <div
                                key={opt.link}
                                onClick={() => {
                                  setCoursePath(opt.link);
                                  setIsCourseDropdownOpen(false);
                                }}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  backgroundColor: isSelected
                                    ? "rgba(202, 175, 243, 0.2)"
                                    : "transparent",
                                  color: isSelected ? "#9960a8" : "#1c0700",
                                  fontWeight: isSelected ? "bold" : "normal",
                                  fontSize: "0.9rem",
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <span>{opt.text[currentLang || "en"]}</span>
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    opacity: 0.5,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {opt.link}
                                </span>
                              </div>
                            );
                          })}
                        </div>,
                      );
                    }

                    return groups;
                  })()}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>{labels.validFor}</label>
              <div style={toggleContainerStyle}>
                {["both", "pack", "single"].map((type) => (
                  <div
                    key={type}
                    onClick={() => setApplyTo(type)}
                    style={{
                      ...toggleOptionStyle,
                      backgroundColor:
                        applyTo === type ? "#caaff3" : "transparent",
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                      padding: isMobile ? "8px 4px" : "8px 12px",
                      fontSize: isMobile ? "0.75rem" : "0.85rem",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      lineHeight: 1,
                    }}
                  >
                    {labels[type]}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>{labels.discType}</label>
              <div style={toggleContainerStyle}>
                <div
                  onClick={() => setDiscountType("free")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      discountType === "free" ? "#caaff3" : "transparent",
                    whiteSpace: "nowrap",
                    padding: isMobile ? "8px 4px" : "8px 12px",
                    fontSize: isMobile ? "0.75rem" : "0.85rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {labels.free}
                </div>
                <div
                  onClick={() => setDiscountType("percent")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      discountType === "percent" ? "#caaff3" : "transparent",
                    whiteSpace: "nowrap",
                    padding: isMobile ? "8px 4px" : "8px 12px",
                    fontSize: isMobile ? "0.75rem" : "0.85rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {labels.percent}
                </div>
                <div
                  onClick={() => setDiscountType("amount")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      discountType === "amount" ? "#caaff3" : "transparent",
                    whiteSpace: "nowrap",
                    padding: isMobile ? "8px 4px" : "8px 12px",
                    fontSize: isMobile ? "0.75rem" : "0.85rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {currentLang === "en" ? "Amount (CHF)" : "Betrag (CHF)"}
                </div>
              </div>
            </div>

            {(discountType === "percent" || discountType === "amount") && (
              <div>
                <label style={labelStyle}>
                  {discountType === "percent"
                    ? labels.discPercent
                    : currentLang === "en"
                      ? "Discount Amount (CHF)"
                      : "Rabatt Betrag (CHF)"}
                </label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  max={discountType === "percent" ? "99" : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>{labels.limitBy}</label>
              <div style={toggleContainerStyle}>
                <div
                  onClick={() => setLimitType("uses")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      limitType === "uses" ? "#caaff3" : "transparent",
                    whiteSpace: "nowrap",
                    padding: isMobile ? "8px 4px" : "8px 12px",
                    fontSize: isMobile ? "0.75rem" : "0.85rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {labels.maxUses}
                </div>
                <div
                  onClick={() => setLimitType("date")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      limitType === "date" ? "#caaff3" : "transparent",
                    whiteSpace: "nowrap",
                    padding: isMobile ? "8px 4px" : "8px 12px",
                    fontSize: isMobile ? "0.75rem" : "0.85rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {labels.expiry}
                </div>
              </div>
            </div>

            {limitType === "uses" ? (
              <div>
                <label style={labelStyle}>{labels.totalUses}</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label style={labelStyle}>{labels.validUntil}</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
              </div>
            )}

            <button type="submit" style={btnStyle} disabled={isLoading}>
              {isLoading ? labels.genIng : labels.genBtn}
            </button>
          </form>
        </div>
      </section>

      <section style={{ flex: 1 }}>
        <h3 style={{ ...sectionTitleStyle, marginBottom: "1rem" }}>
          <Star size={18} /> {labels.active} {!isFullAdmin && labels.myCourses}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {promoCodes.map((pc) => (
            <div
              key={pc.id}
              style={{
                ...cardStyle,
                backgroundColor: "#fdf8e1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "800",
                    fontSize: "1.1rem",
                    color: "#9960a8",
                  }}
                >
                  {pc.code}
                </div>
                {pc.description && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#e74c3c",
                      fontWeight: "bold",
                      marginTop: "4px",
                    }}
                  >
                    {pc.description} ({pc.buyerEmail})
                  </div>
                )}

                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.6,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "2px",
                  }}
                >
                  <span>{pc.coursePath}</span>
                  <span
                    style={{
                      backgroundColor: "rgba(28,7,0,0.05)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      fontWeight: "bold",
                    }}
                  >
                    {labels[pc.applyTo] || pc.applyTo}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    marginTop: "8px",
                    fontSize: "0.85rem",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: "bold",
                    }}
                  >
                    {pc.discountType === "percent" ? (
                      <>
                        <Percent size={14} /> {pc.discountValue}% {labels.off}
                      </>
                    ) : pc.discountType === "amount" ? (
                      <>
                        <Ticket size={14} /> -{pc.discountValue} CHF
                      </>
                    ) : (
                      <>
                        <Star size={14} />{" "}
                        {currentLang === "en" ? "FREE" : "GRATIS"}
                      </>
                    )}
                  </span>
                  {pc.limitType === "uses" ? (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Hash size={14} /> {pc.timesUsed} / {pc.maxUses}{" "}
                      {labels.used}
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Clock size={14} /> {labels.expires} {pc.expiryDate}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteCode(pc.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ff4d4d",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          {promoCodes.length === 0 && (
            <p style={{ opacity: 0.5 }}>{labels.noCodes}</p>
          )}
        </div>
      </section>
    </div>
  );
}
