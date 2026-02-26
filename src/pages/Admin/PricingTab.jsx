import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import { Tag, Save, Loader2, Users } from "lucide-react"; // Added Users icon
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // NEW: Capacity fields
        hasCapacity: priceData[courseId]?.hasCapacity ?? false,
        capacity: priceData[courseId]?.capacity || "",
        courseName: courseName,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "course_settings", courseId), dataToSave, {
        merge: true,
      });
    } catch (error) {
      alert("Error saving price: " + error.message);
    } finally {
      setSavingPriceId(null);
    }
  };

  return (
    <section
      style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <Tag size={16} /> Course Pricing & Capacity Management
      </h3>
      <p style={{ opacity: 0.6, fontSize: "0.9rem", marginBottom: "2rem" }}>
        Set the prices and booking limits for your courses here.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {availableCourses.map((c) => {
          const courseId = c.link.replace(/\//g, "");
          const currentSingle = priceData[courseId]?.priceSingle || "";
          const currentFull = priceData[courseId]?.priceFull || "";
          const currentPackSize = priceData[courseId]?.packSize || "10";
          const currentDuration = priceData[courseId]?.duration || "";

          // NEW: Capacity current values
          const hasCapacity = priceData[courseId]?.hasCapacity ?? false;
          const currentCapacity = priceData[courseId]?.capacity || "";

          const hasPack = priceData[courseId]?.hasPack ?? false;
          const isPerHour = priceData[courseId]?.isPerHour ?? false;

          const isSaving = savingPriceId === courseId;

          const singleLabelPreview = isPerHour
            ? currentDuration
              ? `Price Per ${currentDuration} min`
              : "Price Per Hour"
            : "Single Session";

          return (
            <div
              key={courseId}
              style={{
                ...cardStyle,
                flexWrap: "wrap",
                gap: "1.5rem",
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: "1 1 150px" }}>
                <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  {c.text.en}
                </span>
                <div
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.5,
                    marginTop: "4px",
                  }}
                >
                  Path: {c.link}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flex: "4 1 500px",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                {/* Base Price Input */}
                <div
                  style={{
                    flex: "1.5 1 130px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ marginBottom: "8px" }}>
                    <div
                      style={{
                        ...toggleContainerStyle,
                        padding: "2px",
                        borderRadius: "8px",
                        width: "100%",
                        display: "flex",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        onClick={() =>
                          handlePriceChange(courseId, "isPerHour", false)
                        }
                        style={{
                          ...toggleOptionStyle,
                          flex: 1,
                          backgroundColor: !isPerHour
                            ? "#caaff3"
                            : "transparent",
                          padding: "4px 4px",
                          fontSize: "0.6rem",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Session
                      </div>
                      <div
                        onClick={() =>
                          handlePriceChange(courseId, "isPerHour", true)
                        }
                        style={{
                          ...toggleOptionStyle,
                          flex: 1,
                          backgroundColor: isPerHour
                            ? "#caaff3"
                            : "transparent",
                          padding: "4px 4px",
                          fontSize: "0.6rem",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Hour/Time
                      </div>
                    </div>
                  </div>
                  <label
                    style={{
                      ...labelStyle,
                      marginBottom: "6px",
                      fontSize: "0.55rem",
                    }}
                  >
                    {singleLabelPreview}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 45 CHF"
                    value={currentSingle}
                    onChange={(e) =>
                      handlePriceChange(courseId, "priceSingle", e.target.value)
                    }
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>

                {isPerHour && (
                  <div style={{ flex: "1 1 90px" }}>
                    <label
                      style={{
                        ...labelStyle,
                        marginBottom: "6px",
                        height: "26px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={currentDuration}
                      onChange={(e) =>
                        handlePriceChange(courseId, "duration", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                )}

                {/* Pack Logic */}
                <div
                  style={{
                    flex: "1 1 100px",
                    paddingBottom: hasPack ? 0 : "8px",
                  }}
                >
                  <label
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: hasPack ? "6px" : "0",
                      height: hasPack ? "26px" : "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hasPack}
                      onChange={(e) =>
                        handlePriceChange(courseId, "hasPack", e.target.checked)
                      }
                      style={{ cursor: "pointer", margin: 0 }}
                    />
                    {hasPack ? "Pack Size" : "Enable Pack"}
                  </label>
                  {hasPack && (
                    <input
                      type="number"
                      min="2"
                      value={currentPackSize}
                      onChange={(e) =>
                        handlePriceChange(courseId, "packSize", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  )}
                </div>

                {hasPack && (
                  <div style={{ flex: "1.5 1 120px" }}>
                    <label
                      style={{
                        ...labelStyle,
                        marginBottom: "6px",
                        height: "26px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {currentPackSize}-Pack Price
                    </label>
                    <input
                      type="text"
                      value={currentFull}
                      onChange={(e) =>
                        handlePriceChange(courseId, "priceFull", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                )}

                {/* NEW: Capacity Option */}
                <div
                  style={{
                    flex: "1 1 120px",
                    paddingBottom: hasCapacity ? 0 : "8px",
                  }}
                >
                  <label
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: hasCapacity ? "6px" : "0",
                      height: hasCapacity ? "26px" : "auto",
                      color: hasCapacity ? "#4e5f28" : "inherit",
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
                      style={{ cursor: "pointer", margin: 0 }}
                    />
                    {hasCapacity ? "Max Students" : "Limit Capacity"}
                  </label>
                  {hasCapacity && (
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 8"
                        value={currentCapacity}
                        onChange={(e) =>
                          handlePriceChange(
                            courseId,
                            "capacity",
                            e.target.value,
                          )
                        }
                        style={{
                          ...inputStyle,
                          marginBottom: 0,
                          paddingLeft: "30px",
                        }}
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
                  )}
                </div>
              </div>

              <button
                onClick={() => savePrice(courseId, c.text.en)}
                disabled={isSaving}
                style={{
                  ...btnStyle,
                  width: "auto",
                  marginTop: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                }}
              >
                {isSaving ? (
                  <Loader2 size={18} className="spinner" />
                ) : (
                  <Save size={18} />
                )}
                {isMobile ? "" : "Save"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
