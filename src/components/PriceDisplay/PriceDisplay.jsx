import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function PriceDisplay({ coursePath, currentLang }) {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      // Clean path: "/pottery" -> "pottery"
      const docId = coursePath.replace(/\//g, "");

      try {
        const docRef = doc(db, "course_settings", docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setPricing(snap.data());
        }
      } catch (err) {
        console.error("Error fetching price:", err);
      } finally {
        setLoading(false);
      }
    };

    if (coursePath) {
      fetchPrice();
    }
  }, [coursePath]);

  // If loading or there is no price set at all, return nothing
  if (loading || !pricing || (!pricing.priceSingle && !pricing.priceFull)) {
    return null;
  }

  // Fallbacks based on your defaults
  const packSize = pricing.packSize || "10";
  const hasPack = pricing.hasPack ?? false;
  const isPerHour = pricing.isPerHour ?? false;
  const durationNumber = pricing.duration || "";

  // Dynamic Label Logic
  let singleLabelEn = "";
  let singleLabelDe = "";

  if (isPerHour) {
    if (durationNumber) {
      singleLabelEn = `Per ${durationNumber} mins`;
      singleLabelDe = `Pro ${durationNumber} Min.`;
    } else {
      singleLabelEn = "Per Hour";
      singleLabelDe = "Pro Stunde";
    }
  } else {
    // Per Session logic - Duration is ignored completely
    singleLabelEn = "Single Session";
    singleLabelDe = "Einzelstunde";
  }

  return (
    <div style={containerStyle}>
      {/* Single Session / Dynamic Per Hour Rendering */}
      {pricing.priceSingle && (
        <div style={priceBoxStyle}>
          <span style={labelStyle}>
            {currentLang === "en" ? singleLabelEn : singleLabelDe}
          </span>
          <span style={valueStyle}>{pricing.priceSingle}</span>
        </div>
      )}

      {/* Pack Rendering (Only shows if there is a price string AND hasPack is true) */}
      {pricing.priceFull && hasPack && (
        <div style={priceBoxStyle}>
          <span style={labelStyle}>
            {currentLang === "en"
              ? `${packSize}-Session Pack`
              : `${packSize}er Karte`}
          </span>
          <span style={valueStyle}>{pricing.priceFull}</span>
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  display: "flex",
  gap: "1.5rem",
  margin: "2rem 0",
  justifyContent: "center",
  flexWrap: "wrap",
};

const priceBoxStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "1rem 2.5rem",
  background: "#fdf8e1",
  border: "1px solid rgba(28, 7, 0, 0.1)",
  borderRadius: "16px",
  minWidth: "140px",
  boxShadow: "0 4px 15px rgba(28, 7, 0, 0.02)",
};

const labelStyle = {
  fontSize: "0.7rem",
  fontFamily: "Satoshi",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05rem",
  opacity: 0.5,
  marginBottom: "0.5rem",
  textAlign: "center",
};

const valueStyle = {
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "2rem",
  color: "#4e5f28",
  textAlign: "center",
};
