import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { planets } from "../../data/planets";
import { Tag, Save, Loader2, Users, Eye, EyeOff } from "lucide-react";
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
        hasCapacity: priceData[courseId]?.hasCapacity ?? false,
        capacity: priceData[courseId]?.capacity || "",
        isVisible: priceData[courseId]?.isVisible ?? true, // NEW: Visibility state
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
      style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <Tag size={16} /> Course Management
      </h3>
      <p style={{ opacity: 0.6, fontSize: "0.9rem", marginBottom: "2rem" }}>
        Manage visibility, pricing, and booking limits for your courses.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
          const isVisible = priceData[courseId]?.isVisible ?? true; // NEW

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
                borderLeft: isVisible ? "4px solid #4e5f28" : "4px solid #ccc",
                opacity: isVisible ? 1 : 0.8,
              }}
            >
              {/* Course Identity & Visibility Toggle */}
              <div style={{ flex: "1 1 200px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                    {c.text.en}
                  </span>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      ...labelStyle,
                      fontSize: "0.6rem",
                      marginBottom: "4px",
                    }}
                  >
                    Status
                  </label>
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
                        padding: "4px 10px",
                        fontSize: "0.7rem",
                        backgroundColor: isVisible ? "#caaff3" : "transparent",
                      }}
                    >
                      <Eye size={12} style={{ marginRight: "4px" }} /> Visible
                    </div>
                    <div
                      onClick={() =>
                        handlePriceChange(courseId, "isVisible", false)
                      }
                      style={{
                        ...toggleOptionStyle,
                        padding: "4px 10px",
                        fontSize: "0.7rem",
                        backgroundColor: !isVisible ? "#666" : "transparent",
                        color: !isVisible ? "white" : "inherit",
                      }}
                    >
                      <EyeOff size={12} style={{ marginRight: "4px" }} /> Hidden
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>
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
                {/* Pricing Type Toggle & Base Price */}
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
                        Time-based
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
                        fontSize: "0.6rem",
                      }}
                    >
                      Duration (min)
                    </label>
                    <input
                      type="number"
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
                      fontSize: "0.6rem",
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
                        fontSize: "0.6rem",
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

                {/* Capacity Logic */}
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
                      fontSize: "0.6rem",
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
