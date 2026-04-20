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
  Clock,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
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
  currentLang,
}) {
  const [priceData, setPriceData] = useState({});
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");

  const [newEventEn, setNewEventEn] = useState("");
  const [newEventDe, setNewEventDe] = useState("");
  const [newEventCap, setNewEventCap] = useState("");
  const [newEventPrice, setNewEventPrice] = useState("");
  const [newEventMandatory, setNewEventMandatory] = useState(false);
  const [newEventFreePack, setNewEventFreePack] = useState(false);
  const [newEventIntroId, setNewEventIntroId] = useState("");
  const [newEventTimeSlots, setNewEventTimeSlots] = useState([
    { startTime: "", endTime: "", capacity: "" },
  ]);

  const isFullAdmin = userRole === "admin";
  const courseSettingsCollection = collection(db, "course_settings");

  const labels = {
    en: {
      title: "Course Management",
      restricted: "(Restricted)",
      selectCourse: "Select Course to Manage",
      noCourses: "No courses assigned",
      path: "Path:",
      visible: "Visible",
      hidden: "Hidden",
      baseType: "Base Pricing Type",
      sessionBased: "Session Based",
      timeBased: "Time Based",
      price: "Price",
      singlePrice: "Single Price",
      mins: "Mins",
      enablePacks: "Enable Session Packs",
      limitPacks: "Limit users to 1 ticket per day",
      size: "Size",
      priceChf: "Price (CHF)",
      addPack: "Add Pack Option",
      limitCap: "Limit Max Students",
      addons: "Session Add-ons",
      nameEn: "Name (EN)",
      nameDe: "Name (DE)",
      cap: "Cap",
      addonPrice: "+ CHF",
      newAddonEn: "New Add-on (EN)",
      newAddonDe: "New Add-on (DE)",
      mandatoryFirstTimers: "Mandatory for first-timers",
      freeWithPack: "Free with Session Pack",
      requiresIntro: "Prerequisite:",
      timeSlots: "Time Slots",
      startTime: "Start Time",
      endTime: "End Time",
      addSlot: "Add Slot",
      addAddon: "Create Add-on",
      saving: "Saving Updates...",
      save: "Save Course Settings",
      errNames: "Please provide both English and German names.",
    },
    de: {
      title: "Kursverwaltung",
      restricted: "(Eingeschränkt)",
      selectCourse: "Kurs zur Verwaltung auswählen",
      noCourses: "Keine Kurse zugewiesen",
      path: "Pfad:",
      visible: "Sichtbar",
      hidden: "Versteckt",
      baseType: "Preismodell",
      sessionBased: "Pro Session",
      timeBased: "Nach Zeit",
      price: "Preis",
      singlePrice: "Einzelpreis",
      mins: "Min.",
      enablePacks: "Session-Packs aktivieren",
      limitPacks: "Nutzer auf 1 Ticket pro Tag beschränken",
      size: "Größe",
      priceChf: "Preis (CHF)",
      addPack: "Paket hinzufügen",
      limitCap: "Maximale Teilnehmerzahl",
      addons: "Session Extras",
      nameEn: "Name (EN)",
      nameDe: "Name (DE)",
      cap: "Max",
      addonPrice: "+ CHF",
      newAddonEn: "Neues Extra (EN)",
      newAddonDe: "Neues Extra (DE)",
      mandatoryFirstTimers: "Obligatorisch für Erstkunden",
      freeWithPack: "Gratis mit Kurspaket",
      requiresIntro: "Voraussetzung:",
      timeSlots: "Zeitslots",
      startTime: "Startzeit",
      endTime: "Endzeit",
      addSlot: "Slot hinzufügen",
      addAddon: "Extra Erstellen",
      saving: "Speichern...",
      save: "Kurseinstellungen speichern",
      errNames: "Bitte sowohl englischen als auch deutschen Namen angeben.",
    },
  }[currentLang || "en"];

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
      [courseId]: { ...prev[courseId], [field]: value },
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

  const handleNewTimeSlotChange = (index, field, value) => {
    const updated = [...newEventTimeSlots];
    updated[index][field] = value;
    setNewEventTimeSlots(updated);
  };

  const addNewTimeSlot = () => {
    setNewEventTimeSlots([
      ...newEventTimeSlots,
      { startTime: "", endTime: "", capacity: "" },
    ]);
  };

  const removeNewTimeSlot = (index) => {
    setNewEventTimeSlots(newEventTimeSlots.filter((_, i) => i !== index));
  };

  const updateExistingTimeSlot = (courseId, eventId, index, field, value) => {
    const currentEvents = priceData[courseId]?.specialEvents || [];
    const updatedEvents = currentEvents.map((ev) => {
      if (ev.id === eventId) {
        const newSlots = [...(ev.timeSlots || [])];
        newSlots[index] = { ...newSlots[index], [field]: value };
        return { ...ev, timeSlots: newSlots };
      }
      return ev;
    });
    handlePriceChange(courseId, "specialEvents", updatedEvents);
  };

  const addExistingTimeSlot = (courseId, eventId) => {
    const currentEvents = priceData[courseId]?.specialEvents || [];
    const updatedEvents = currentEvents.map((ev) => {
      if (ev.id === eventId) {
        return {
          ...ev,
          timeSlots: [
            ...(ev.timeSlots || []),
            { startTime: "", endTime: "", capacity: "" },
          ],
        };
      }
      return ev;
    });
    handlePriceChange(courseId, "specialEvents", updatedEvents);
  };

  const removeExistingTimeSlot = (courseId, eventId, index) => {
    const currentEvents = priceData[courseId]?.specialEvents || [];
    const updatedEvents = currentEvents.map((ev) => {
      if (ev.id === eventId) {
        return {
          ...ev,
          timeSlots: (ev.timeSlots || []).filter((_, i) => i !== index),
        };
      }
      return ev;
    });
    handlePriceChange(courseId, "specialEvents", updatedEvents);
  };

  const addSpecialEvent = (courseId) => {
    if (!newEventEn.trim() || !newEventDe.trim()) return alert(labels.errNames);
    const currentEvents = priceData[courseId]?.specialEvents || [];

    const parsedTimeSlots = newEventTimeSlots
      .filter((t) => t.startTime || t.endTime)
      .map((t) => ({
        startTime: t.startTime?.trim() || "",
        endTime: t.endTime?.trim() || "",
        capacity: parseInt(t.capacity?.toString().trim() || "0") || 0,
      }));

    handlePriceChange(courseId, "specialEvents", [
      ...currentEvents,
      {
        id: Date.now().toString(),
        nameEn: newEventEn.trim(),
        nameDe: newEventDe.trim(),
        capacity: newEventCap || null,
        price: newEventPrice || null,
        isMandatory: newEventMandatory,
        freeWithPack: newEventFreePack,
        requiresIntroId: newEventIntroId || null,
        timeSlots: parsedTimeSlots,
      },
    ]);

    setNewEventEn("");
    setNewEventDe("");
    setNewEventCap("");
    setNewEventPrice("");
    setNewEventMandatory(false);
    setNewEventFreePack(false);
    setNewEventIntroId("");
    setNewEventTimeSlots([{ startTime: "", endTime: "", capacity: "" }]);
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

  const moveSpecialEvent = (courseId, index, direction) => {
    const currentEvents = [...(priceData[courseId]?.specialEvents || [])];
    if (index + direction < 0 || index + direction >= currentEvents.length)
      return;

    const temp = currentEvents[index];
    currentEvents[index] = currentEvents[index + direction];
    currentEvents[index + direction] = temp;

    handlePriceChange(courseId, "specialEvents", currentEvents);
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
        limitOnePerDay: priceData[courseId]?.limitOnePerDay ?? true,
        isPerHour: isPerHour,
        hasCapacity: priceData[courseId]?.hasCapacity ?? false,
        capacity: priceData[courseId]?.capacity || "",
        isVisible: priceData[courseId]?.isVisible ?? true,
        isRequestOnly: priceData[courseId]?.isRequestOnly ?? false,
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
        <Tag size={18} /> {labels.title} {!isFullAdmin && labels.restricted}
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
          <label style={labelStyle}>{labels.selectCourse}</label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setNewEventEn("");
              setNewEventDe("");
              setNewEventCap("");
              setNewEventPrice("");
              setNewEventMandatory(false);
              setNewEventFreePack(false);
              setNewEventIntroId("");
              setNewEventTimeSlots([
                { startTime: "", endTime: "", capacity: "" },
              ]);
            }}
            style={{
              ...inputStyle,
              backgroundColor: "rgba(202, 175, 243, 0.1)",
              cursor: "pointer",
              marginBottom: 0,
            }}
          >
            {availableCourses.length === 0 && (
              <option>{labels.noCourses}</option>
            )}
            {availableCourses.map((c) => (
              <option
                key={c.link.replace(/\//g, "")}
                value={c.link.replace(/\//g, "")}
              >
                {c.text[currentLang || "en"]}
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
            {/* Top Visibility & Pricing Settings */}
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
                  {activeCourse.text[currentLang || "en"]}
                </h4>
                <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                  {labels.path} {activeCourse.link}
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
                  <Eye size={14} /> {!isMobile && labels.visible}
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
                  <EyeOff size={14} /> {!isMobile && labels.hidden}
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
                  <CreditCard size={14} /> {labels.baseType}
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
                    {labels.sessionBased}
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
                    {labels.timeBased}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", gap: "10px" }}>
                <div style={{ flex: 2 }}>
                  <label style={{ ...labelStyle, fontSize: "0.75rem" }}>
                    {(priceData[selectedCourse]?.isPerHour ?? false)
                      ? labels.price
                      : labels.singlePrice}
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
                      {labels.mins}
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

            {/* Packs Toggle */}
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
                {labels.enablePacks}
              </label>

              {(priceData[selectedCourse]?.hasPack ?? false) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <label
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      opacity: 0.8,
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      margin: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        priceData[selectedCourse]?.limitOnePerDay ?? true
                      }
                      onChange={(e) =>
                        handlePriceChange(
                          selectedCourse,
                          "limitOnePerDay",
                          e.target.checked,
                        )
                      }
                    />
                    {labels.limitPacks}
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {(priceData[selectedCourse]?.packs || []).map(
                      (pack, idx) => (
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
                              {labels.size}
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
                              {labels.priceChf}
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
                            onClick={() =>
                              removePackOption(selectedCourse, idx)
                            }
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
                      ),
                    )}
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
                      <Plus size={14} /> {labels.addPack}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Capacity Toggle */}
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
                {labels.limitCap}
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

            {/* Request Mode Toggle */}
            <div
              style={{
                backgroundColor: "rgba(78, 95, 40, 0.05)",
                padding: "12px",
                borderRadius: "12px",
                marginTop: "12px",
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
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={priceData[selectedCourse]?.isRequestOnly ?? false}
                  onChange={(e) =>
                    handlePriceChange(
                      selectedCourse,
                      "isRequestOnly",
                      e.target.checked,
                    )
                  }
                />
                {currentLang === "en"
                  ? "Request Only Mode (No upfront payment)"
                  : "Nur auf Anfrage (Keine Vorauszahlung)"}
              </label>
            </div>

            {/* ADD-ONS SECTION */}
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
                <Star size={14} color="#9960a8" /> {labels.addons}
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Existing Add-ons List */}
                {(priceData[selectedCourse]?.specialEvents || []).map(
                  (ev, evIdx) => (
                    <div
                      key={ev.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "rgba(255,255,255,0.6)",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px dashed rgba(202, 175, 243, 0.5)",
                        gap: "12px",
                      }}
                    >
                      {/* Basic Info Row */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          justifyContent: "space-between",
                          alignItems: isMobile ? "stretch" : "center",
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
                          placeholder={labels.nameEn}
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
                          placeholder={labels.nameDe}
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
                            placeholder={labels.cap}
                            style={{
                              ...inputStyle,
                              padding: "8px 8px 8px 30px",
                              marginBottom: 0,
                              fontSize: "0.85rem",
                            }}
                            title="Global Capacity (If no time slots used)"
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
                        <div style={{ position: "relative", flex: 1 }}>
                          <input
                            type="number"
                            value={ev.price || ""}
                            onChange={(e) =>
                              updateSpecialEvent(
                                selectedCourse,
                                ev.id,
                                "price",
                                e.target.value,
                              )
                            }
                            placeholder={labels.addonPrice}
                            style={{
                              ...inputStyle,
                              padding: "8px 8px 8px 30px",
                              marginBottom: 0,
                              fontSize: "0.85rem",
                            }}
                          />
                          <CreditCard
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
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <button
                            onClick={() =>
                              moveSpecialEvent(selectedCourse, evIdx, -1)
                            }
                            disabled={evIdx === 0}
                            style={{
                              background: "none",
                              border: "none",
                              color: evIdx === 0 ? "#ccc" : "#9960a8",
                              cursor: evIdx === 0 ? "default" : "pointer",
                              padding: "4px",
                              display: "flex",
                            }}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() =>
                              moveSpecialEvent(selectedCourse, evIdx, 1)
                            }
                            disabled={
                              evIdx ===
                              (priceData[selectedCourse]?.specialEvents || [])
                                .length -
                                1
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color:
                                evIdx ===
                                (priceData[selectedCourse]?.specialEvents || [])
                                  .length -
                                  1
                                  ? "#ccc"
                                  : "#9960a8",
                              cursor:
                                evIdx ===
                                (priceData[selectedCourse]?.specialEvents || [])
                                  .length -
                                  1
                                  ? "default"
                                  : "pointer",
                              padding: "4px",
                              display: "flex",
                            }}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            onClick={() =>
                              removeSpecialEvent(selectedCourse, ev.id)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ff4d4d",
                              cursor: "pointer",
                              padding: "4px",
                              display: "flex",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Rules & Prerequisites Row */}
                      <div
                        style={{
                          backgroundColor: "rgba(78, 95, 40, 0.05)",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          alignItems: isMobile ? "flex-start" : "center",
                          gap: "16px",
                        }}
                      >
                        <select
                          value={ev.requiresIntroId || ""}
                          onChange={(e) =>
                            updateSpecialEvent(
                              selectedCourse,
                              ev.id,
                              "requiresIntroId",
                              e.target.value,
                            )
                          }
                          style={{
                            ...inputStyle,
                            padding: "8px 10px",
                            marginBottom: 0,
                            fontSize: "0.75rem",
                            flex: 1,
                            backgroundColor: "white",
                          }}
                        >
                          <option value="">
                            -- {labels.requiresIntro} None --
                          </option>
                          {(priceData[selectedCourse]?.specialEvents || []).map(
                            (other) =>
                              other.id !== ev.id && (
                                <option key={other.id} value={other.id}>
                                  {other.nameEn}
                                </option>
                              ),
                          )}
                        </select>
                        <div
                          style={{
                            display: "flex",
                            gap: "16px",
                            flexWrap: "wrap",
                          }}
                        >
                          <label
                            style={{
                              ...labelStyle,
                              fontSize: "0.75rem",
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={ev.isMandatory || false}
                              onChange={(e) =>
                                updateSpecialEvent(
                                  selectedCourse,
                                  ev.id,
                                  "isMandatory",
                                  e.target.checked,
                                )
                              }
                            />
                            {labels.mandatoryFirstTimers}
                          </label>
                          <label
                            style={{
                              ...labelStyle,
                              fontSize: "0.75rem",
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={ev.freeWithPack || false}
                              onChange={(e) =>
                                updateSpecialEvent(
                                  selectedCourse,
                                  ev.id,
                                  "freeWithPack",
                                  e.target.checked,
                                )
                              }
                            />
                            {labels.freeWithPack}
                          </label>
                        </div>
                      </div>

                      {/* Time Slots Area */}
                      <div
                        style={{
                          backgroundColor: "rgba(28, 7, 0, 0.02)",
                          border: "1px solid rgba(28, 7, 0, 0.05)",
                          padding: "10px 14px",
                          borderRadius: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: "8px",
                          }}
                        >
                          <Clock size={14} color="#9960a8" />
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              color: "#9960a8",
                              textTransform: "uppercase",
                            }}
                          >
                            {labels.timeSlots}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {(ev.timeSlots || []).map((slot, sIdx) => (
                            <div
                              key={sIdx}
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="time"
                                value={slot.startTime || ""}
                                onChange={(e) =>
                                  updateExistingTimeSlot(
                                    selectedCourse,
                                    ev.id,
                                    sIdx,
                                    "startTime",
                                    e.target.value,
                                  )
                                }
                                style={{
                                  ...inputStyle,
                                  padding: "6px 10px",
                                  marginBottom: 0,
                                  fontSize: "0.75rem",
                                  flex: 1,
                                  backgroundColor: "white",
                                }}
                                title={labels.startTime}
                              />
                              <span
                                style={{ fontSize: "0.75rem", opacity: 0.5 }}
                              >
                                -
                              </span>
                              <input
                                type="time"
                                value={slot.endTime || ""}
                                onChange={(e) =>
                                  updateExistingTimeSlot(
                                    selectedCourse,
                                    ev.id,
                                    sIdx,
                                    "endTime",
                                    e.target.value,
                                  )
                                }
                                style={{
                                  ...inputStyle,
                                  padding: "6px 10px",
                                  marginBottom: 0,
                                  fontSize: "0.75rem",
                                  flex: 1,
                                  backgroundColor: "white",
                                }}
                                title={labels.endTime}
                              />
                              <div style={{ position: "relative", flex: 1 }}>
                                <input
                                  type="number"
                                  value={slot.capacity || ""}
                                  onChange={(e) =>
                                    updateExistingTimeSlot(
                                      selectedCourse,
                                      ev.id,
                                      sIdx,
                                      "capacity",
                                      e.target.value,
                                    )
                                  }
                                  placeholder={labels.cap}
                                  style={{
                                    ...inputStyle,
                                    padding: "6px 8px 6px 30px",
                                    marginBottom: 0,
                                    fontSize: "0.75rem",
                                    backgroundColor: "white",
                                  }}
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
                                onClick={() =>
                                  removeExistingTimeSlot(
                                    selectedCourse,
                                    ev.id,
                                    sIdx,
                                  )
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ff4d4d",
                                  cursor: "pointer",
                                  padding: "4px",
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              addExistingTimeSlot(selectedCourse, ev.id)
                            }
                            style={{
                              background: "none",
                              border: "1px dashed #caaff3",
                              borderRadius: "6px",
                              padding: "6px",
                              fontSize: "0.7rem",
                              color: "#9960a8",
                              cursor: "pointer",
                              width: "fit-content",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Plus size={12} /> {labels.addSlot}
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {/* ADD NEW ADD-ON FORM */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "8px",
                    padding: "16px",
                    backgroundColor: "rgba(202, 175, 243, 0.15)",
                    borderRadius: "16px",
                    border: "1px dashed #caaff3",
                  }}
                >
                  <h5
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      color: "#9960a8",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={16} /> {labels.addAddon}
                  </h5>

                  {/* New Add-on Basic Info */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      gap: "10px",
                    }}
                  >
                    <input
                      value={newEventEn}
                      onChange={(e) => setNewEventEn(e.target.value)}
                      placeholder={labels.newAddonEn}
                      style={{
                        ...inputStyle,
                        padding: "10px 12px",
                        flex: 2,
                        marginBottom: 0,
                        backgroundColor: "white",
                      }}
                    />
                    <input
                      value={newEventDe}
                      onChange={(e) => setNewEventDe(e.target.value)}
                      placeholder={labels.newAddonDe}
                      style={{
                        ...inputStyle,
                        padding: "10px 12px",
                        flex: 2,
                        marginBottom: 0,
                        backgroundColor: "white",
                      }}
                    />
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type="number"
                        value={newEventCap}
                        onChange={(e) => setNewEventCap(e.target.value)}
                        placeholder={labels.cap}
                        style={{
                          ...inputStyle,
                          padding: "10px 10px 10px 32px",
                          marginBottom: 0,
                          backgroundColor: "white",
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
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type="number"
                        value={newEventPrice}
                        onChange={(e) => setNewEventPrice(e.target.value)}
                        placeholder={labels.addonPrice}
                        style={{
                          ...inputStyle,
                          padding: "10px 10px 10px 32px",
                          marginBottom: 0,
                          backgroundColor: "white",
                        }}
                      />
                      <CreditCard
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

                  {/* New Add-on Rules */}
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                      gap: "16px",
                    }}
                  >
                    <select
                      value={newEventIntroId}
                      onChange={(e) => setNewEventIntroId(e.target.value)}
                      style={{
                        ...inputStyle,
                        padding: "8px 10px",
                        marginBottom: 0,
                        flex: 1,
                        fontSize: "0.8rem",
                        backgroundColor: "white",
                      }}
                    >
                      <option value="">
                        -- {labels.requiresIntro} None --
                      </option>
                      {(priceData[selectedCourse]?.specialEvents || []).map(
                        (other) => (
                          <option key={other.id} value={other.id}>
                            {other.nameEn}
                          </option>
                        ),
                      )}
                    </select>
                    <div
                      style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
                    >
                      <label
                        style={{
                          ...labelStyle,
                          fontSize: "0.8rem",
                          margin: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newEventMandatory}
                          onChange={(e) =>
                            setNewEventMandatory(e.target.checked)
                          }
                        />
                        {labels.mandatoryFirstTimers}
                      </label>
                      <label
                        style={{
                          ...labelStyle,
                          fontSize: "0.8rem",
                          margin: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newEventFreePack}
                          onChange={(e) =>
                            setNewEventFreePack(e.target.checked)
                          }
                        />
                        {labels.freeWithPack}
                      </label>
                    </div>
                  </div>

                  {/* New Add-on Time Slots */}
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                      padding: "10px 14px",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "8px",
                      }}
                    >
                      <Clock size={14} color="#9960a8" />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          color: "#9960a8",
                          textTransform: "uppercase",
                        }}
                      >
                        {labels.timeSlots}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {newEventTimeSlots.map((slot, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              handleNewTimeSlotChange(
                                sIdx,
                                "startTime",
                                e.target.value,
                              )
                            }
                            style={{
                              ...inputStyle,
                              padding: "8px 10px",
                              marginBottom: 0,
                              fontSize: "0.8rem",
                              flex: 1,
                              backgroundColor: "white",
                            }}
                            title={labels.startTime}
                          />
                          <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                            -
                          </span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              handleNewTimeSlotChange(
                                sIdx,
                                "endTime",
                                e.target.value,
                              )
                            }
                            style={{
                              ...inputStyle,
                              padding: "8px 10px",
                              marginBottom: 0,
                              fontSize: "0.8rem",
                              flex: 1,
                              backgroundColor: "white",
                            }}
                            title={labels.endTime}
                          />
                          <div style={{ position: "relative", flex: 1 }}>
                            <input
                              type="number"
                              value={slot.capacity}
                              onChange={(e) =>
                                handleNewTimeSlotChange(
                                  sIdx,
                                  "capacity",
                                  e.target.value,
                                )
                              }
                              placeholder={labels.cap}
                              style={{
                                ...inputStyle,
                                padding: "8px 8px 8px 30px",
                                marginBottom: 0,
                                fontSize: "0.8rem",
                                backgroundColor: "white",
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
                          <button
                            onClick={() => removeNewTimeSlot(sIdx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ff4d4d",
                              cursor: "pointer",
                              padding: "4px",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addNewTimeSlot}
                        style={{
                          background: "none",
                          border: "1px dashed #caaff3",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "0.75rem",
                          color: "#9960a8",
                          cursor: "pointer",
                          width: "fit-content",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Plus size={14} /> {labels.addSlot}
                      </button>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "4px",
                    }}
                  >
                    <button
                      onClick={() => addSpecialEvent(selectedCourse)}
                      style={{
                        ...btnStyle,
                        width: isMobile ? "100%" : "auto",
                        padding: "10px 24px",
                        marginTop: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Plus size={16} /> {labels.addAddon}
                    </button>
                  </div>
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
              {savingPriceId === selectedCourse ? labels.saving : labels.save}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
