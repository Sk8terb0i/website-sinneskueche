import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ShoppingBag, Loader2 } from "lucide-react";

export default function BuyPackCard({ packCourses, currentLang, t }) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuy = async () => {
    if (!selectedCourseId) return;
    const course = packCourses.find((c) => c.id === selectedCourseId);
    if (!course) return;

    setIsProcessing(true);
    const functions = getFunctions();
    const createCheckout = httpsCallable(functions, "createStripeCheckout");

    try {
      // Robust URL helper for GitHub Pages and Custom Domains
      const getBaseUrl = () => {
        const origin = window.location.origin;
        // If on github.io, explicitly add the repository subfolder
        if (origin.includes("github.io")) {
          return `${origin}/website-sinneskueche/`;
        }
        // Fallback for local development or root custom domains
        const path = window.location.pathname;
        return `${origin}${path}${path.endsWith("/") ? "" : "/"}`;
      };

      const result = await createCheckout({
        mode: "pack",
        packPrice: parseFloat(course.priceFull),
        packSize: parseInt(course.packSize),
        coursePath: `/${course.id}`,
        selectedDates: [],
        currentLang: currentLang,
        // UPDATED: Now calls the helper to ensure the correct path
        successUrl: `${getBaseUrl()}#/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      });

      if (result.data?.url) window.location.assign(result.data.url);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert("Checkout failed. Please try again.");
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>
        <ShoppingBag size={20} /> {t.buyPack}
      </h3>
      <div style={styles.row}>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          style={styles.select}
        >
          <option value="">-- {t.selectCourse} --</option>
          {packCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseName} ({c.packSize} {t.remaining} - {c.priceFull} CHF)
            </option>
          ))}
        </select>
        <button
          onClick={handleBuy}
          disabled={!selectedCourseId || isProcessing}
          style={styles.buyBtn}
        >
          {isProcessing ? <Loader2 className="spinner" size={18} /> : t.buyNow}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fdf8e1",
    padding: window.innerWidth < 768 ? "1.5rem" : "2rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.08)",
    width: "100%",
    boxSizing: "border-box",
  },
  cardTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textTransform: "lowercase",
  },
  row: {
    display: "flex",
    gap: "12px",
    // MODIFIED: Stack button under select on small screens
    flexDirection: window.innerWidth < 480 ? "column" : "row",
    width: "100%",
  },
  select: {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28,7,0,0.1)",
    background: "#fffce3",
    fontFamily: "Satoshi",
    width: "100%",
    boxSizing: "border-box",
  },
  buyBtn: {
    padding: "12px 24px",
    borderRadius: "100px",
    border: "none",
    background: "#9960a8",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    width: window.innerWidth < 480 ? "100%" : "auto", // Full width button on mobile
    transition: "opacity 0.2s",
  },
};
