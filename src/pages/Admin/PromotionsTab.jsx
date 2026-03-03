import React, { useState, useEffect } from "react";
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
import { Ticket, Trash2, Clock, Hash, Percent, Star } from "lucide-react";
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
  const [applyTo, setApplyTo] = useState("both");
  const [discountType, setDiscountType] = useState("free");
  const [discountValue, setDiscountValue] = useState(100);
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

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((c) => [c.link, c]),
    ).values(),
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

  useEffect(() => {
    fetchCodes();
    if (availableCourses.length > 0) setCoursePath(availableCourses[0].link);
  }, [userRole, allowedCourses]);

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

            <div>
              <label style={labelStyle}>{labels.applyTo}</label>
              <select
                style={inputStyle}
                value={coursePath}
                onChange={(e) => setCoursePath(e.target.value)}
              >
                {availableCourses.map((c) => (
                  <option key={c.link} value={c.link}>
                    {c.text[currentLang || "en"]}
                  </option>
                ))}
              </select>
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
                  }}
                >
                  {labels.percent}
                </div>
              </div>
            </div>

            {discountType === "percent" && (
              <div>
                <label style={labelStyle}>{labels.discPercent}</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  max="99"
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
                    }}
                  >
                    <Percent size={14} /> {pc.discountValue}% {labels.off}
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
