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
  Plus,
  Trash2,
  Star,
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

export default function PricingTab({
  isMobile,
  userRole,
  allowedCourses = [],
}) {
  const [priceData, setPriceData] = useState({});
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");

  // State for new special event inputs
  const [newEventEn, setNewEventEn] = useState("");
  const [newEventDe, setNewEventDe] = useState("");
  const [newEventCap, setNewEventCap] = useState("");

  const isFullAdmin = userRole === "admin";
  const courseSettingsCollection = collection(db, "course_settings");

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

  useEffect(() => {
    if (availableCourses.length > 0 && !selectedCourse) {
      setSelectedCourse(availableCourses[0].link.replace(/\//g, ""));
    }
  }, [availableCourses, selectedCourse]);

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

  const addPackOption = (courseId) => {
    const currentPacks = priceData[courseId]?.packs || [];
    handlePriceChange(courseId, "packs", [
      ...currentPacks,
      { size: "5", price: "" },
    ]);
  };

  const updatePackOption = (courseId, index, field, value) => {
    const updatedPacks = [...(priceData[courseId]?.packs || [])];
    updatedPacks[index][field] = value;
    handlePriceChange(courseId, "packs", updatedPacks);
  };

  const removePackOption = (courseId, index) => {
    const updatedPacks = (priceData[courseId]?.packs || []).filter(
      (_, i) => i !== index,
    );
    handlePriceChange(courseId, "packs", updatedPacks);
  };

  // --- Special Event Handlers ---
  const addSpecialEvent = (courseId) => {
    if (!newEventEn.trim() || !newEventDe.trim()) {
      alert("Please provide both English and German names.");
      return;
    }
    const currentEvents = priceData[courseId]?.specialEvents || [];
    handlePriceChange(courseId, "specialEvents", [
      ...currentEvents,
      {
        id: Date.now().toString(),
        nameEn: newEventEn.trim(),
        nameDe: newEventDe.trim(),
        capacity: newEventCap || null, // Save capacity if provided
      },
    ]);
    setNewEventEn("");
    setNewEventDe("");
    setNewEventCap("");
  };

  const updateSpecialEvent = (courseId, eventId, field, value) => {
    const currentEvents = priceData[courseId]?.specialEvents || [];
    const updatedEvents = currentEvents.map((ev) =>
      ev.id === eventId ? { ...ev, [field]: value } : ev,
    );
    handlePriceChange(courseId, "specialEvents", updatedEvents);
  };

  const removeSpecialEvent = (courseId, eventId) => {
    const currentEvents = priceData[courseId]?.specialEvents || [];
    handlePriceChange(
      courseId,
      "specialEvents",
      currentEvents.filter((e) => e.id !== eventId),
    );
  };

  const savePrice = async (courseId, courseName) => {
    setSavingPriceId(courseId);
    const isPerHour = priceData[courseId]?.isPerHour ?? false;

    try {
      const validPacks = (priceData[courseId]?.packs || []).filter(
        (p) => p.size !== "" && p.price !== "",
      );

      const dataToSave = {
        priceSingle: priceData[courseId]?.priceSingle || "",
        priceFull: validPacks[0]?.price || "",
        packSize: validPacks[0]?.size || "10",
        packs: validPacks,
        duration: isPerHour ? priceData[courseId]?.duration || "" : "",
        hasPack: priceData[courseId]?.hasPack ?? false,
        isPerHour: isPerHour,
        hasCapacity: priceData[courseId]?.hasCapacity ?? false,
        capacity: priceData[courseId]?.capacity || "",
        isVisible: priceData[courseId]?.isVisible ?? true,
        courseName: courseName,
        specialEvents: priceData[courseId]?.specialEvents || [],
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "course_settings", courseId), dataToSave, {
        merge: true,
      });
      await fetchPrices();
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setSavingPriceId(null);
    }
  };

  const activeCourse = availableCourses.find(
    (c) => c.link.replace(/\//g, "") === selectedCourse,
  );

  return (
    <section
      style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <Tag size={18} /> Course Management {!isFullAdmin && "(Restricted)"}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div
          style={{
            backgroundColor: "#fdf8e1",
            padding: "1.5rem",
            borderRadius: "16px",
            border: "1px solid rgba(28, 7, 0, 0.05)",
          }}
        >
          <label style={labelStyle}>Select Course to Manage</label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setNewEventEn("");
              setNewEventDe("");
              setNewEventCap("");
            }}
            style={{
              ...inputStyle,
              backgroundColor: "rgba(202, 175, 243, 0.1)",
              cursor: "pointer",
              marginBottom: 0,
            }}
          >
            {availableCourses.length === 0 && (
              <option>No courses assigned</option>
            )}
            {availableCourses.map((c) => (
              <option
                key={c.link.replace(/\//g, "")}
                value={c.link.replace(/\//g, "")}
              >
                {c.text.en}
              </option>
            ))}
          </select>
        </div>

        {activeCourse && (
          <div
            key={selectedCourse}
            style={{
              ...cardStyle,
              flexDirection: "column",
              alignItems: "stretch",
              gap: "1.5rem",
              padding: isMobile ? "1.5rem" : "2rem",
              borderLeft:
                (priceData[selectedCourse]?.isVisible ?? true)
                  ? "6px solid #caaff3"
                  : "6px solid #ccc",
              backgroundColor:
                (priceData[selectedCourse]?.isVisible ?? true)
                  ? "#fdf8e1"
                  : "#f5f5f5",
            }}
          >
            {/* ... Existing Pricing & Capacity Sections ... */}
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
                <h4 style={{ margin: 0, fontSize: "1.2rem", color: "#1c0700" }}>
                  {activeCourse.text.en}
                </h4>
                <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                  Path: {activeCourse.link}
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
                    handlePriceChange(selectedCourse, "isVisible", true)
                  }
                  style={{
                    ...toggleOptionStyle,
                    padding: "6px 12px",
                    fontSize: "0.7rem",
                    backgroundColor:
                      (priceData[selectedCourse]?.isVisible ?? true)
                        ? "#caaff3"
                        : "transparent",
                  }}
                >
                  <Eye size={14} /> {!isMobile && "Visible"}
                </div>
                <div
                  onClick={() =>
                    handlePriceChange(selectedCourse, "isVisible", false)
                  }
                  style={{
                    ...toggleOptionStyle,
                    padding: "6px 12px",
                    fontSize: "0.7rem",
                    backgroundColor: !(
                      priceData[selectedCourse]?.isVisible ?? true
                    )
                      ? "#666"
                      : "transparent",
                    color: !(priceData[selectedCourse]?.isVisible ?? true)
                      ? "white"
                      : "inherit",
                  }}
                >
                  <EyeOff size={14} /> {!isMobile && "Hidden"}
                </div>
              </div>
            </div>

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
                      handlePriceChange(selectedCourse, "isPerHour", false)
                    }
                    style={{
                      ...toggleOptionStyle,
                      flex: 1,
                      padding: "8px",
                      fontSize: "0.75rem",
                      backgroundColor: !(
                        priceData[selectedCourse]?.isPerHour ?? false
                      )
                        ? "#caaff3"
                        : "transparent",
                    }}
                  >
                    Session Based
                  </div>
                  <div
                    onClick={() =>
                      handlePriceChange(selectedCourse, "isPerHour", true)
                    }
                    style={{
                      ...toggleOptionStyle,
                      flex: 1,
                      padding: "8px",
                      fontSize: "0.75rem",
                      backgroundColor:
                        (priceData[selectedCourse]?.isPerHour ?? false)
                          ? "#caaff3"
                          : "transparent",
                    }}
                  >
                    Time Based
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", gap: "10px" }}>
                <div style={{ flex: 2 }}>
                  <label style={{ ...labelStyle, fontSize: "0.75rem" }}>
                    {(priceData[selectedCourse]?.isPerHour ?? false)
                      ? "Price"
                      : "Single Price"}
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="45 CHF"
                    value={priceData[selectedCourse]?.priceSingle || ""}
                    onChange={(e) =>
                      handlePriceChange(
                        selectedCourse,
                        "priceSingle",
                        e.target.value,
                      )
                    }
                  />
                </div>
                {(priceData[selectedCourse]?.isPerHour ?? false) && (
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, fontSize: "0.75rem" }}>
                      Mins
                    </label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={priceData[selectedCourse]?.duration || ""}
                      onChange={(e) =>
                        handlePriceChange(
                          selectedCourse,
                          "duration",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Session Packs */}
            <div
              style={{
                backgroundColor: "rgba(202, 175, 243, 0.05)",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid rgba(28,7,0,0.05)",
              }}
            >
              <label
                style={{
                  ...labelStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  marginBottom:
                    (priceData[selectedCourse]?.hasPack ?? false) ? "1rem" : 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={priceData[selectedCourse]?.hasPack ?? false}
                  onChange={(e) =>
                    handlePriceChange(
                      selectedCourse,
                      "hasPack",
                      e.target.checked,
                    )
                  }
                />
                Enable Session Packs
              </label>
              {(priceData[selectedCourse]?.hasPack ?? false) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {(priceData[selectedCourse]?.packs || []).map((pack, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-end",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            opacity: 0.5,
                          }}
                        >
                          Size
                        </label>
                        <input
                          type="number"
                          style={{
                            ...inputStyle,
                            padding: "8px",
                            marginBottom: 0,
                          }}
                          value={pack.size}
                          onChange={(e) =>
                            updatePackOption(
                              selectedCourse,
                              idx,
                              "size",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            opacity: 0.5,
                          }}
                        >
                          Price (CHF)
                        </label>
                        <input
                          placeholder="200"
                          style={{
                            ...inputStyle,
                            padding: "8px",
                            marginBottom: 0,
                          }}
                          value={pack.price}
                          onChange={(e) =>
                            updatePackOption(
                              selectedCourse,
                              idx,
                              "price",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <button
                        onClick={() => removePackOption(selectedCourse, idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff4d4d",
                          padding: "10px",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addPackOption(selectedCourse)}
                    style={{
                      ...btnStyle,
                      width: "fit-content",
                      padding: "8px 16px",
                      backgroundColor: "rgba(255,255,255,0.5)",
                      color: "#1c0700",
                      border: "1px dashed #caaff3",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={14} /> Add Pack Option
                  </button>
                </div>
              )}
            </div>

            {/* Course Capacity */}
            <div
              style={{
                backgroundColor: "rgba(78, 95, 40, 0.05)",
                padding: "12px",
                borderRadius: "12px",
                border:
                  (priceData[selectedCourse]?.hasCapacity ?? false)
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
                  color:
                    (priceData[selectedCourse]?.hasCapacity ?? false)
                      ? "#4e5f28"
                      : "inherit",
                  marginBottom:
                    (priceData[selectedCourse]?.hasCapacity ?? false)
                      ? "12px"
                      : 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={priceData[selectedCourse]?.hasCapacity ?? false}
                  onChange={(e) =>
                    handlePriceChange(
                      selectedCourse,
                      "hasCapacity",
                      e.target.checked,
                    )
                  }
                />
                Limit Max Students
              </label>
              {(priceData[selectedCourse]?.hasCapacity ?? false) && (
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    style={{ ...inputStyle, padding: "8px 8px 8px 32px" }}
                    value={priceData[selectedCourse]?.capacity || ""}
                    onChange={(e) =>
                      handlePriceChange(
                        selectedCourse,
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
              )}
            </div>

            {/* --- SESSION ADD-ONS (Special Events) SECTION --- */}
            <div
              style={{
                backgroundColor: "rgba(202, 175, 243, 0.05)",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid rgba(28,7,0,0.05)",
              }}
            >
              <label
                style={{
                  ...labelStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  opacity: 0.8,
                }}
              >
                <Star size={14} color="#9960a8" /> Session Add-ons
              </label>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {(priceData[selectedCourse]?.specialEvents || []).map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "stretch" : "center",
                      backgroundColor: "rgba(202, 175, 243, 0.08)",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px dashed rgba(202, 175, 243, 0.3)",
                      gap: "10px",
                    }}
                  >
                    <input
                      value={ev.nameEn || ""}
                      onChange={(e) =>
                        updateSpecialEvent(
                          selectedCourse,
                          ev.id,
                          "nameEn",
                          e.target.value,
                        )
                      }
                      placeholder="Name (EN)"
                      style={{
                        ...inputStyle,
                        padding: "8px 12px",
                        flex: 2,
                        marginBottom: 0,
                        fontSize: "0.85rem",
                      }}
                    />
                    <input
                      value={ev.nameDe || ""}
                      onChange={(e) =>
                        updateSpecialEvent(
                          selectedCourse,
                          ev.id,
                          "nameDe",
                          e.target.value,
                        )
                      }
                      placeholder="Name (DE)"
                      style={{
                        ...inputStyle,
                        padding: "8px 12px",
                        flex: 2,
                        marginBottom: 0,
                        fontSize: "0.85rem",
                      }}
                    />
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type="number"
                        value={ev.capacity || ""}
                        onChange={(e) =>
                          updateSpecialEvent(
                            selectedCourse,
                            ev.id,
                            "capacity",
                            e.target.value,
                          )
                        }
                        placeholder="Cap"
                        style={{
                          ...inputStyle,
                          padding: "8px 8px 8px 30px",
                          marginBottom: 0,
                          fontSize: "0.85rem",
                        }}
                        title="Capacity limit for this add-on"
                      />
                      <Users
                        size={12}
                        style={{
                          position: "absolute",
                          left: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          opacity: 0.4,
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeSpecialEvent(selectedCourse, ev.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4d",
                        cursor: "pointer",
                        padding: isMobile ? "8px" : "4px",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {/* New Add-on Row */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: "10px",
                    marginTop: "8px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(28, 7, 0, 0.05)",
                  }}
                >
                  <input
                    value={newEventEn}
                    onChange={(e) => setNewEventEn(e.target.value)}
                    placeholder="New Add-on (EN)"
                    style={{
                      ...inputStyle,
                      padding: "10px 12px",
                      flex: 2,
                      marginBottom: 0,
                    }}
                  />
                  <input
                    value={newEventDe}
                    onChange={(e) => setNewEventDe(e.target.value)}
                    placeholder="New Add-on (DE)"
                    style={{
                      ...inputStyle,
                      padding: "10px 12px",
                      flex: 2,
                      marginBottom: 0,
                    }}
                  />
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      type="number"
                      value={newEventCap}
                      onChange={(e) => setNewEventCap(e.target.value)}
                      placeholder="Cap"
                      style={{
                        ...inputStyle,
                        padding: "10px 10px 10px 32px",
                        marginBottom: 0,
                      }}
                      title="Capacity limit"
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
                  <button
                    onClick={() => addSpecialEvent(selectedCourse)}
                    style={{
                      ...btnStyle,
                      width: isMobile ? "100%" : "auto",
                      padding: "0 18px",
                      marginTop: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={16} /> {isMobile && "Add Add-on"}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => savePrice(selectedCourse, activeCourse.text.en)}
              disabled={savingPriceId === selectedCourse}
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
              {savingPriceId === selectedCourse ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <Save size={18} />
              )}
              {savingPriceId === selectedCourse
                ? "Saving Updates..."
                : "Save Course Settings"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
