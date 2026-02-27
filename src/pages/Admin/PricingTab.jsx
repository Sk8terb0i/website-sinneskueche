import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import {
  Tag,
  Save,
  Loader2,
  Users,
  Eye,
  EyeOff,
  CreditCard,
  Layers,
} from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  labelStyle,
  inputStyle,
  btnStyle,
  toggleContainerStyle,
  toggleOptionStyle,
} from "./AdminStyles";

export default function PricingTab({ isMobile }) {
  const [priceData, setPriceData] = useState({});
  const [savingPriceId, setSavingPriceId] = useState(null);

  const courseSettingsCollection = collection(db, "course_settings");

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  );

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const snap = await getDocs(courseSettingsCollection);
      const prices = {};
      snap.docs.forEach((doc) => {
        prices[doc.id] = doc.data();
      });
      setPriceData(prices);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  const handlePriceChange = (courseId, field, value) => {
    setPriceData((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        [field]: value,
      },
    }));
  };

  const savePrice = async (courseId, courseName) => {
    setSavingPriceId(courseId);
    const isPerHour = priceData[courseId]?.isPerHour ?? false;

    try {
      const dataToSave = {
        priceSingle: priceData[courseId]?.priceSingle || "",
        priceFull: priceData[courseId]?.priceFull || "",
        packSize: priceData[courseId]?.packSize || "10",
        duration: isPerHour ? priceData[courseId]?.duration || "" : "",
        hasPack: priceData[courseId]?.hasPack ?? false,
        isPerHour: isPerHour,
        hasCapacity: priceData[courseId]?.hasCapacity ?? false,
        capacity: priceData[courseId]?.capacity || "",
        isVisible: priceData[courseId]?.isVisible ?? true,
        courseName: courseName,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "course_settings", courseId), dataToSave, {
        merge: true,
      });
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setSavingPriceId(null);
    }
  };

  return (
    <section
      style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <Tag size={18} /> Course Management
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {availableCourses.map((c) => {
          const courseId = c.link.replace(/\//g, "");
          const currentSingle = priceData[courseId]?.priceSingle || "";
          const currentFull = priceData[courseId]?.priceFull || "";
          const currentPackSize = priceData[courseId]?.packSize || "10";
          const currentDuration = priceData[courseId]?.duration || "";
          const hasCapacity = priceData[courseId]?.hasCapacity ?? false;
          const currentCapacity = priceData[courseId]?.capacity || "";
          const hasPack = priceData[courseId]?.hasPack ?? false;
          const isPerHour = priceData[courseId]?.isPerHour ?? false;
          const isVisible = priceData[courseId]?.isVisible ?? true;

          const isSaving = savingPriceId === courseId;

          return (
            <div
              key={courseId}
              style={{
                ...cardStyle,
                flexDirection: "column",
                alignItems: "stretch",
                gap: "1.5rem",
                padding: isMobile ? "1.5rem" : "2rem",
                borderLeft: isVisible ? "6px solid #caaff3" : "6px solid #ccc",
                backgroundColor: isVisible ? "#fdf8e1" : "#f5f5f5",
              }}
            >
              {/* --- SECTION 1: IDENTITY & VISIBILITY --- */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "10px",
                  borderBottom: "1px solid rgba(28,7,0,0.05)",
                  paddingBottom: "1rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4
                    style={{ margin: 0, fontSize: "1.2rem", color: "#1c0700" }}
                  >
                    {c.text.en}
                  </h4>
                  <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                    Path: {c.link}
                  </span>
                </div>
                <div
                  style={{
                    ...toggleContainerStyle,
                    width: "fit-content",
                    padding: "2px",
                  }}
                >
                  <div
                    onClick={() =>
                      handlePriceChange(courseId, "isVisible", true)
                    }
                    style={{
                      ...toggleOptionStyle,
                      padding: "6px 12px",
                      fontSize: "0.7rem",
                      backgroundColor: isVisible ? "#caaff3" : "transparent",
                    }}
                  >
                    <Eye size={14} /> {!isMobile && "Visible"}
                  </div>
                  <div
                    onClick={() =>
                      handlePriceChange(courseId, "isVisible", false)
                    }
                    style={{
                      ...toggleOptionStyle,
                      padding: "6px 12px",
                      fontSize: "0.7rem",
                      backgroundColor: !isVisible ? "#666" : "transparent",
                      color: !isVisible ? "white" : "inherit",
                    }}
                  >
                    <EyeOff size={14} /> {!isMobile && "Hidden"}
                  </div>
                </div>
              </div>

              {/* --- SECTION 2: BASE PRICING --- */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: "1.5rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      ...labelStyle,
                      fontSize: "0.75rem",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <CreditCard size={14} /> Base Pricing Type
                  </label>
                  <div
                    style={{
                      ...toggleContainerStyle,
                      padding: "2px",
                      width: "100%",
                    }}
                  >
                    <div
                      onClick={() =>
                        handlePriceChange(courseId, "isPerHour", false)
                      }
                      style={{
                        ...toggleOptionStyle,
                        flex: 1,
                        padding: "8px",
                        fontSize: "0.75rem",
                        backgroundColor: !isPerHour ? "#caaff3" : "transparent",
                      }}
                    >
                      Session Based
                    </div>
                    <div
                      onClick={() =>
                        handlePriceChange(courseId, "isPerHour", true)
                      }
                      style={{
                        ...toggleOptionStyle,
                        flex: 1,
                        padding: "8px",
                        fontSize: "0.75rem",
                        backgroundColor: isPerHour ? "#caaff3" : "transparent",
                      }}
                    >
                      Time Based
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", gap: "10px" }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ ...labelStyle, fontSize: "0.75rem" }}>
                      {isPerHour ? "Price" : "Single Price"}
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="45 CHF"
                      value={currentSingle}
                      onChange={(e) =>
                        handlePriceChange(
                          courseId,
                          "priceSingle",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  {isPerHour && (
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle, fontSize: "0.75rem" }}>
                        Mins
                      </label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={currentDuration}
                        onChange={(e) =>
                          handlePriceChange(
                            courseId,
                            "duration",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* --- SECTION 3: PACKS & CAPACITY (SIDE BY SIDE ON DESKTOP) --- */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: "1rem",
                }}
              >
                {/* Pack Box */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: hasPack
                      ? "rgba(202, 175, 243, 0.1)"
                      : "transparent",
                    padding: "12px",
                    borderRadius: "12px",
                    border: hasPack
                      ? "1px solid #caaff3"
                      : "1px solid rgba(28,7,0,0.05)",
                  }}
                >
                  <label
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      marginBottom: hasPack ? "12px" : 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hasPack}
                      onChange={(e) =>
                        handlePriceChange(courseId, "hasPack", e.target.checked)
                      }
                    />
                    Enable Session Packs
                  </label>
                  {hasPack && (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{ fontSize: "0.65rem", fontWeight: "bold" }}
                        >
                          Size
                        </label>
                        <input
                          type="number"
                          style={{ ...inputStyle, padding: "8px" }}
                          value={currentPackSize}
                          onChange={(e) =>
                            handlePriceChange(
                              courseId,
                              "packSize",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label
                          style={{ fontSize: "0.65rem", fontWeight: "bold" }}
                        >
                          Pack Price
                        </label>
                        <input
                          style={{ ...inputStyle, padding: "8px" }}
                          value={currentFull}
                          onChange={(e) =>
                            handlePriceChange(
                              courseId,
                              "priceFull",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Capacity Box */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: hasCapacity
                      ? "rgba(78, 95, 40, 0.05)"
                      : "transparent",
                    padding: "12px",
                    borderRadius: "12px",
                    border: hasCapacity
                      ? "1px solid #4e5f28"
                      : "1px solid rgba(28,7,0,0.05)",
                  }}
                >
                  <label
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      color: hasCapacity ? "#4e5f28" : "inherit",
                      marginBottom: hasCapacity ? "12px" : 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hasCapacity}
                      onChange={(e) =>
                        handlePriceChange(
                          courseId,
                          "hasCapacity",
                          e.target.checked,
                        )
                      }
                    />
                    Limit Max Students
                  </label>
                  {hasCapacity && (
                    <div>
                      <label
                        style={{ fontSize: "0.65rem", fontWeight: "bold" }}
                      >
                        Students Per Session
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          style={{ ...inputStyle, padding: "8px 8px 8px 32px" }}
                          value={currentCapacity}
                          onChange={(e) =>
                            handlePriceChange(
                              courseId,
                              "capacity",
                              e.target.value,
                            )
                          }
                        />
                        <Users
                          size={14}
                          style={{
                            position: "absolute",
                            left: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            opacity: 0.4,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* --- SAVE BUTTON --- */}
              <button
                onClick={() => savePrice(courseId, c.text.en)}
                disabled={isSaving}
                style={{
                  ...btnStyle,
                  marginTop: "0.5rem",
                  padding: "14px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {isSaving ? (
                  <Loader2 size={18} className="spinner" />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? "Saving Updates..." : "Save Course Settings"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
