import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import { Tag, Save, Loader2 } from "lucide-react";
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
        // Only save duration if Hour/Time is selected
        duration: isPerHour ? priceData[courseId]?.duration || "" : "",
        hasPack: priceData[courseId]?.hasPack ?? false,
        isPerHour: isPerHour,
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
        <Tag size={16} /> Course Pricing Management
      </h3>
      <p style={{ opacity: 0.6, fontSize: "0.9rem", marginBottom: "2rem" }}>
        Set the prices for your courses here. These prices will appear directly
        on the course pages.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {availableCourses.map((c) => {
          const courseId = c.link.replace(/\//g, "");
          const currentSingle = priceData[courseId]?.priceSingle || "";
          const currentFull = priceData[courseId]?.priceFull || "";
          const currentPackSize = priceData[courseId]?.packSize || "10";
          const currentDuration = priceData[courseId]?.duration || "";

          const hasPack = priceData[courseId]?.hasPack ?? false;
          const isPerHour = priceData[courseId]?.isPerHour ?? false;

          const isSaving = savingPriceId === courseId;

          // Admin dynamic preview label
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
                {/* Base Price Input with Toggle */}
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
                      whiteSpace: "nowrap",
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

                {/* Time / Duration Input (Only visible if Hour/Time is selected) */}
                {isPerHour && (
                  <div style={{ flex: "1 1 90px" }}>
                    <div
                      style={{
                        marginBottom: "6px",
                        height: "26px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        Duration (min)
                      </label>
                    </div>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 90"
                      value={currentDuration}
                      onChange={(e) =>
                        handlePriceChange(courseId, "duration", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                )}

                {/* Pack Enable Checkbox & Size Input */}
                <div
                  style={{
                    flex: "1 1 100px",
                    paddingBottom: hasPack ? 0 : "8px",
                  }}
                >
                  <div
                    style={{
                      marginBottom: hasPack ? "6px" : "0",
                      height: hasPack ? "26px" : "auto",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <label
                      style={{
                        ...labelStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginBottom: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={hasPack}
                        onChange={(e) =>
                          handlePriceChange(
                            courseId,
                            "hasPack",
                            e.target.checked,
                          )
                        }
                        style={{ cursor: "pointer", margin: 0 }}
                      />
                      {hasPack ? "Pack Size" : "Enable Pack"}
                    </label>
                  </div>
                  {hasPack && (
                    <input
                      type="number"
                      min="2"
                      placeholder="10"
                      value={currentPackSize}
                      onChange={(e) =>
                        handlePriceChange(courseId, "packSize", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  )}
                </div>

                {/* Pack Price Input (Only visible if Pack is enabled) */}
                {hasPack && (
                  <div style={{ flex: "1.5 1 120px" }}>
                    <div
                      style={{
                        marginBottom: "6px",
                        height: "26px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <label
                        style={{
                          ...labelStyle,
                          marginBottom: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {currentPackSize}-Pack Price
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 400 CHF"
                      value={currentFull}
                      onChange={(e) =>
                        handlePriceChange(courseId, "priceFull", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                )}
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
