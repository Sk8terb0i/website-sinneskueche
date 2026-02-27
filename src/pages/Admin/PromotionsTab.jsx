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

export default function PromotionsTab({ isMobile, currentLang }) {
  const [promoCodes, setPromoCodes] = useState([]);
  const [code, setCode] = useState("");
  const [coursePath, setCoursePath] = useState("");
  const [discountType, setDiscountType] = useState("free"); // "free" or "percent"
  const [discountValue, setDiscountValue] = useState(100);
  const [limitType, setLimitType] = useState("uses"); // "uses" or "date"
  const [maxUses, setMaxUses] = useState(1);
  const [expiryDate, setExpiryDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const availableCourses = planets
    .filter((p) => p.type === "courses")
    .flatMap((p) => p.courses || [])
    .filter((c) => c.link);

  useEffect(() => {
    fetchCodes();
    if (availableCourses.length > 0) setCoursePath(availableCourses[0].link);
  }, []);

  const fetchCodes = async () => {
    const q = query(
      collection(db, "promo_codes"),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    setPromoCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addDoc(collection(db, "promo_codes"), {
        code: code.toUpperCase().trim(),
        coursePath,
        discountType,
        discountValue: discountType === "free" ? 100 : parseInt(discountValue),
        limitType,
        maxUses: limitType === "uses" ? parseInt(maxUses) : null,
        expiryDate: limitType === "date" ? expiryDate : null,
        timesUsed: 0,
        createdAt: serverTimestamp(),
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
      await deleteDoc(doc(db, "promo_codes", id));
      fetchCodes();
    }
  };

  return (
    <div style={{ display: isMobile ? "block" : "flex", gap: "2rem" }}>
      {/* FORM SECTION */}
      <section style={{ width: isMobile ? "100%" : "400px" }}>
        <div style={formCardStyle}>
          <h3 style={sectionTitleStyle}>
            <Ticket size={18} /> New Promo Code
          </h3>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
          >
            <div>
              <label style={labelStyle}>Code Name</label>
              <input
                style={inputStyle}
                placeholder="e.g. SUMMER24"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Apply to Course</label>
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
              <label style={labelStyle}>Discount Type</label>
              <div style={toggleContainerStyle}>
                <div
                  onClick={() => setDiscountType("free")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      discountType === "free" ? "#caaff3" : "transparent",
                  }}
                >
                  Free Session
                </div>
                <div
                  onClick={() => setDiscountType("percent")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      discountType === "percent" ? "#caaff3" : "transparent",
                  }}
                >
                  % Discount
                </div>
              </div>
            </div>

            {discountType === "percent" && (
              <div>
                <label style={labelStyle}>Discount Percentage (%)</label>
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
              <label style={labelStyle}>Limit By</label>
              <div style={toggleContainerStyle}>
                <div
                  onClick={() => setLimitType("uses")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      limitType === "uses" ? "#caaff3" : "transparent",
                  }}
                >
                  Max Uses
                </div>
                <div
                  onClick={() => setLimitType("date")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      limitType === "date" ? "#caaff3" : "transparent",
                  }}
                >
                  Expiry Date
                </div>
              </div>
            </div>

            {limitType === "uses" ? (
              <div>
                <label style={labelStyle}>Total Number of Uses</label>
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
                <label style={labelStyle}>Valid Until</label>
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
              {isLoading ? "Generating..." : "Generate Code"}
            </button>
          </form>
        </div>
      </section>

      {/* LIST SECTION */}
      <section style={{ flex: 1 }}>
        <h3 style={{ ...sectionTitleStyle, marginBottom: "1rem" }}>
          <Star size={18} /> Active Promotions
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
                <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                  {pc.coursePath}
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
                    <Percent size={14} /> {pc.discountValue}% OFF
                  </span>
                  {pc.limitType === "uses" ? (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Hash size={14} /> {pc.timesUsed} / {pc.maxUses} used
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Clock size={14} /> Expires: {pc.expiryDate}
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
            <p style={{ opacity: 0.5 }}>No active codes.</p>
          )}
        </div>
      </section>
    </div>
  );
}
