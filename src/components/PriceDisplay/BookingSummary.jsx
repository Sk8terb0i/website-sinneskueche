import React, { useState, useEffect } from "react";
import {
  Ticket,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  Check,
  FileText,
  X,
  AlertCircle,
  Star,
  Clock,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import * as S from "./PriceDisplayStyles";

const getCreditKey = (path) => {
  const mapping = {
    "/pottery": "pottery tuesdays",
    "/artistic-vision": "artistic vision",
    "/get-ink": "get ink!",
    "/singing": "vocal coaching",
    "/extended-voice-lab": "extended voice lab",
    "/performing-words": "performing words",
    "/singing-basics": "singing basics weekend",
  };
  return mapping[path] || (path ? path.replace(/\//g, "") : "workshop");
};

const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const timesOverlap = (timeA, timeB) => {
  if (!timeA || !timeB) return false;
  // Assumes format "HH:mm-HH:mm"
  const [startA, endA] = timeA.split("-").map(parseTime);
  const [startB, endB] = timeB.split("-").map(parseTime);
  return startA < endB && startB < endA;
};

export default function BookingSummary({
  selectedDates,
  setSelectedDates,
  eventBookingCounts,
  totalPrice,
  availableCredits,
  profileBalances = {},
  profileHistoryMap = {},
  pricing,
  pricingMap = {},
  scheduleData,
  availableDates = [],
  addonBookingCounts,
  guestInfo,
  setGuestInfo,
  currentUser,
  userData,
  currentLang,
  isMobile,
  onBookCredits,
  onPayment,
  onRequestSubmit,
  coursePath,
  userBookedIds = [],
  userCreditBookedIds = [],
  hasBookedBefore = false,
  getAddonColor,
}) {
  const [bookingStep, setBookingStep] = useState(1);
  const [isAuthExpanded, setIsAuthExpanded] = useState(false);
  const [uncheckWarning, setUncheckWarning] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [showStripeAlternative, setShowStripeAlternative] = useState(false);

  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [activePromo, setActivePromo] = useState(null);
  const [activePackCode, setActivePackCode] = useState(null);
  const [codeStatus, setCodeStatus] = useState({ loading: false, error: "" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedPacks, setSelectedPacks] = useState([]);

  const [courseTerms, setCourseTerms] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [shakeTerms, setShakeTerms] = useState(false);

  const [manuallyExpandedDates, setManuallyExpandedDates] = useState({});
  const [showPackInfo, setShowPackInfo] = useState(false);
  const [expandedPacks, setExpandedPacks] = useState({});
  const [giftPrompt, setGiftPrompt] = useState(null);

  useEffect(() => {
    if (selectedDates.length === 0) {
      setBookingStep(1);
    }
  }, [selectedDates.length]);

  useEffect(() => {
    const currentName = currentUser
      ? `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim()
      : `${guestInfo.firstName} ${guestInfo.lastName}`.trim();

    const currentNameClean = currentName.trim();
    if (currentNameClean) {
      setSelectedDates((prev) =>
        prev.map((date) => {
          const newAtts = [...(date.attendees || [])];
          if (newAtts.length > 0) {
            const firstNameChar = guestInfo.firstName.charAt(0);
            // Sync if name is empty, placeholder, or looks like a partial sync of the guest info
            const shouldSync =
              !newAtts[0].name ||
              newAtts[0].name === "Primary Booker" ||
              currentNameClean.startsWith(newAtts[0].name);

            if (shouldSync) {
              newAtts[0] = { ...newAtts[0], name: currentName };
              return { ...date, attendees: newAtts };
            }
          }
          return date;
        }),
      );
    }
  }, [guestInfo.firstName, guestInfo.lastName, currentUser, userData]);

  useEffect(() => {
    const fetchAllRelevantTerms = async () => {
      // 1. Start with the 'general' terms document
      const uniqueIds = new Set(["general"]);

      // 2. Add IDs from sessions currently in the cart
      selectedDates.forEach((d) => {
        if (d.link) uniqueIds.add(d.link.replace(/\//g, ""));
      });

      // 3. Add IDs from Packs currently selected
      selectedPacks.forEach((p) => {
        uniqueIds.add(p.link.replace(/\//g, ""));
      });

      // 4. Fallback: Only include the base course path if the cart is completely empty
      if (uniqueIds.size === 1 && coursePath) {
        uniqueIds.add(coursePath.replace(/\//g, ""));
      }

      try {
        const termsMap = {};
        await Promise.all(
          [...uniqueIds].map(async (id) => {
            const tSnap = await getDoc(doc(db, "course_terms", id));
            if (tSnap.exists()) {
              termsMap[id] = tSnap.data();
            }
          }),
        );
        setCourseTerms(termsMap);
      } catch (err) {
        console.error("Error fetching all terms:", err);
      }
    };
    fetchAllRelevantTerms();
  }, [coursePath, selectedDates, selectedPacks]);

  // --- CART CLEANER ---
  useEffect(() => {
    if (userData?.completedAddons?.length > 0 && selectedDates.length > 0) {
      setSelectedDates((prev) =>
        prev.map((date) => ({
          ...date,
          attendees: (date.attendees || []).map((att) => ({
            ...att,
            selectedAddons: (att.selectedAddons || []).filter((a) => {
              const addonId = typeof a === "string" ? a : a.id;
              return !userData.completedAddons.includes(addonId);
            }),
          })),
        })),
      );
    }
  }, [userData?.completedAddons, setSelectedDates]);

  const validateAndProceed = (actionFn) => {
    const hasActualTerms =
      courseTerms &&
      Object.values(courseTerms).some((t) => t[currentLang]?.trim());

    if (hasActualTerms && !agreedToTerms) {
      setShakeTerms(true);
      setTimeout(() => setShakeTerms(false), 500);
      return;
    }
    actionFn();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  };

  const getProfileHistory = (pid) => {
    if (!pid || pid === "guest") return [];

    let completed = [];
    if (pid === "main") {
      completed = userData?.completedAddons || [];
    } else {
      const linked = userData?.linkedProfiles?.find((p) => p.id === pid);
      completed = linked?.completedAddons || [];
    }

    const alreadyBooked = profileHistoryMap?.[pid]?.addons || [];

    return [...new Set([...completed, ...alreadyBooked])];
  };

  const toggleAddon = (
    eventId,
    attendeeIndex,
    addon,
    isMandatory,
    selectedTime = null,
  ) => {
    const dateObj = selectedDates.find((d) => d.id === eventId);
    const att = dateObj?.attendees[attendeeIndex];

    const isSelected = att?.selectedAddons?.some((a) =>
      typeof a === "string"
        ? a === addon.id
        : a.id === addon.id && (!selectedTime || a.time === selectedTime),
    );

    if (!isSelected) {
      if (selectedTime) {
        const conflict = att?.selectedAddons?.find((a) => {
          const addonId = typeof a === "string" ? a : a.id;

          const history = getProfileHistory(att.profileId);
          if (history.includes(addonId)) return false;

          const existingTime = typeof a === "object" ? a.time : null;
          return existingTime && timesOverlap(selectedTime, existingTime);
        });
        if (conflict) {
          const evPricing = pricingMap[dateObj.link] || pricing;
          const conflictingAddon = evPricing?.specialEvents?.find(
            (se) =>
              se.id === (typeof conflict === "string" ? conflict : conflict.id),
          );
          setUncheckWarning({
            type: "time_conflict",
            eventId,
            attendeeIndex,
            addonId: addon.id,
            conflictingName:
              currentLang === "en"
                ? conflictingAddon?.nameEn
                : conflictingAddon?.nameDe,
          });
          return;
        }
      }

      if (addon.requiresIntroId) {
        if (!currentUser) {
          setUncheckWarning({
            type: "login_required",
            eventId,
            attendeeIndex,
            addonId: addon.id,
          });
          return;
        }
        const history = getProfileHistory(att.profileId);
        const hasCompleted = history.includes(addon.requiresIntroId);
        const inCart = att?.selectedAddons?.some(
          (a) => (typeof a === "string" ? a : a.id) === addon.requiresIntroId,
        );

        if (!hasCompleted && !inCart) {
          setUncheckWarning({
            type: "missing_prerequisite",
            eventId,
            attendeeIndex,
            addonId: addon.id,
            requiredIntroId: addon.requiresIntroId,
          });
          return;
        }
      }

      const evPricing = pricingMap[dateObj.link] || pricing;
      const isPrerequisiteForAnother = evPricing?.specialEvents?.some(
        (se) => se.requiresIntroId === addon.id,
      );
      if (isPrerequisiteForAnother && !currentUser) {
        setUncheckWarning({
          type: "login_required_prerequisite",
          eventId,
          attendeeIndex,
          addonId: addon.id,
        });
        return;
      }
    } else {
      const history = getProfileHistory(att.profileId);
      const isFirstTimerForAddon = !history.includes(addon.id);

      if (isMandatory && isFirstTimerForAddon) {
        setUncheckWarning({
          type: "mandatory",
          eventId,
          attendeeIndex,
          addonId: addon.id,
          selectedTime,
        });
        return;
      }
    }

    executeToggleAddon(eventId, attendeeIndex, addon.id, selectedTime);
  };

  const executeToggleAddon = (
    eventId,
    attendeeIndex,
    addonId,
    selectedTime = null,
  ) => {
    setSelectedDates((prev) =>
      prev.map((date) => {
        if (date.id === eventId) {
          const updatedAttendees = [...(date.attendees || [])];
          const att = updatedAttendees[attendeeIndex];
          const current = att.selectedAddons || [];
          const isAlreadySelected = current.some((a) =>
            typeof a === "string"
              ? a === addonId
              : a.id === addonId && a.time === selectedTime,
          );

          const updated = isAlreadySelected
            ? current.filter(
                (a) =>
                  !(typeof a === "string"
                    ? a === addonId
                    : a.id === addonId && a.time === selectedTime),
              )
            : [
                ...current,
                selectedTime ? { id: addonId, time: selectedTime } : addonId,
              ];

          updatedAttendees[attendeeIndex] = { ...att, selectedAddons: updated };
          return { ...date, attendees: updatedAttendees };
        }
        return date;
      }),
    );
  };

  const hasSelection = selectedDates.length > 0;

  const getAvailableProfiles = () => {
    const profiles = [];
    if (currentUser) {
      profiles.push({
        id: "main",
        name: userData?.firstName || (currentLang === "en" ? "Me" : "Ich"),
      });
      if (userData?.linkedProfiles) {
        userData.linkedProfiles.forEach((p) =>
          profiles.push({ id: p.id, name: p.firstName }),
        );
      }
    } else {
      profiles.push({
        id: "guest",
        name: currentLang === "en" ? "Guest" : "Gast",
      });
    }
    profiles.push({
      id: "gift",
      name: currentLang === "en" ? "Buy as a Gift" : "Als Geschenk kaufen",
      isGift: true,
    });
    return profiles;
  };
  const availableProfiles = getAvailableProfiles();

  // --- CREDIT & PAYMENT LOGIC ---
  const limitOnePerDay = pricing?.limitOnePerDay ?? true;
  let eligibleForCredit = 0;
  let ineligibleForCredit = 0;
  let totalUsableUserCredits = 0;

  const profileUsage = {};

  selectedDates.forEach((d) => {
    const courseKey = getCreditKey(d.link || coursePath);

    (d.attendees || []).forEach((att) => {
      const pid = att.profileId;
      if (!pid) {
        ineligibleForCredit += 1;
      } else {
        if (!profileUsage[pid]) profileUsage[pid] = {};
        if (!profileUsage[pid][courseKey])
          profileUsage[pid][courseKey] = { requested: 0, usedDates: new Set() };

        let alreadyUsedCredit = false;
        if (pid) {
          alreadyUsedCredit = userCreditBookedIds?.includes(`${d.date}_${pid}`);
        }

        if (!alreadyUsedCredit && activePackCode) {
          alreadyUsedCredit = activePackCode.redeemedEventIds?.includes(d.id);
        }

        const hasBalance = (profileBalances[pid]?.[courseKey] || 0) > 0;
        const isBuyingPackForThis = selectedPacks.some(
          (p) => p.link === (d.link || coursePath) && p.profileId === pid,
        );

        const hasUsedBefore =
          profileUsage[pid][courseKey].usedDates.has(d.id) || alreadyUsedCredit;

        if (limitOnePerDay && hasUsedBefore) {
          ineligibleForCredit += 1;
        } else {
          profileUsage[pid][courseKey].usedDates.add(d.id);
          profileUsage[pid][courseKey].requested += 1;
          eligibleForCredit += 1;
        }
      }
    });
  });

  const totalTicketsSelected = eligibleForCredit + ineligibleForCredit;
  const tempUsableCredits = {};

  if (activePackCode) {
    totalUsableUserCredits =
      activePackCode.remaining > 0
        ? Math.min(activePackCode.remaining, eligibleForCredit)
        : 0;
    tempUsableCredits["guest"] = { all: totalUsableUserCredits };
  } else {
    Object.entries(profileUsage).forEach(([pid, courseUsages]) => {
      tempUsableCredits[pid] = {};
      Object.entries(courseUsages).forEach(([courseKey, usage]) => {
        const bal = profileBalances[pid]?.[courseKey] || 0;
        const usableForCourse = Math.min(bal, usage.requested);
        tempUsableCredits[pid][courseKey] = usableForCourse;
        totalUsableUserCredits += usableForCourse;
      });
    });
  }

  const usableCredits = totalUsableUserCredits;
  const remainingEligibleToPay = eligibleForCredit - usableCredits;
  const ticketsToPayCash = remainingEligibleToPay + ineligibleForCredit;

  let totalIndividualCash = 0;
  let remainingPackCodeUses = activePackCode ? totalUsableUserCredits : 0;
  let calcUsedDates = new Set();

  selectedDates.forEach((d) => {
    const courseKey = getCreditKey(d.link || coursePath);

    (d.attendees || []).forEach((att) => {
      const coursePrice = parseFloat(pricingMap[d.link]?.priceSingle || 0);
      const pid = att.profileId;

      let usedCredit = false;

      const alreadyUsedToday =
        userCreditBookedIds?.includes(`${d.date}_${pid}`) ||
        calcUsedDates.has(`${d.date}_${pid}`);
      let activePackAlreadyUsed = false;
      if (!alreadyUsedToday && activePackCode) {
        activePackAlreadyUsed = activePackCode.redeemedEventIds?.includes(d.id);
      }
      const limitApplies =
        limitOnePerDay && (alreadyUsedToday || activePackAlreadyUsed);

      if (!limitApplies) {
        if (activePackCode && remainingPackCodeUses > 0) {
          usedCredit = true;
          remainingPackCodeUses--;
        } else if (pid && tempUsableCredits[pid]?.[courseKey] > 0) {
          usedCredit = true;
          tempUsableCredits[pid][courseKey]--;
        }
      }

      if (usedCredit) {
        calcUsedDates.add(`${d.date}_${pid}`);
      } else {
        totalIndividualCash += coursePrice;
      }
    });
  });

  const basePackOptions = [
    {
      isIndividual: true,
      size: totalTicketsSelected,
      price: totalIndividualCash,
    },
    ...(pricing?.packs?.length > 0
      ? pricing.packs.map((p) => ({
          size: Number(p.size || 0),
          price: Number(p.price || 0),
        }))
      : pricing?.packSize
        ? [{ size: Number(pricing.packSize), price: Number(pricing.priceFull) }]
        : []),
  ];

  const isBuyingPack = selectedPacks.length > 0;
  const isUsingCredits =
    usableCredits > 0 || (activePackCode && activePackCode.remaining > 0);
  const qualifiesForFreeAddon = isBuyingPack || isUsingCredits;

  let addonCashTotal = 0;
  let chargeableAddonCount = 0;
  selectedDates.forEach((d) => {
    const evPricing = pricingMap[d.link] || pricing;
    (d.attendees || []).forEach((att) => {
      if (att.selectedAddons && att.selectedAddons.length > 0) {
        att.selectedAddons.forEach((selAddon) => {
          const addonId = typeof selAddon === "string" ? selAddon : selAddon.id;
          const addonDef = evPricing?.specialEvents?.find(
            (se) => se.id === addonId,
          );

          if (addonDef && addonDef.price) {
            if (addonDef.freeWithPack && qualifiesForFreeAddon) {
              addonCashTotal += 0;
            } else {
              addonCashTotal += parseFloat(addonDef.price);
              chargeableAddonCount++;
            }
          }
        });
      }
    });
  });

  const isMixedPayment =
    usableCredits > 0 && (ticketsToPayCash > 0 || addonCashTotal > 0);
  const coversEntirely =
    totalTicketsSelected > 0 &&
    ticketsToPayCash === 0 &&
    addonCashTotal === 0 &&
    selectedPacks.length === 0;

  let finalTotalPrice = totalIndividualCash + addonCashTotal;

  const packOptions = basePackOptions.map((pack) => {
    if (pack.isIndividual) return { ...pack, price: finalTotalPrice };
    return pack;
  });

  let finalPackPrice = 0;
  let extraItemsBreakdown = [];
  let infoSentence = "";
  const breakdownMap = {};

  // 1. Calculate base cost of all selected packs
  selectedPacks.forEach((sp) => {
    const pData = pricingMap[sp.link];
    const pack = pData?.packs?.[sp.packIdx];
    if (pack) {
      finalPackPrice += parseFloat(pack.price || 0);

      const courseName = pData?.courseName || sp.link.replace(/\//g, "");
      const packTitle =
        currentLang === "en"
          ? `${pack.size} Session Pack: ${courseName}`
          : `${pack.size}er Karte: ${courseName}`;

      if (!breakdownMap[packTitle]) {
        breakdownMap[packTitle] = {
          count: 0,
          price: parseFloat(pack.price || 0),
          isFree: false,
          isPack: true,
          details: [],
        };
      }
      breakdownMap[packTitle].count++;

      // Now we just use the variable directly!
      const personName = sp.isGift
        ? sp.recipientName || (currentLang === "en" ? "Gift" : "Geschenk")
        : availableProfiles.find((p) => p.id === sp.profileId)?.name ||
          sp.profileId;

      breakdownMap[packTitle].details.push({
        person: personName,
      });
    }
  });

  // 2. Track remaining credits for NEW packs being purchased per profile
  const newPackRemaining = {};
  selectedPacks
    .filter((sp) => !sp.isGift)
    .forEach((sp) => {
      const pId = sp.profileId || "guest";
      if (!newPackRemaining[pId]) newPackRemaining[pId] = {};
      const size = parseInt(
        pricingMap[sp.link]?.packs?.[sp.packIdx]?.size || 0,
      );
      newPackRemaining[pId][sp.link] =
        (newPackRemaining[pId][sp.link] || 0) + size;
    });

  const breakdownTempCredits = {};
  let breakdownRemainingPackCodeUses = activePackCode
    ? totalUsableUserCredits
    : 0;

  Object.entries(profileUsage).forEach(([pid, courseUsages]) => {
    breakdownTempCredits[pid] = {};
    Object.entries(courseUsages).forEach(([courseKey, usage]) => {
      breakdownTempCredits[pid][courseKey] = Math.min(
        profileBalances[pid]?.[courseKey] || 0,
        usage.requested,
      );
    });
  });

  let hasExceededPack = false;
  let hasUncoveredMixedCourse = false;
  let breakdownUsedDates = new Set();

  selectedDates.forEach((d) => {
    const courseKey = getCreditKey(d.link || coursePath);
    const coursePrice = parseFloat(pricingMap[d.link]?.priceSingle || 0);

    const pData = pricingMap[d.link || coursePath];
    const dynamicName =
      pData?.[`name${currentLang === "en" ? "En" : "De"}`] || pData?.courseName;
    const title =
      dynamicName ||
      (typeof d.title === "object" ? d.title[currentLang || "en"] : d.title);

    (d.attendees || []).forEach((att) => {
      const pid = att.profileId;
      let usedCredit = false;

      const alreadyUsedToday =
        userCreditBookedIds?.includes(`${d.date}_${pid}`) ||
        breakdownUsedDates.has(`${d.date}_${pid}`);
      let activePackAlreadyUsed = false;
      if (!alreadyUsedToday && activePackCode) {
        activePackAlreadyUsed = activePackCode.redeemedEventIds?.includes(d.id);
      }
      const limitApplies =
        limitOnePerDay && (alreadyUsedToday || activePackAlreadyUsed);

      if (!limitApplies) {
        if (activePackCode && breakdownRemainingPackCodeUses > 0) {
          usedCredit = true;
          breakdownRemainingPackCodeUses--;
        } else if (pid && breakdownTempCredits[pid]?.[courseKey] > 0) {
          usedCredit = true;
          breakdownTempCredits[pid][courseKey]--;
        } else if (newPackRemaining[pid || "guest"]?.[d.link] > 0) {
          usedCredit = true;
          newPackRemaining[pid || "guest"][d.link]--;
        }
      }

      const mapKey = usedCredit ? `${title}_credit` : title;

      if (usedCredit) {
        breakdownUsedDates.add(`${d.date}_${pid}`);

        if (!breakdownMap[mapKey])
          breakdownMap[mapKey] = {
            displayName: title,
            count: 0,
            price: 0,
            isFree: false,
            isCredit: true,
            details: [],
          };
        breakdownMap[mapKey].count++;
        breakdownMap[mapKey].details.push({
          date: d.date,
          time: d.time,
          person: att.name || (currentLang === "en" ? "Guest" : "Gast"),
        });
      } else {
        finalPackPrice += coursePrice;
        const hasPackForLink = selectedPacks.some((p) => p.link === d.link);
        if (hasPackForLink) hasExceededPack = true;
        else hasUncoveredMixedCourse = true;

        if (!breakdownMap[mapKey])
          breakdownMap[mapKey] = {
            displayName: title,
            count: 0,
            price: coursePrice,
            isFree: false,
            details: [],
          };
        breakdownMap[mapKey].count++;
        breakdownMap[mapKey].details.push({
          date: d.date,
          time: d.time,
          person: att.name || (currentLang === "en" ? "Guest" : "Gast"),
        });
      }

      const evPricing = pricingMap[d.link] || pricing;
      (att.selectedAddons || []).forEach((selAddon) => {
        const addonId = typeof selAddon === "string" ? selAddon : selAddon.id;
        const addonDef = evPricing?.specialEvents?.find(
          (se) => se.id === addonId,
        );
        if (addonDef && (addonDef.price || addonDef.freeWithPack)) {
          const isFree =
            addonDef.freeWithPack &&
            (usableCredits > 0 || selectedPacks.length > 0);
          const aName =
            currentLang === "en" ? addonDef.nameEn : addonDef.nameDe;
          const aPrice = parseFloat(addonDef.price || 0);

          let selectedTime =
            typeof selAddon === "object" ? selAddon.time : null;

          if (!isFree) {
            finalPackPrice += aPrice;
            if (!breakdownMap[aName])
              breakdownMap[aName] = {
                count: 0,
                price: aPrice,
                isFree: false,
                details: [],
              };
            breakdownMap[aName].count++;
            breakdownMap[aName].details.push({
              date: d.date,
              time: selectedTime,
              person: att.name || (currentLang === "en" ? "Guest" : "Gast"),
            });
          } else {
            if (!breakdownMap[aName])
              breakdownMap[aName] = {
                count: 0,
                price: 0,
                isFree: true,
                details: [],
              };
            breakdownMap[aName].count++;
            breakdownMap[aName].details.push({
              date: d.date,
              time: selectedTime,
              person: att.name || (currentLang === "en" ? "Guest" : "Gast"),
            });
          }
        }
      });
    });
  });

  extraItemsBreakdown = Object.entries(breakdownMap).map(([name, data]) => ({
    name: data.displayName || name,
    ...data,
  }));

  if (currentLang === "en") {
    if (hasUncoveredMixedCourse)
      infoSentence = "Individual sessions added at single price.";
    else if (hasExceededPack)
      infoSentence =
        "Selection exceeds pack size. Extra sessions added at single price.";
  } else {
    if (hasUncoveredMixedCourse)
      infoSentence = "Einzeltermine wurden zum Normalpreis hinzugefügt.";
    else if (hasExceededPack)
      infoSentence =
        "Auswahl überschreitet Paketgrösse. Zusätzliche Termine zum Einzelpreis.";
  }

  const calculateSavings = (pack) => {
    if (pack.isIndividual) return 0;
    const singlePrice = Number(pricing?.priceSingle || 0);
    const normalPrice = singlePrice * pack.size;
    if (normalPrice <= 0 || pack.price >= normalPrice) return 0;
    return Math.round(((normalPrice - pack.price) / normalPrice) * 100);
  };

  const promoApplyTo = activePromo?.applyTo || "both";
  const promoAppliesToPack =
    activePromo && (promoApplyTo === "both" || promoApplyTo === "pack");
  const promoAppliesToSingle =
    activePromo && (promoApplyTo === "both" || promoApplyTo === "single");

  if (activePromo) {
    let preDiscountPrice =
      selectedPacks.length > 0 ? finalPackPrice : finalTotalPrice;

    if (activePromo.discountType === "percent") {
      const multiplier = (100 - activePromo.discountValue) / 100;
      if (promoAppliesToSingle)
        finalTotalPrice = Math.max(0, finalTotalPrice * multiplier);
      if (promoAppliesToPack)
        finalPackPrice = Math.max(0, finalPackPrice * multiplier);
    } else if (activePromo.discountType === "free") {
      if (promoAppliesToSingle) finalTotalPrice = 0;
      if (promoAppliesToPack) finalPackPrice = 0;
    } else if (activePromo.discountType === "amount") {
      const discount = parseFloat(activePromo.discountValue || 0);
      if (promoAppliesToSingle)
        finalTotalPrice = Math.max(0, finalTotalPrice - discount);
      if (promoAppliesToPack)
        finalPackPrice = Math.max(0, finalPackPrice - discount);
    }

    let postDiscountPrice =
      selectedPacks.length > 0 ? finalPackPrice : finalTotalPrice;
    let discountAmount = preDiscountPrice - postDiscountPrice;

    if (discountAmount > 0) {
      extraItemsBreakdown.push({
        name:
          currentLang === "en"
            ? `Promo Code (${activePromo.code})`
            : `Rabattcode (${activePromo.code})`,
        count: 1,
        price: -discountAmount,
        isFree: false,
        isDiscount: true,
        isPack: false,
        details: [],
      });
    }
  }

  const formatPrice = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0";
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  const handleInlineAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await setDoc(doc(db, "users", userCred.user.uid), {
          firstName,
          lastName,
          email,
          phone,
          role: "user",
          createdAt: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleApplyCode = async () => {
    if (!codeInput.trim()) return;
    setCodeStatus({ loading: true, error: "" });
    setActivePromo(null);
    setActivePackCode(null);

    const upperCode = codeInput.trim().toUpperCase();

    try {
      const promoQ = query(
        collection(db, "promo_codes"),
        where("code", "==", upperCode),
      );
      const promoSnap = await getDocs(promoQ);

      if (!promoSnap.empty) {
        const promoData = promoSnap.docs[0].data();
        const activePath = (
          coursePath ||
          window.location.pathname ||
          ""
        ).replace(/\//g, "");

        if (
          promoData.limitType === "uses" &&
          promoData.timesUsed >= promoData.maxUses
        ) {
          setCodeStatus({
            loading: false,
            error:
              currentLang === "en"
                ? "This code has reached its usage limit."
                : "Dieser Code hat sein Nutzungslimit erreicht.",
          });
          return;
        }

        if (
          promoData.coursePath &&
          promoData.coursePath !== "all" &&
          !activePath.includes(promoData.coursePath.replace(/\//g, ""))
        ) {
          setCodeStatus({
            loading: false,
            error:
              currentLang === "en"
                ? "Code not valid for this course."
                : "Code gilt nicht für diesen Kurs.",
          });
          return;
        }
        setActivePromo(promoData);
        setCodeStatus({ loading: false, error: "" });
        return;
      }

      const packDocRef = doc(db, "pack_codes", upperCode);
      const packSnap = await getDoc(packDocRef);

      if (packSnap.exists()) {
        const packData = packSnap.data();
        const createdAt = packData.createdAt?.toDate
          ? packData.createdAt.toDate()
          : packData.createdAt
            ? new Date(packData.createdAt)
            : null;

        // Auto-delete and reject if the code is older than 1 year
        if (createdAt && new Date() - createdAt > 365 * 24 * 60 * 60 * 1000) {
          await deleteDoc(packDocRef);
          setCodeStatus({
            loading: false,
            error:
              currentLang === "en"
                ? "This session pack code has expired (valid for 1 year)."
                : "Dieser Code ist abgelaufen (1 Jahr Gültigkeit).",
          });
          return;
        }

        if (packData.remainingCredits > 0) {
          setActivePackCode({
            code: upperCode,
            remaining: packData.remainingCredits,
            redeemedEventIds: packData.redeemedEventIds || [],
          });
          setCodeStatus({ loading: false, error: "" });
          return;
        } else {
          setCodeStatus({
            loading: false,
            error:
              currentLang === "en"
                ? "This pack code has 0 credits left."
                : "Dieses Session-Pack hat kein Guthaben mehr.",
          });
          return;
        }
      }

      setCodeStatus({
        loading: false,
        error: currentLang === "en" ? "Invalid code." : "Ungültiger Code.",
      });
    } catch (err) {
      console.error(err);
      if (err.code === "permission-denied") {
        setActivePackCode({ code: upperCode, remaining: "?" });
        setCodeStatus({ loading: false, error: "" });
      } else {
        setCodeStatus({
          loading: false,
          error:
            currentLang === "en"
              ? "Error verifying code."
              : "Fehler bei der Code-Prüfung.",
        });
      }
    }
  };

  const renderTermsAgreement = () => {
    if (!courseTerms || Object.keys(courseTerms).length === 0) return null;

    const hasAnyContent = Object.values(courseTerms).some((t) =>
      t[currentLang]?.trim(),
    );
    if (!hasAnyContent) return null;

    return (
      <div
        className={shakeTerms ? "shake-animation" : ""}
        style={{
          marginTop: "1.2rem",
          padding: "12px",
          backgroundColor: shakeTerms
            ? "rgba(255, 77, 77, 0.1)"
            : "rgba(153, 96, 168, 0.05)",
          borderRadius: "12px",
          border: shakeTerms ? "2px solid #ff4d4d" : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
          }}
          onClick={() => setAgreedToTerms(!agreedToTerms)}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              border: `2px solid ${agreedToTerms ? "#9960a8" : shakeTerms ? "#ff4d4d" : "#caaff3"}`,
              backgroundColor: agreedToTerms
                ? "#9960a8"
                : "rgba(255, 252, 227, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              flexShrink: 0,
            }}
          >
            {agreedToTerms && (
              <Check size={16} color="#fffce3" strokeWidth={4} />
            )}
          </div>

          <span
            style={{
              fontSize: isMobile ? "0.75rem" : "0.85rem",
              fontWeight: isMobile ? "400" : "600",
              color: "#1c0700",
              userSelect: "none",
            }}
          >
            {currentLang === "de" ? "Ich akzeptiere die " : "I accept the "}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowTermsPopup(true);
              }}
              style={{
                color: "#9960a8",
                textDecoration: "underline",
                cursor: "help",
              }}
            >
              {currentLang === "de" ? "AGB" : "terms & conditions"}
            </span>
          </span>
        </div>

        {shakeTerms && (
          <p
            style={{
              margin: "8px 0 0 32px",
              fontSize: "0.7rem",
              color: "#ff4d4d",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <AlertCircle size={12} />{" "}
            {currentLang === "de"
              ? "Bitte stimme den AGB zu."
              : "Please agree to the T&Cs."}
          </p>
        )}

        {showTermsPopup && (
          <div style={S.overlayStyle} onClick={() => setShowTermsPopup(false)}>
            <div
              style={{
                backgroundColor: "#fffce3",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "80vh",
                borderRadius: "24px",
                padding: "2rem",
                position: "relative",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTermsPopup(false)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.5,
                }}
              >
                <X size={24} />
              </button>
              <h2
                style={{
                  fontFamily: "Harmond-SemiBoldCondensed",
                  fontSize: "1.8rem",
                  marginBottom: "1.5rem",
                  marginTop: 0,
                }}
              >
                {currentLang === "de"
                  ? "Teilnahmebedingungen"
                  : "Terms & Conditions"}
              </h2>
              <div
                className="custom-scrollbar"
                style={{
                  overflowY: "auto",
                  fontSize: "0.9rem",
                  lineHeight: "1.6",
                  color: "#1c0700",
                }}
              >
                {Object.entries(courseTerms).map(([id, content]) => {
                  const text = content[currentLang];
                  if (!text) return null;

                  let sectionTitle = "";
                  if (id === "general") {
                    sectionTitle =
                      currentLang === "de"
                        ? "Allgemeine Bedingungen"
                        : "General Terms";
                  } else {
                    const pData = Object.values(pricingMap).find(
                      (p) =>
                        (p.coursePath || p.link)?.replace(/\//g, "") === id,
                    );
                    sectionTitle = pData?.courseName || id.toUpperCase();
                  }

                  return (
                    <div key={id} style={{ marginBottom: "2rem" }}>
                      <h3
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          color: "#9960a8",
                          borderBottom: "1px solid rgba(153, 96, 168, 0.2)",
                          paddingBottom: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        {sectionTitle}
                      </h3>
                      <div style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>
                        {text}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowTermsPopup(false)}
                style={{
                  ...S.primaryBtnStyle(isMobile),
                  marginTop: "2rem",
                  width: "100%",
                }}
              >
                {currentLang === "de" ? "Schliessen" : "Close"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSelectionSummary = () => (
    <div
      style={{
        marginBottom: "1.5rem",
        borderBottom: "1px solid rgba(28, 7, 0, 0.1)",
        paddingBottom: "1rem",
      }}
    >
      <h4
        style={{
          fontSize: "0.85rem",
          letterSpacing: "1px",
          opacity: 0.6,
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          justifyContent: isMobile ? "center" : "left",
        }}
      >
        <Calendar size={14} />{" "}
        {currentLang === "en" ? "Your Selection" : "Deine Auswahl"}
      </h4>

      {!hasSelection && selectedPacks.length === 0 ? (
        <div
          style={{
            padding: "0.85rem",
            border: "1px dashed rgba(28, 7, 0, 0.2)",
            borderRadius: "12px",
            textAlign: "center",
            backgroundColor: "rgba(255, 252, 227, 0.4)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              fontWeight: "400",
              color: "#1c0700",
              opacity: 0.7,
            }}
          >
            {currentLang === "en"
              ? "Select a date from the calendar and/or choose a session pack below."
              : "Termin im Kalender wählen und/oder ein Kurspaket unten hinzufügen."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            maxHeight: "350px",
            overflowY: "auto",
            paddingRight: "5px",
          }}
          className="custom-scrollbar"
        >
          {selectedDates.map((d) => {
            const booked = eventBookingCounts[d.id] || 0;
            const cap = parseInt(pricing?.capacity || 99);
            const canAddMore = !pricing?.hasCapacity || booked + d.count < cap;

            const limitOnePerDay = pricing?.limitOnePerDay ?? true;
            const courseKey = getCreditKey(d.link || coursePath);

            let creditWarningType = null;

            d.attendees.forEach((att, attIdx) => {
              if (creditWarningType) return; // Keep the first warning found

              const pid = att.profileId || "guest";

              const hasUsedTodayInHistory = userCreditBookedIds?.includes(
                `${d.date}_${pid}`,
              );

              const hasUsedTodayInCart = selectedDates.some((sd, sdIdx) => {
                if (sd.date !== d.date) return false;
                const currentSdIdx = selectedDates.findIndex(
                  (x) => x.id === d.id,
                );
                if (sdIdx < currentSdIdx) {
                  return sd.attendees.some(
                    (a) => (a.profileId || "guest") === pid,
                  );
                } else if (sdIdx === currentSdIdx) {
                  return (
                    sd.attendees.findIndex(
                      (a) => (a.profileId || "guest") === pid,
                    ) < attIdx
                  );
                }
                return false;
              });

              const hasBalance = (profileBalances[pid]?.[courseKey] || 0) > 0;
              const isBuyingPackForThis = selectedPacks.some(
                (p) =>
                  (p.link || coursePath) === (d.link || coursePath) &&
                  p.profileId === pid,
              );
              const isUsingRedeemCode =
                activePackCode && activePackCode.remaining > 0;

              // Only show the warning if they actually have a pack/credit to use
              if (hasBalance || isBuyingPackForThis || isUsingRedeemCode) {
                if (hasUsedTodayInHistory) {
                  creditWarningType = "history";
                } else if (hasUsedTodayInCart) {
                  creditWarningType = "cart";
                }
              }
            });

            // Also check if an active redeem code was explicitly used for this date previously
            if (
              !creditWarningType &&
              activePackCode?.redeemedEventIds?.includes(d.id)
            ) {
              creditWarningType = "packCode";
            }

            return (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#fdf8e1",
                  padding: "12px",
                  borderRadius: "16px",
                  border: "1px solid rgba(28, 7, 0, 0.05)",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: "900",
                        color: "#9960a8",
                        textTransform: "uppercase",
                        marginBottom: "2px",
                      }}
                    >
                      {pricingMap[d.link]?.[
                        `name${currentLang === "en" ? "En" : "De"}`
                      ] ||
                        (typeof d.title === "object"
                          ? d.title[currentLang || "en"]
                          : d.title)}
                      {" | "}
                      {pricingMap[d.link]?.priceSingle || 0} CHF
                    </span>
                    <span style={{ fontWeight: "800", fontSize: "0.9rem" }}>
                      {formatDate(d.date)}
                    </span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                      {d.time || ""}
                    </span>
                    {limitOnePerDay && creditWarningType && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "#e74c3c",
                          fontWeight: "800",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <AlertCircle size={10} />
                        {creditWarningType === "cart"
                          ? currentLang === "en"
                            ? "Credit applied to another ticket on this date"
                            : "Kredit wird für ein anderes Ticket an diesem Tag genutzt"
                          : currentLang === "en"
                            ? "Credit already used for this date"
                            : "Kredit für diesen Tag bereits genutzt"}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: "rgba(202, 175, 243, 0.1)",
                        borderRadius: "8px",
                        padding: "4px",
                      }}
                    >
                      <button
                        onClick={() =>
                          setSelectedDates((prev) =>
                            prev.map((item) =>
                              item.id === d.id
                                ? {
                                    ...item,
                                    count: Math.max(1, item.count - 1),
                                    attendees: item.attendees.slice(0, -1),
                                  }
                                : item,
                            ),
                          )
                        }
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontWeight: "900",
                          color: "#9960a8",
                          padding: "0 6px",
                        }}
                      >
                        {" "}
                        -{" "}
                      </button>
                      <span
                        style={{
                          fontWeight: "900",
                          fontSize: "0.9rem",
                          minWidth: "15px",
                          textAlign: "center",
                        }}
                      >
                        {d.count}
                      </span>
                      <button
                        onClick={() => {
                          if (!canAddMore) return;

                          let nextPid = "guest";
                          let nextName = "";

                          if (currentUser && userData) {
                            const usedPids = d.attendees.map(
                              (a) => a.profileId || "guest",
                            );
                            if (!usedPids.includes("main")) {
                              nextPid = "main";
                              nextName =
                                `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
                            } else if (userData.linkedProfiles) {
                              const availLinked = userData.linkedProfiles.find(
                                (p) => !usedPids.includes(p.id),
                              );
                              if (availLinked) {
                                nextPid = availLinked.id;
                                nextName =
                                  `${availLinked.firstName || ""} ${availLinked.lastName || ""}`.trim();
                              }
                            }
                          }

                          const evPricing = pricingMap[d.link] || pricing;
                          const courseSchedule =
                            scheduleData?.[d.link || coursePath];
                          const rawAddons =
                            courseSchedule?.specialAssignments?.[d.id];
                          const activeAddons = Array.isArray(rawAddons)
                            ? rawAddons
                            : rawAddons
                              ? [rawAddons]
                              : [];
                          const history = getProfileHistory(
                            nextPid === "guest" ? null : nextPid,
                          );

                          const autoAddons = [];
                          activeAddons.forEach((aid) => {
                            const def = evPricing?.specialEvents?.find(
                              (se) => se.id === aid,
                            );
                            if (def?.isMandatory && !history.includes(aid)) {
                              if (def.timeSlots?.length > 0) {
                                autoAddons.push({
                                  id: aid,
                                  time: `${def.timeSlots[0].startTime}-${def.timeSlots[0].endTime}`,
                                });
                              } else {
                                autoAddons.push(aid);
                              }
                            }
                          });

                          setSelectedDates((prev) =>
                            prev.map((item) =>
                              item.id === d.id
                                ? {
                                    ...item,
                                    count: item.count + 1,
                                    attendees: [
                                      ...item.attendees,
                                      {
                                        profileId:
                                          nextPid === "guest" ? null : nextPid,
                                        name: nextName,
                                        selectedAddons: autoAddons,
                                      },
                                    ],
                                  }
                                : item,
                            ),
                          );
                        }}
                        disabled={!canAddMore}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontWeight: "900",
                          color: "#9960a8",
                          padding: "0 6px",
                          opacity: canAddMore ? 1 : 0.3,
                        }}
                      >
                        {" "}
                        +{" "}
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedDates((prev) =>
                          prev.filter((item) => item.id !== d.id),
                        )
                      }
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "#1c0700",
                        opacity: 0.4,
                      }}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    marginTop: "10px",
                    marginBottom: "15px",
                  }}
                >
                  {d.attendees.map((att, nameIdx) => {
                    const isMultiple = d.attendees.length > 1;
                    const courseSchedule = scheduleData?.[d.link || coursePath];
                    const rawAddons =
                      courseSchedule?.specialAssignments?.[d.id];

                    const assignedAddonIds = Array.isArray(rawAddons)
                      ? rawAddons
                      : rawAddons
                        ? [rawAddons]
                        : [];
                    const attHistory = getProfileHistory(att.profileId);

                    const evPricing = pricingMap[d.link] || pricing;
                    const visibleAddons = (
                      evPricing?.specialEvents || []
                    ).filter((se) => {
                      const isAssigned = assignedAddonIds.includes(se.id);
                      const isAlreadyDone = attHistory.includes(se.id);
                      const isPrerequisite = evPricing?.specialEvents?.some(
                        (other) => other.requiresIntroId === se.id,
                      );
                      const hideBecauseDone =
                        isAlreadyDone && (se.isMandatory || isPrerequisite);
                      return isAssigned && !hideBecauseDone;
                    });

                    const isAddonsExpanded =
                      selectedDates.length === 1 && d.attendees.length === 1
                        ? manuallyExpandedDates[`${d.id}_${nameIdx}`] !== false
                        : manuallyExpandedDates[`${d.id}_${nameIdx}`] === true;

                    return (
                      <div
                        key={nameIdx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          paddingBottom:
                            nameIdx < d.attendees.length - 1 ? "16px" : "0",
                          borderBottom:
                            nameIdx < d.attendees.length - 1
                              ? "1px dashed rgba(28, 7, 0, 0.1)"
                              : "none",
                        }}
                      >
                        {isMultiple && (
                          <label
                            style={{
                              fontSize: "0.65rem",
                              opacity: 0.5,
                              fontWeight: "900",
                              textTransform: "uppercase",
                            }}
                          >
                            {currentLang === "en"
                              ? `Attendee ${nameIdx + 1}`
                              : `Teilnehmer ${nameIdx + 1}`}
                          </label>
                        )}

                        {currentUser &&
                          userData?.linkedProfiles?.length > 0 && (
                            <select
                              value={att.profileId || "guest"}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedAttendees = [...d.attendees];
                                let targetName = "";
                                let targetProfileId = val;

                                if (val === "guest") {
                                  targetName = "";
                                  targetProfileId = null;
                                } else if (val === "main") {
                                  targetName = `${userData.firstName} ${userData.lastName}`;
                                  targetProfileId = "main";
                                } else {
                                  const linked = userData.linkedProfiles.find(
                                    (p) => p.id === val,
                                  );
                                  targetName = `${linked.firstName} ${linked.lastName}`;
                                }

                                const history =
                                  getProfileHistory(targetProfileId);
                                const rawAddons =
                                  scheduleData?.specialAssignments?.[d.id];
                                const assignedAddonIds = Array.isArray(
                                  rawAddons,
                                )
                                  ? rawAddons
                                  : rawAddons
                                    ? [rawAddons]
                                    : [];

                                const evPricing = pricingMap[d.link] || pricing;
                                const mandatoryForThisPerson = [];
                                assignedAddonIds.forEach((aid) => {
                                  const def = evPricing?.specialEvents?.find(
                                    (se) => se.id === aid,
                                  );
                                  if (
                                    def?.isMandatory &&
                                    !history.includes(aid)
                                  ) {
                                    if (def.timeSlots?.length > 0) {
                                      mandatoryForThisPerson.push({
                                        id: aid,
                                        time: `${def.timeSlots[0].startTime}-${def.timeSlots[0].endTime}`,
                                      });
                                    } else {
                                      mandatoryForThisPerson.push(aid);
                                    }
                                  }
                                });

                                const currentManualAddons = (
                                  att.selectedAddons || []
                                ).filter((a) => {
                                  const aid = typeof a === "string" ? a : a.id;
                                  const isMandatoryNow =
                                    mandatoryForThisPerson.some(
                                      (m) =>
                                        (typeof m === "string" ? m : m.id) ===
                                        aid,
                                    );
                                  return (
                                    !isMandatoryNow && !history.includes(aid)
                                  );
                                });

                                updatedAttendees[nameIdx] = {
                                  ...att,
                                  profileId: targetProfileId,
                                  name: targetName,
                                  selectedAddons: [
                                    ...mandatoryForThisPerson,
                                    ...currentManualAddons,
                                  ],
                                };

                                setSelectedDates((prev) =>
                                  prev.map((item) =>
                                    item.id === d.id
                                      ? { ...item, attendees: updatedAttendees }
                                      : item,
                                  ),
                                );
                              }}
                              style={{
                                ...S.guestInputStyle,
                                padding: "8px 12px",
                                fontSize: "0.85rem",
                                backgroundColor: "rgba(255, 252, 227, 0.6)",
                              }}
                            >
                              <option value="main">
                                {userData.firstName ||
                                  (currentLang === "en" ? "Me" : "Ich")}
                              </option>
                              {userData.linkedProfiles.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.firstName} {p.lastName}
                                </option>
                              ))}
                              <option value="guest">
                                {currentLang === "en"
                                  ? "Guest (Other)"
                                  : "Gast (Andere)"}
                              </option>
                            </select>
                          )}

                        {(!att.profileId || att.profileId === "guest") && (
                          <input
                            type="text"
                            placeholder={
                              nameIdx === 0
                                ? currentLang === "en"
                                  ? "Your Name"
                                  : "Dein Name"
                                : currentLang === "en"
                                  ? "Guest Name"
                                  : "Name des Gastes"
                            }
                            value={att.name || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedAttendees = [...d.attendees];
                              updatedAttendees[nameIdx] = {
                                ...att,
                                name: val,
                              };
                              setSelectedDates((prev) =>
                                prev.map((item) =>
                                  item.id === d.id
                                    ? { ...item, attendees: updatedAttendees }
                                    : item,
                                ),
                              );
                            }}
                            style={{
                              ...S.guestInputStyle,
                              padding: "8px 12px",
                              fontSize: "0.85rem",
                              backgroundColor: "rgba(255, 252, 227, 0.6)",
                              marginTop: "4px",
                            }}
                          />
                        )}

                        {visibleAddons.length > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            <div
                              onClick={() =>
                                setManuallyExpandedDates((prev) => ({
                                  ...prev,
                                  [`${d.id}_${nameIdx}`]: !isAddonsExpanded,
                                }))
                              }
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                paddingBottom: isAddonsExpanded ? "8px" : "0",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: "900",
                                  textTransform: "uppercase",
                                  opacity: 0.5,
                                  margin: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <Star
                                  size={10}
                                  fill="#9960a8"
                                  color="#9960a8"
                                />
                                {currentLang === "en"
                                  ? "Available Add-ons"
                                  : "Verfügbare Extras"}
                              </p>
                              {isAddonsExpanded ? (
                                <ChevronDown size={14} color="#9960a8" />
                              ) : (
                                <ChevronUp size={14} color="#9960a8" />
                              )}
                            </div>

                            {isAddonsExpanded && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "6px",
                                }}
                              >
                                {visibleAddons.map((addon) => {
                                  const addonColor = getAddonColor(
                                    addon.id,
                                    d.link,
                                  );
                                  const priceLabel = addon.price
                                    ? ` (+${addon.price} CHF)`
                                    : "";
                                  const displayAddonName =
                                    (currentLang === "en"
                                      ? addon.nameEn
                                      : addon.nameDe) + priceLabel;

                                  if (
                                    addon.timeSlots &&
                                    addon.timeSlots.length > 0
                                  ) {
                                    return (
                                      <div
                                        key={addon.id}
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "8px",
                                          padding: "10px 12px",
                                          borderRadius: "12px",
                                          backgroundColor: "rgba(28,7,0,0.02)",
                                          border: "1px dashed rgba(28,7,0,0.1)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "800",
                                            color: "#1c0700",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "2px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "6px",
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: "8px",
                                                height: "8px",
                                                borderRadius: "50%",
                                                backgroundColor: addonColor,
                                              }}
                                            />
                                            {displayAddonName}
                                          </div>
                                          {addon.freeWithPack &&
                                            !qualifiesForFreeAddon && (
                                              <span
                                                style={{
                                                  fontSize: "0.65rem",
                                                  color: "#9960a8",
                                                  fontWeight: "600",
                                                  paddingLeft: "14px",
                                                }}
                                              >
                                                {currentLang === "en"
                                                  ? "Tip: Free with any session pack"
                                                  : "Tipp: Gratis mit jedem Kurspaket"}
                                              </span>
                                            )}
                                        </div>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "6px",
                                            paddingLeft: "14px",
                                          }}
                                        >
                                          {addon.timeSlots.map((ts) => {
                                            const timeString = `${ts.startTime}-${ts.endTime}`;
                                            const isSelected =
                                              att.selectedAddons?.some(
                                                (a) =>
                                                  typeof a === "object" &&
                                                  a.id === addon.id &&
                                                  a.time === timeString,
                                              );
                                            const bookedKey = `${d.id}_${addon.id}_${timeString}`;
                                            const booked =
                                              addonBookingCounts[bookedKey] ||
                                              0;
                                            const isFull =
                                              booked >=
                                              parseInt(ts.capacity || 999);

                                            return (
                                              <div
                                                key={timeString}
                                                onClick={() =>
                                                  !isFull &&
                                                  toggleAddon(
                                                    d.id,
                                                    nameIdx,
                                                    addon,
                                                    addon.isMandatory,
                                                    timeString,
                                                  )
                                                }
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "10px",
                                                  padding: "8px 10px",
                                                  borderRadius: "8px",
                                                  cursor: isFull
                                                    ? "not-allowed"
                                                    : "pointer",
                                                  backgroundColor: isSelected
                                                    ? "rgba(78, 95, 40, 0.1)"
                                                    : "rgba(28,7,0,0.03)",
                                                  border:
                                                    "1px solid rgba(28,7,0,0.05)",
                                                  transition: "all 0.2s",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    width: "16px",
                                                    height: "16px",
                                                    borderRadius: "4px",
                                                    border: `2px solid ${isSelected ? addonColor : "#caaff3"}`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    backgroundColor: isSelected
                                                      ? addonColor
                                                      : "transparent",
                                                  }}
                                                >
                                                  {isSelected && (
                                                    <Check
                                                      size={12}
                                                      color="#fdf8e1"
                                                      strokeWidth={4}
                                                    />
                                                  )}
                                                </div>
                                                <div
                                                  style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: "0.75rem",
                                                      fontWeight: "600",
                                                      color: isFull
                                                        ? "#ccc"
                                                        : "#1c0700",
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: "6px",
                                                    }}
                                                  >
                                                    <Clock
                                                      size={12}
                                                      opacity={0.6}
                                                    />{" "}
                                                    {ts.startTime} -{" "}
                                                    {ts.endTime}
                                                  </span>
                                                  {isFull && (
                                                    <span
                                                      style={{
                                                        fontSize: "0.6rem",
                                                        color: "#ff4d4d",
                                                        fontWeight: "800",
                                                      }}
                                                    >
                                                      {currentLang === "en"
                                                        ? "FULL"
                                                        : "AUSGEBUCHT"}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    const isSelected = att.selectedAddons?.some(
                                      (a) =>
                                        typeof a === "string"
                                          ? a === addon.id
                                          : a.id === addon.id,
                                    );
                                    const bookedKey = `${d.id}_${addon.id}`;
                                    const booked =
                                      addonBookingCounts[bookedKey] || 0;
                                    const isFull =
                                      booked >= parseInt(addon.capacity || 999);

                                    return (
                                      <div
                                        key={addon.id}
                                        onClick={() =>
                                          !isFull &&
                                          toggleAddon(
                                            d.id,
                                            nameIdx,
                                            addon,
                                            addon.isMandatory,
                                          )
                                        }
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                          padding: "10px 12px",
                                          borderRadius: "12px",
                                          cursor: isFull
                                            ? "not-allowed"
                                            : "pointer",
                                          backgroundColor: isSelected
                                            ? "rgba(78, 95, 40, 0.1)"
                                            : "rgba(28,7,0,0.03)",
                                          transition: "all 0.2s",
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: "18px",
                                            height: "18px",
                                            borderRadius: "6px",
                                            border: `2px solid ${isSelected ? addonColor : "#caaff3"}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: isSelected
                                              ? addonColor
                                              : "transparent",
                                          }}
                                        >
                                          {isSelected && (
                                            <Check
                                              size={14}
                                              color="#fdf8e1"
                                              strokeWidth={4}
                                            />
                                          )}
                                        </div>
                                        <div
                                          style={{
                                            flex: 1,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: "0.8rem",
                                              fontWeight: "700",
                                              color: isFull
                                                ? "#ccc"
                                                : "#1c0700",
                                              display: "flex",
                                              flexDirection: "column",
                                            }}
                                          >
                                            {displayAddonName}
                                            {addon.freeWithPack &&
                                              !qualifiesForFreeAddon &&
                                              !isFull && (
                                                <span
                                                  style={{
                                                    fontSize: "0.65rem",
                                                    color: "#9960a8",
                                                    fontWeight: "600",
                                                    marginTop: "2px",
                                                  }}
                                                >
                                                  {currentLang === "en"
                                                    ? "Tip: Free with any session pack"
                                                    : "Tipp: Gratis mit jedem Kurspaket"}
                                                </span>
                                              )}
                                          </div>
                                          {isFull && (
                                            <span
                                              style={{
                                                fontSize: "0.6rem",
                                                color: "#ff4d4d",
                                                fontWeight: "800",
                                              }}
                                            >
                                              {currentLang === "en"
                                                ? "FULL"
                                                : "AUSGEBUCHT"}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {selectedPacks.length > 0 && (
            <div
              style={{
                marginTop: hasSelection ? "1rem" : "0",
                borderTop: hasSelection
                  ? "1px dashed rgba(28,7,0,0.1)"
                  : "none",
                paddingTop: hasSelection ? "1rem" : "0",
              }}
            >
              <h5
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "900",
                  color: "#9960a8",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                  opacity: 0.8,
                }}
              >
                {currentLang === "en" ? "Selected Packs" : "Ausgewählte Pakete"}
              </h5>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {selectedPacks.map((sp) => {
                  const pData = pricingMap[sp.link];
                  const packDef = pData?.packs?.[sp.packIdx];
                  const courseName =
                    pData?.courseName || sp.link.replace(/\//g, "");
                  const profName = sp.isGift
                    ? currentLang === "en"
                      ? "Gift"
                      : "Geschenk"
                    : availableProfiles.find((p) => p.id === sp.profileId)
                        ?.name || sp.profileId;

                  return (
                    <div
                      key={sp.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "rgba(202, 175, 243, 0.08)",
                        padding: "12px",
                        borderRadius: "12px",
                        border: "1px solid rgba(202, 175, 243, 0.2)",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: "800",
                            color: "#1c0700",
                          }}
                        >
                          {packDef?.size} Session Pack - {courseName}
                        </span>
                        <button
                          onClick={() =>
                            setSelectedPacks((prev) =>
                              prev.filter((p) => p.id !== sp.id),
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#1c0700",
                            opacity: 0.4,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          opacity: 0.8,
                          fontWeight: "600",
                        }}
                      >
                        <span>
                          {currentLang === "en" ? "For:" : "Für:"} {profName}
                        </span>
                        <span>{packDef?.price} CHF</span>
                      </div>
                      {sp.isGift && (
                        <input
                          placeholder={
                            currentLang === "en"
                              ? "Recipient Name"
                              : "Name des Beschenkten"
                          }
                          value={sp.recipientName || ""}
                          onChange={(e) =>
                            setSelectedPacks((prev) =>
                              prev.map((p) =>
                                p.id === sp.id
                                  ? { ...p, recipientName: e.target.value }
                                  : p,
                              ),
                            )
                          }
                          style={{
                            ...S.guestInputStyle,
                            padding: "8px 12px",
                            fontSize: "0.8rem",
                            marginTop: "4px",
                            backgroundColor: "rgba(255, 252, 227, 0.6)",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPackOption = () => {
    const sessionsNeeded = {};
    const localUsedDates = new Set();

    selectedDates.forEach((d) => {
      (d.attendees || []).forEach((att) => {
        const pid = att.profileId || "guest";
        const link = d.link || coursePath;

        const limitOnePerDay = pricing?.limitOnePerDay ?? true;
        const alreadyUsedToday =
          userCreditBookedIds?.includes(`${d.date}_${pid}`) ||
          localUsedDates.has(`${d.date}_${pid}`);

        let activePackAlreadyUsed = false;
        if (!alreadyUsedToday && activePackCode) {
          activePackAlreadyUsed = activePackCode.redeemedEventIds?.includes(
            d.id,
          );
        }

        const limitApplies =
          limitOnePerDay && (alreadyUsedToday || activePackAlreadyUsed);

        if (!limitApplies) {
          if (!sessionsNeeded[pid]) sessionsNeeded[pid] = {};
          sessionsNeeded[pid][link] = (sessionsNeeded[pid][link] || 0) + 1;
          localUsedDates.add(`${d.date}_${pid}`);
        }
      });
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "900",
              letterSpacing: "1px",
              opacity: 0.6,
              textTransform: "uppercase",
            }}
          >
            {currentLang === "en"
              ? "Purchase Session Packs"
              : "Kurspakete wählen"}
          </span>
          <button
            onClick={() => setShowPackInfo(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9960a8",
              padding: "0",
            }}
          >
            <Info size={18} />
          </button>
        </div>

        {Object.keys(pricingMap)
          .sort()
          .map((link) => {
            const coursePacks = pricingMap[link]?.packs || [];
            if (coursePacks.length === 0) return null;

            const matchingEvent = availableDates.find((e) => e.link === link);
            const courseName =
              pricingMap[link]?.[`name${currentLang === "en" ? "En" : "De"}`] ||
              (matchingEvent?.title
                ? typeof matchingEvent.title === "object"
                  ? matchingEvent.title[currentLang || "en"]
                  : matchingEvent.title
                : pricingMap[link]?.courseName || link.replace(/\//g, ""));

            const hasPackForCourse = selectedPacks.some((p) => p.link === link);

            const sessionsForThisCourse = selectedDates
              .filter((d) => (d.link || coursePath) === link)
              .reduce((acc, d) => acc + (d.attendees?.length || 1), 0);

            const isSingleSelected =
              !hasPackForCourse && sessionsForThisCourse > 0;

            const singleTextEn =
              sessionsForThisCourse > 0
                ? `${sessionsForThisCourse} Individual Session${sessionsForThisCourse > 1 ? "s" : ""}`
                : "Single Session";

            const singleTextDe =
              sessionsForThisCourse > 0
                ? `${sessionsForThisCourse} Einzeltermin${sessionsForThisCourse > 1 ? "e" : ""}`
                : "Einzeltermin";

            return (
              <div
                key={link}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: "900",
                    color: "#9960a8",
                    textTransform: "uppercase",
                    opacity: 0.8,
                  }}
                >
                  {courseName}
                </div>

                <div
                  onClick={() =>
                    setSelectedPacks((prev) =>
                      prev.filter((p) => p.link !== link),
                    )
                  }
                  style={{
                    backgroundColor: isSingleSelected
                      ? "rgba(202, 175, 243, 0.25)"
                      : "rgba(202, 175, 243, 0.05)",
                    borderRadius: "16px",
                    padding: "1rem",
                    border: isSingleSelected
                      ? "2px solid #9960a8"
                      : "1px solid rgba(202, 175, 243, 0.15)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {isSingleSelected && (
                      <Check size={14} color="#9960a8" strokeWidth={4} />
                    )}
                    <span
                      style={{
                        color: isSingleSelected
                          ? "#1c0700"
                          : "rgba(28,7,0,0.5)",
                      }}
                    >
                      {currentLang === "en" ? singleTextEn : singleTextDe}
                    </span>
                  </div>
                </div>

                {coursePacks.map((pack, pIdx) => {
                  const isPackExpanded = expandedPacks[`${link}_${pIdx}`];
                  const savings = Math.round(
                    ((parseFloat(pricingMap[link].priceSingle) * pack.size -
                      pack.price) /
                      (parseFloat(pricingMap[link].priceSingle) * pack.size)) *
                      100,
                  );

                  return (
                    <div
                      key={pIdx}
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <div
                        onClick={() => {
                          setExpandedPacks((prev) => ({
                            ...prev,
                            [`${link}_${pIdx}`]: !prev[`${link}_${pIdx}`],
                          }));
                        }}
                        style={{
                          backgroundColor: isPackExpanded
                            ? "rgba(202, 175, 243, 0.25)"
                            : "rgba(202, 175, 243, 0.05)",
                          borderRadius: isPackExpanded
                            ? "16px 16px 0 0"
                            : "16px",
                          padding: "1rem",
                          border: isPackExpanded
                            ? "2px solid #9960a8"
                            : "1px solid rgba(202, 175, 243, 0.15)",
                          borderBottom: isPackExpanded ? "none" : undefined,
                          cursor: "pointer",
                          position: "relative",
                          zIndex: 2,
                        }}
                      >
                        {isMobile ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {isPackExpanded ? (
                                <ChevronDown size={16} color="#9960a8" />
                              ) : (
                                <ChevronUp size={16} color="#9960a8" />
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  gap: "4px",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: "800",
                                    fontSize: "0.85rem",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {pack.size}{" "}
                                  {currentLang === "en"
                                    ? "Session Pack"
                                    : "er Karte"}
                                </span>
                                {savings > 0 && (
                                  <span
                                    style={{
                                      fontSize: "0.6rem",
                                      color: "#9960a8",
                                      backgroundColor:
                                        "rgba(153, 96, 168, 0.15)",
                                      padding: "2px 8px",
                                      borderRadius: "100px",
                                      fontWeight: "900",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {currentLang === "en"
                                      ? `SAVE ${savings}%`
                                      : `${savings}% ERSPARNIS`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              style={{
                                fontWeight: "800",
                                color: "#4e5f28",
                                fontSize: "0.95rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {pack.price} CHF
                            </span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  fontWeight: "800",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {isPackExpanded ? (
                                  <ChevronDown size={16} color="#9960a8" />
                                ) : (
                                  <ChevronUp size={16} color="#9960a8" />
                                )}
                                <span>
                                  {pack.size}{" "}
                                  {currentLang === "en"
                                    ? "Session Pack"
                                    : "er Karte"}
                                </span>
                              </div>
                              {savings > 0 && (
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    color: "#9960a8",
                                    backgroundColor: "rgba(153, 96, 168, 0.15)",
                                    padding: "2px 8px",
                                    borderRadius: "100px",
                                    fontWeight: "900",
                                  }}
                                >
                                  {currentLang === "en"
                                    ? `SAVE ${savings}%`
                                    : `${savings}% ERSPARNIS`}
                                </span>
                              )}
                            </div>
                            <span
                              style={{ fontWeight: "700", color: "#4e5f28" }}
                            >
                              {pack.price} CHF
                            </span>
                          </div>
                        )}
                      </div>

                      {isPackExpanded && (
                        <div
                          style={{
                            padding: "1rem",
                            backgroundColor: "rgba(202, 175, 243, 0.08)",
                            border: "2px solid #9960a8",
                            borderTop: "none",
                            borderBottomLeftRadius: "16px",
                            borderBottomRightRadius: "16px",
                            marginTop: "-2px",
                            zIndex: 1,
                          }}
                        >
                          {availableProfiles.length > 1 && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                marginBottom: "12px",
                                fontWeight: "800",
                                opacity: 0.7,
                                textTransform: "uppercase",
                              }}
                            >
                              {currentLang === "en"
                                ? "Add Pack To Profile:"
                                : "Paket hinzufügen für:"}
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                            }}
                          >
                            {availableProfiles.map((prof, profIdx) => {
                              return (
                                <div
                                  key={profIdx}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px", // Space between name row and hint text
                                  }}
                                >
                                  {(() => {
                                    // Move calculation up so both top row and bottom row can see it
                                    const packsForProf = selectedPacks.filter(
                                      (p) =>
                                        p.link === link &&
                                        p.packIdx === pIdx &&
                                        p.profileId === prof.id,
                                    );
                                    const packCount = packsForProf.length;

                                    return (
                                      <>
                                        {/* TOP ROW: Name and Stepper */}
                                        <div
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: "16px",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "0.9rem",
                                              fontWeight: "700",
                                              color: "#1c0700",
                                              cursor: prof.isGift
                                                ? "pointer"
                                                : "default",
                                              userSelect: "none",
                                            }}
                                            onClick={() => {
                                              if (prof.isGift) {
                                                setGiftPrompt({
                                                  link,
                                                  packIdx: pIdx,
                                                  profileId: prof.id,
                                                  isGift: true,
                                                  recipientName: "",
                                                });
                                              }
                                            }}
                                          >
                                            {prof.name}
                                          </span>

                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                              backgroundColor:
                                                "rgba(202, 175, 243, 0.1)",
                                              borderRadius: "8px",
                                              padding: "2px 4px",
                                              flexShrink: 0,
                                            }}
                                          >
                                            <button
                                              disabled={packCount === 0}
                                              onClick={() => {
                                                setSelectedPacks((prev) => {
                                                  const indexToRemove =
                                                    prev.findIndex(
                                                      (p) =>
                                                        p.link === link &&
                                                        p.packIdx === pIdx &&
                                                        p.profileId === prof.id,
                                                    );
                                                  if (indexToRemove !== -1) {
                                                    const newPacks = [...prev];
                                                    newPacks.splice(
                                                      indexToRemove,
                                                      1,
                                                    );
                                                    return newPacks;
                                                  }
                                                  return prev;
                                                });
                                              }}
                                              style={{
                                                border: "none",
                                                background: "none",
                                                cursor:
                                                  packCount === 0
                                                    ? "not-allowed"
                                                    : "pointer",
                                                fontWeight: "900",
                                                color: "#9960a8",
                                                padding: "0 6px",
                                                opacity:
                                                  packCount === 0 ? 0.3 : 1,
                                              }}
                                            >
                                              -
                                            </button>
                                            <span
                                              style={{
                                                fontWeight: "900",
                                                fontSize: "0.85rem",
                                                minWidth: "10px",
                                                textAlign: "center",
                                                color: "#9960a8",
                                              }}
                                            >
                                              {packCount}
                                            </span>
                                            <button
                                              onClick={() => {
                                                if (prof.isGift) {
                                                  setGiftPrompt({
                                                    link,
                                                    packIdx: pIdx,
                                                    profileId: prof.id,
                                                    isGift: true,
                                                    recipientName: "",
                                                  });
                                                  return;
                                                }
                                                setSelectedPacks((prev) => [
                                                  ...prev,
                                                  {
                                                    id:
                                                      Date.now().toString() +
                                                      Math.random(),
                                                    link,
                                                    packIdx: pIdx,
                                                    profileId: prof.id,
                                                    isGift: false,
                                                    recipientName: "",
                                                  },
                                                ]);
                                              }}
                                              style={{
                                                border: "none",
                                                background: "none",
                                                cursor: "pointer",
                                                fontWeight: "900",
                                                color: "#9960a8",
                                                padding: "0 6px",
                                              }}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>

                                        {/* BOTTOM ROW: Hint (Only renders if count is > 0) */}
                                        {packCount > 0 && (
                                          <div
                                            style={{
                                              fontSize: isMobile
                                                ? "0.55rem"
                                                : "0.75rem",
                                              color: "#4e5f28",
                                              fontWeight: "400",
                                              lineHeight: 1.4,
                                              width: "100%", // Ensures it uses full panel width on mobile
                                            }}
                                          >
                                            {prof.isGift ? (
                                              <span>
                                                {currentLang === "en"
                                                  ? `${pack.size} ${pack.size === 1 ? "credit" : "credits"} as gift code.`
                                                  : `${pack.size} ${pack.size === 1 ? "Kredit" : "Kredite"} als Geschenkcode.`}
                                              </span>
                                            ) : (
                                              (() => {
                                                const needed =
                                                  sessionsNeeded[prof.id]?.[
                                                    link
                                                  ] || 0;
                                                const packsInCartForProf =
                                                  selectedPacks.filter(
                                                    (p) =>
                                                      p.link === link &&
                                                      p.profileId === prof.id,
                                                  );
                                                const pendingCreditsInCart =
                                                  packsInCartForProf.reduce(
                                                    (sum, p) =>
                                                      sum +
                                                      (pricingMap[link]
                                                        ?.packs?.[p.packIdx]
                                                        ?.size || 0),
                                                    0,
                                                  );
                                                const existingBal =
                                                  profileBalances[prof.id]?.[
                                                    getCreditKey(link)
                                                  ] || 0;
                                                const totalAvailable =
                                                  existingBal +
                                                  pendingCreditsInCart;
                                                const actualNeeds = Math.max(
                                                  0,
                                                  needed - totalAvailable,
                                                );
                                                const used = Math.min(
                                                  actualNeeds,
                                                  pack.size,
                                                );
                                                const added = pack.size - used;
                                                const isGuestProfile =
                                                  !currentUser ||
                                                  prof.id === "guest";

                                                const actualUsed = Math.min(
                                                  selectedDates
                                                    ? selectedDates.length
                                                    : 0,
                                                  pack.size,
                                                );
                                                const actualAdded =
                                                  pack.size - actualUsed;

                                                if (actualUsed === 0) {
                                                  if (isGuestProfile) {
                                                    return currentLang === "en"
                                                      ? `${pack.size} ${pack.size === 1 ? "credit" : "credits"} will be sent to you as a code.`
                                                      : `${pack.size} ${pack.size === 1 ? "Kredit" : "Kredite"} ${pack.size === 1 ? "wird" : "werden"} dir als Code zugesendet.`;
                                                  } else {
                                                    return currentLang === "en"
                                                      ? `${pack.size} ${pack.size === 1 ? "credit" : "credits"} will be added to your profile balance.`
                                                      : `${pack.size} ${pack.size === 1 ? "Kredit" : "Kredite"} ${pack.size === 1 ? "wird" : "werden"} deinem Profilguthaben hinzugefügt.`;
                                                  }
                                                } else if (actualAdded === 0) {
                                                  return currentLang === "en"
                                                    ? `${actualUsed} ${actualUsed === 1 ? "credit" : "credits"} will be used for the ${actualUsed === 1 ? "selected course" : "selected courses"}.`
                                                    : `${actualUsed} ${actualUsed === 1 ? "Kredit" : "Kredite"} ${actualUsed === 1 ? "wird" : "werden"} für ${actualUsed === 1 ? "den ausgewählten Kurs" : "die ausgewählten Kurse"} genutzt.`;
                                                } else {
                                                  if (isGuestProfile) {
                                                    return currentLang === "en"
                                                      ? `${actualUsed} ${actualUsed === 1 ? "credit" : "credits"} will be used for the ${actualUsed === 1 ? "selected course" : "selected courses"} and ${actualAdded} will be sent to you as a code.`
                                                      : `${actualUsed} ${actualUsed === 1 ? "Kredit" : "Kredite"} ${actualUsed === 1 ? "wird" : "werden"} für ${actualUsed === 1 ? "den ausgewählten Kurs" : "die ausgewählten Kurse"} genutzt und ${actualAdded} ${actualAdded === 1 ? "Kredit" : "Kredite"} ${actualAdded === 1 ? "wird" : "werden"} dir als Code zugesendet.`;
                                                  } else {
                                                    return currentLang === "en"
                                                      ? `${actualUsed} ${actualUsed === 1 ? "credit" : "credits"} will be used for the ${actualUsed === 1 ? "selected course" : "selected courses"} and ${actualAdded} will be added to your profile balance.`
                                                      : `${actualUsed} ${actualUsed === 1 ? "Kredit" : "Kredite"} ${actualUsed === 1 ? "wird" : "werden"} für ${actualUsed === 1 ? "den ausgewählten Kurs" : "die ausgewählten Kurse"} genutzt und ${actualAdded} ${actualAdded === 1 ? "Kredit" : "Kredite"} ${actualAdded === 1 ? "wird" : "werden"} deinem Profilguthaben hinzugefügt.`;
                                                  }
                                                }
                                              })()
                                            )}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

        {extraItemsBreakdown.length > 0 && (
          <div
            style={{
              marginTop: "10px",
              padding: "16px",
              backgroundColor: "rgba(28, 7, 0, 0.03)",
              borderRadius: "16px",
              border: "1px solid rgba(28, 7, 0, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <h4
              style={{
                margin: "0",
                fontSize: "0.85rem",
                color: "#1c0700",
                opacity: 0.9,
                borderBottom: "1px solid rgba(28,7,0,0.1)",
                paddingBottom: "8px",
              }}
            >
              {currentLang === "en" ? "Receipt Summary" : "Buchungsdetails"}
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {extraItemsBreakdown.map((item, bIdx) => (
                <div
                  key={bIdx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "800",
                      fontSize: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        lineHeight: 1.4,
                        paddingRight: "10px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.count}{" "}
                      {item.isPack
                        ? "x"
                        : currentLang === "en"
                          ? item.count === 1
                            ? "Session:"
                            : "Sessions:"
                          : item.count === 1
                            ? "Termin:"
                            : "Termine:"}{" "}
                      {item.name}
                    </span>
                    <span
                      style={{
                        opacity: 0.8,
                        color: "#4e5f28",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        textAlign: "right",
                      }}
                    >
                      {item.isCredit
                        ? currentLang === "en"
                          ? "Paid with credit"
                          : "Mit Guthaben bezahlt"
                        : item.isFree
                          ? "FREE"
                          : item.isDiscount
                            ? `${formatPrice(item.price * item.count)} CHF`
                            : `+ ${formatPrice(item.price * item.count)} CHF`}
                    </span>
                  </p>
                  {item.details && item.details.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        paddingLeft: "8px",
                        borderLeft: "2px solid rgba(153, 96, 168, 0.3)",
                        marginLeft: "4px",
                      }}
                    >
                      {item.details.map((det, dIdx) => (
                        <span
                          key={dIdx}
                          style={{
                            fontSize: "0.65rem",
                            opacity: 0.7,
                            color: "#1c0700",
                          }}
                        >
                          <span style={{ fontWeight: "700" }}>
                            {det.person}
                          </span>
                          {det.date
                            ? ` | ${formatDate(det.date)}${det.time ? ` ${det.time}` : ""}`
                            : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {infoSentence && (
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "0.65rem",
                  fontStyle: "italic",
                  opacity: 0.6,
                  borderTop: "1px dashed rgba(28,7,0,0.1)",
                  paddingTop: "10px",
                }}
              >
                {infoSentence}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPurchaseOptionsContent = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          backgroundColor: "rgba(202, 175, 243, 0.1)",
          padding: "12px",
          borderRadius: "12px",
          border: "1px dashed rgba(202, 175, 243, 0.4)",
        }}
      >
        {!isCodeExpanded && !activePromo && !activePackCode ? (
          <button
            onClick={() => setIsCodeExpanded(true)}
            style={{
              background: "none",
              border: "none",
              color: "#9960a8",
              cursor: "pointer",
              fontSize: "0.85rem",
              padding: 0,
              fontWeight: isMobile ? "400" : "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Ticket size={16} />{" "}
            {currentLang === "en"
              ? "Add Promo or Pack Code"
              : "Code hinzufügen"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "#9960a8",
                  textTransform: "uppercase",
                }}
              >
                {currentLang === "en" ? "Enter Code" : "Code eingeben"}
              </label>
              <button
                onClick={() => {
                  setIsCodeExpanded(false);
                  setCodeInput("");
                  setActivePromo(null);
                  setActivePackCode(null);
                  setCodeStatus({ loading: false, error: "" });
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1c0700",
                  opacity: 0.5,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {currentLang === "en" ? "Remove" : "Entfernen"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="e.g. SUMMER24 or X7B9K2"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                disabled={activePromo || activePackCode}
                style={{
                  ...S.guestInputStyle,
                  padding: "10px 12px",
                  flex: 1,
                  backgroundColor:
                    activePromo || activePackCode
                      ? "rgba(78, 95, 40, 0.05)"
                      : "rgba(255, 252, 227, 0.4)",
                }}
              />
              {!activePromo && !activePackCode && (
                <button
                  onClick={handleApplyCode}
                  disabled={codeStatus.loading || !codeInput}
                  style={{
                    padding: "0 15px",
                    backgroundColor: "#9960a8",
                    color: "#fdf8e1",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {codeStatus.loading ? (
                    <Loader2 size={16} className="spinner" />
                  ) : currentLang === "en" ? (
                    "Apply"
                  ) : (
                    "Anwenden"
                  )}
                </button>
              )}
            </div>
            {activePromo && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#4e5f28",
                  marginTop: "4px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle size={14} />{" "}
                {currentLang === "en"
                  ? `Promo applied: ${activePromo.discountValue}${activePromo.discountType === "percent" ? "% OFF" : " CHF DISCOUNT"}`
                  : `Promo angewendet: ${activePromo.discountValue}${activePromo.discountType === "percent" ? "% RABATT" : " CHF RABATT"}`}
              </p>
            )}
            {activePackCode && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#4e5f28",
                  marginTop: "4px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle size={14} />{" "}
                {currentLang === "en"
                  ? `Pack Code applied: ${activePackCode.remaining !== "?" ? activePackCode.remaining : "Valid"} credits available`
                  : `Pack Code angewendet: ${activePackCode.remaining !== "?" ? activePackCode.remaining : "Gültige"} Guthaben verfügbar`}
              </p>
            )}
            {codeStatus.error && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#1c0700",
                  opacity: 0.7,
                  marginTop: "4px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <XCircle size={14} /> {codeStatus.error}
              </p>
            )}
          </div>
        )}
      </div>

      {activePackCode && coversEntirely ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          {renderTermsAgreement()}
          <button
            onClick={() =>
              validateAndProceed(() => onPayment("redeem", activePackCode.code))
            }
            style={{ ...S.primaryBtnStyle(isMobile), marginTop: "10px" }}
          >
            {currentLang === "en"
              ? "Redeem Code & Book"
              : "Code einlösen & Buchen"}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
            marginTop: "0.5rem",
          }}
        >
          {renderPackOption()}
          {renderTermsAgreement()}
          <button
            onClick={() =>
              validateAndProceed(() => {
                const packCount = selectedPacks.length;
                if (packCount > 0) {
                  onPayment(
                    "pack",
                    promoAppliesToPack ? activePromo?.code : null,
                    selectedPacks,
                    finalPackPrice,
                    usableCredits,
                    activePackCode,
                  );
                } else if (coversEntirely && !activePackCode) {
                  onBookCredits();
                } else {
                  onPayment(
                    "individual",
                    promoAppliesToSingle ? activePromo?.code : null,
                    totalTicketsSelected,
                    finalTotalPrice,
                    usableCredits,
                    activePackCode,
                  );
                }
              })
            }
            style={{ ...S.primaryBtnStyle(isMobile) }}
          >
            {(() => {
              const priceNum =
                selectedPacks.length > 0 ? finalPackPrice : finalTotalPrice;
              const price = formatPrice(priceNum);
              const isZeroCost = priceNum === 0;

              const creditText =
                usableCredits > 0
                  ? `${usableCredits} ${currentLang === "en" ? (usableCredits === 1 ? "Credit" : "Credits") : "Guthaben"}`
                  : "";

              const plusStr = usableCredits > 0 && !isZeroCost ? " + " : "";

              let actionTextEn = "Buy";
              let actionTextDe = "Kaufen";

              if (hasSelection) {
                if (isZeroCost) {
                  actionTextEn = "Book";
                  actionTextDe = "Buchen";
                } else {
                  actionTextEn = "Buy & Book";
                  actionTextDe = "Kaufen & Buchen";
                }
              }

              const costString = isZeroCost
                ? creditText
                : `${creditText}${plusStr}${price} CHF`;

              return currentLang === "en"
                ? costString
                  ? `${actionTextEn} (${costString})`
                  : actionTextEn
                : costString
                  ? `${actionTextDe} (${costString})`
                  : actionTextDe;
            })()}
          </button>
        </div>
      )}
    </div>
  );

  const renderBalanceDisplay = () => {
    const activePairs = new Set();
    selectedDates.forEach((d) => {
      const courseKey = getCreditKey(d.link || coursePath);
      (d.attendees || []).forEach((a) => {
        const pid = a.profileId || "guest";
        if (pid !== "guest") activePairs.add(`${pid}:::${courseKey}`);
      });
    });
    selectedPacks.forEach((sp) => {
      if (!sp.isGift) {
        const courseKey = getCreditKey(sp.link || coursePath);
        const pid = sp.profileId || "guest";
        if (pid !== "guest") activePairs.add(`${pid}:::${courseKey}`);
      }
    });

    const relevantBalances = [];
    activePairs.forEach((pair) => {
      const [pid, courseKey] = pair.split(":::");
      const bal = profileBalances[pid]?.[courseKey] || 0;
      if (bal > 0) {
        const name =
          pid === "main"
            ? userData?.firstName || (currentLang === "en" ? "Me" : "Ich")
            : userData?.linkedProfiles?.find((lp) => lp.id === pid)
                ?.firstName || "User";
        const matchedEntry = Object.entries(pricingMap).find(
          ([link]) => getCreditKey(link) === courseKey,
        );
        const pDataMatch = matchedEntry ? matchedEntry[1] : null;
        const dynamicName =
          pDataMatch?.[`name${currentLang === "en" ? "En" : "De"}`];
        const courseNameDisplay =
          dynamicName || pDataMatch?.courseName || courseKey;
        relevantBalances.push({ name, bal, courseName: courseNameDisplay });
      }
    });

    if (relevantBalances.length === 0) return null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "0.5rem",
        }}
      >
        {relevantBalances.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(78, 95, 40, 0.1)",
              color: "#4e5f28",
              padding: "6px 14px",
              borderRadius: "100px",
              fontSize: "0.8rem",
              width: "fit-content",
              fontWeight: "600",
            }}
          >
            <Ticket size={14} />
            <span>
              {item.name}: {item.bal}{" "}
              {currentLang === "en" ? "credits" : "Guthaben"} ({item.courseName}
              )
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={S.bookingCardStyle(isMobile, true)}>
      {/* LIGHTWEIGHT CONFIRMATION POPUP */}
      {uncheckWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setUncheckWarning(null)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              maxWidth: "350px",
              width: "100%",
              borderRadius: "24px",
              padding: "2rem 1.5rem 1.5rem 1.5rem",
              boxShadow: "0 20px 40px rgba(28, 7, 0, 0.2)",
              textAlign: "center",
              position: "relative",
              border: "1px solid #caaff3",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setUncheckWarning(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.3,
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>

            <h3
              style={{
                marginTop: 0,
                color: "#1c0700",
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "1.4rem",
              }}
            >
              {uncheckWarning.type === "time_conflict"
                ? currentLang === "en"
                  ? "Time Conflict"
                  : "Zeitkonflikt"
                : uncheckWarning.type === "login_required" ||
                    uncheckWarning.type === "login_required_prerequisite"
                  ? currentLang === "en"
                    ? "Profile Required"
                    : "Profil erforderlich"
                  : uncheckWarning.type === "missing_prerequisite"
                    ? currentLang === "en"
                      ? "Prerequisite Missing"
                      : "Voraussetzung fehlt"
                    : currentLang === "en"
                      ? "Check again"
                      : "Kurze Prüfung"}
            </h3>

            <p
              style={{
                fontSize: "0.85rem",
                color: "#1c0700",
                marginBottom: "1.5rem",
                lineHeight: 1.5,
              }}
            >
              {uncheckWarning.type === "time_conflict" ? (
                currentLang === "en" ? (
                  `This slot overlaps with your selection for "${uncheckWarning.conflictingName}". Please deselect the other slot first.`
                ) : (
                  `Dieser Slot überschneidet sich mit deiner Auswahl für "${uncheckWarning.conflictingName}". Bitte wähle den anderen Slot zuerst ab.`
                )
              ) : (
                <>
                  <strong>
                    {(() => {
                      const eventObj = selectedDates.find(
                        (d) => d.id === uncheckWarning.eventId,
                      );
                      const evPricing = eventObj
                        ? pricingMap[eventObj.link]
                        : pricing;
                      const addon = evPricing?.specialEvents?.find(
                        (se) => se.id === uncheckWarning.addonId,
                      );
                      return currentLang === "en"
                        ? addon?.nameEn
                        : addon?.nameDe;
                    })()}
                  </strong>{" "}
                  {uncheckWarning.type === "login_required"
                    ? currentLang === "en"
                      ? "requires you to have completed an intro course. Please log in or create a profile so we can verify your history."
                      : "erfordert, dass du einen Einführungskurs absolviert hast. Bitte logge dich ein, um dies zu überprüfen."
                    : uncheckWarning.type === "login_required_prerequisite"
                      ? currentLang === "en"
                        ? "is a prerequisite for advanced sessions. Please log in or create a profile so we can save your progress."
                        : "ist eine Voraussetzung für weiterführende Kurse. Bitte logge dich ein oder erstelle ein Profil, damit wir deinen Fortschritt speichern können."
                      : uncheckWarning.type === "missing_prerequisite"
                        ? currentLang === "en"
                          ? `requires you to complete the Intro first. Please add it to your selection.`
                          : `erfordert, dass du zuerst die Einführung absolvierst. Bitte füge es deiner Auswahl hinzu.`
                        : currentLang === "en"
                          ? "is mandatory for first-timers. Please confirm you have booked this course before to remove it."
                          : "ist für Erstkunden obligatorisch. Bitte bestätige, dass du diesen Kurs bereits gebucht hast."}
                </>
              )}
            </p>

            {uncheckWarning.type !== "login_required" &&
              uncheckWarning.type !== "login_required_prerequisite" &&
              uncheckWarning.type !== "missing_prerequisite" &&
              uncheckWarning.type !== "time_conflict" && (
                <button
                  onClick={async () => {
                    if (currentUser) {
                      try {
                        await updateDoc(doc(db, "users", currentUser.uid), {
                          completedAddons: arrayUnion(uncheckWarning.addonId),
                        });
                      } catch (e) {
                        console.error("Error updating user progress:", e);
                      }
                    }
                    executeToggleAddon(
                      uncheckWarning.eventId,
                      uncheckWarning.attendeeIndex,
                      uncheckWarning.addonId,
                      uncheckWarning.selectedTime,
                    );
                    setUncheckWarning(null);
                  }}
                  style={{
                    ...S.primaryBtnStyle(isMobile),
                    width: "100%",
                    padding: "12px",
                    fontSize: "0.9rem",
                  }}
                >
                  {currentLang === "en" ? "I confirm" : "Ich bestätige"}
                </button>
              )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
        .plus-btn-anim {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .plus-btn-anim:hover {
          transform: scale(1.1);
          background-color: #9960a8 !important;
        }
        .plus-btn-anim:hover svg {
          stroke: #fffce3 !important;
        }
        .plus-btn-anim:active {
          transform: scale(0.95);
        }
        @keyframes fadeInStep {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .step-fade-in {
          animation: fadeInStep 0.3s ease-out;
        }
      `}</style>

      <div
        style={{
          minWidth: isMobile ? "100%" : "380px",
          opacity: 1,
          textAlign: "left",
        }}
      >
        <h3
          style={{
            fontFamily: "Harmond-SemiBoldCondensed",
            fontSize: isMobile ? "1.8rem" : "2rem",
            fontWeight: isMobile ? "400" : "bold",
            marginBottom: "1.5rem",
            marginTop: 0,
            textAlign: "center",
          }}
        >
          {hasSelection
            ? bookingStep === 1
              ? currentLang === "en"
                ? "Booking Summary"
                : "Buchungsübersicht"
              : currentLang === "en"
                ? "Checkout"
                : "Kasse"
            : currentLang === "en"
              ? "Course Options"
              : "Kursoptionen"}
        </h3>

        {/* STEP 1: SUMMARY & DETAILS */}
        {(!hasSelection || bookingStep === 1) && (
          <div
            className="step-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* LOGIN / GUEST FORM */}
            {!currentUser && (
              <div style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => setIsAuthExpanded(!isAuthExpanded)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "10px 0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#4e5f28",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                  }}
                >
                  {isAuthExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  {currentLang === "en"
                    ? "Login or Register"
                    : "Einloggen oder Registrieren"}
                </button>
                {isAuthExpanded && (
                  <div
                    style={{
                      padding: "1.2rem",
                      backgroundColor: "rgba(28, 7, 0, 0.03)",
                      borderRadius: "16px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <form
                      onSubmit={handleInlineAuth}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {isRegistering && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row",
                            gap: "10px",
                          }}
                        >
                          <input
                            type="text"
                            placeholder={
                              currentLang === "en" ? "First Name" : "Vorname"
                            }
                            required
                            style={{ ...S.guestInputStyle, flex: 1 }}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder={
                              currentLang === "en" ? "Last Name" : "Nachname"
                            }
                            required
                            style={{ ...S.guestInputStyle, flex: 1 }}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      )}
                      <input
                        type="email"
                        placeholder="Email"
                        required
                        style={S.guestInputStyle}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder={
                          currentLang === "en" ? "Password" : "Passwort"
                        }
                        required
                        style={S.guestInputStyle}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      {authError && (
                        <p
                          style={{
                            fontSize: "0.7rem",
                            color: "#1c0700",
                            opacity: 0.7,
                          }}
                        >
                          {authError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={authLoading}
                        style={S.primaryBtnStyle(isMobile)}
                      >
                        {authLoading ? (
                          <Loader2 size={16} className="spinner" />
                        ) : isRegistering ? (
                          currentLang === "en" ? (
                            "Register"
                          ) : (
                            "Registrieren"
                          )
                        ) : currentLang === "en" ? (
                          "Login"
                        ) : (
                          "Einloggen"
                        )}
                      </button>
                    </form>
                    <button
                      onClick={() => setIsRegistering(!isRegistering)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9960a8",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                        marginTop: "12px",
                      }}
                    >
                      {isRegistering
                        ? currentLang === "en"
                          ? "Already have an account?"
                          : "Bereits ein Konto?"
                        : currentLang === "en"
                          ? "Need an account?"
                          : "Noch kein Konto?"}
                    </button>
                  </div>
                )}
                {!isAuthExpanded && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "900",
                        letterSpacing: "1px",
                        opacity: 0.6,
                      }}
                    >
                      {currentLang === "en" ? "Guest details" : "Gast-Details"}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="text"
                        placeholder={
                          currentLang === "en" ? "First Name" : "Vorname"
                        }
                        style={{ ...S.guestInputStyle, flex: 1 }}
                        value={guestInfo.firstName}
                        onChange={(e) =>
                          setGuestInfo({
                            ...guestInfo,
                            firstName: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        placeholder={
                          currentLang === "en" ? "Last Name" : "Nachname"
                        }
                        style={{ ...S.guestInputStyle, flex: 1 }}
                        value={guestInfo.lastName}
                        onChange={(e) =>
                          setGuestInfo({
                            ...guestInfo,
                            lastName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      style={S.guestInputStyle}
                      value={guestInfo.email}
                      onChange={(e) =>
                        setGuestInfo({ ...guestInfo, email: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {renderSelectionSummary()}
            {currentUser && renderBalanceDisplay()}

            {hasSelection ? (
              <button
                onClick={() => setBookingStep(2)}
                style={{ ...S.primaryBtnStyle(isMobile), marginTop: "0.5rem" }}
                disabled={
                  !currentUser && (!guestInfo.firstName || !guestInfo.email)
                }
              >
                {currentLang === "en" ? "Continue" : "Weiter"}
              </button>
            ) : pricing?.isRequestOnly ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {renderTermsAgreement()}
                <button
                  disabled={true}
                  style={{
                    ...S.primaryBtnStyle(isMobile),
                    marginTop: "10px",
                    opacity: 0.5,
                    cursor: "not-allowed",
                  }}
                >
                  {currentLang === "en"
                    ? "Request Selected Dates"
                    : "Ausgewählte Termine anfragen"}
                </button>
                <p
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.6,
                    textAlign: "center",
                    fontStyle: "italic",
                    marginTop: "4px",
                  }}
                >
                  {currentLang === "en"
                    ? "No payment required yet. We will confirm availability via email."
                    : "Noch keine Zahlung erforderlich. Wir bestätigen die Verfügbarkeit per E-Mail."}
                </p>
              </div>
            ) : (
              renderPurchaseOptionsContent()
            )}
          </div>
        )}

        {/* STEP 2: CHECKOUT & PACKS */}
        {hasSelection && bookingStep === 2 && (
          <div
            className="step-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <button
              onClick={() => setBookingStep(1)}
              style={{
                background: "none",
                border: "none",
                color: "#1c0700",
                opacity: 0.6,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.85rem",
                fontWeight: "bold",
                padding: 0,
                marginBottom: "0.5rem",
              }}
            >
              <ChevronLeft size={16} />{" "}
              {currentLang === "en"
                ? "Back to Selection"
                : "Zurück zur Auswahl"}
            </button>

            {pricing?.isRequestOnly ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {renderTermsAgreement()}
                <button
                  onClick={() => validateAndProceed(onRequestSubmit)}
                  style={{ ...S.primaryBtnStyle(isMobile), marginTop: "10px" }}
                >
                  {currentLang === "en"
                    ? "Request Selected Dates"
                    : "Ausgewählte Termine anfragen"}
                </button>
                <p
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.6,
                    textAlign: "center",
                    fontStyle: "italic",
                    marginTop: "4px",
                  }}
                >
                  {currentLang === "en"
                    ? "No payment required yet. We will confirm availability via email."
                    : "Noch keine Zahlung erforderlich. Wir bestätigen die Verfügbarkeit per E-Mail."}
                </p>
              </div>
            ) : (
              renderPurchaseOptionsContent()
            )}
          </div>
        )}
      </div>

      {/* PACK INFO MODAL */}
      {showPackInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28, 7, 0, 0.2)",
            zIndex: 30000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowPackInfo(false)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              maxWidth: "400px",
              width: "100%",
              borderRadius: "24px",
              padding: "2rem",
              boxShadow: "0 20px 40px rgba(28, 7, 0, 0.2)",
              position: "relative",
              border: "1px solid #caaff3",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPackInfo(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.4,
              }}
            >
              <X size={20} />
            </button>

            <h3
              style={{
                marginTop: 0,
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "1.6rem",
              }}
            >
              {currentLang === "en" ? "About Session Packs" : "Über Kurspakete"}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
                fontSize: "0.9rem",
                color: "#1c0700",
                lineHeight: 1.5,
              }}
            >
              <p>
                {currentUser ? (
                  currentLang === "en" ? (
                    <>
                      Credits are tied to your profile and are non-transferable.
                      <br />
                      You can use one credit per course day.
                    </>
                  ) : (
                    <>
                      Guthaben sind an dein Profil gebunden und nicht
                      übertragbar.
                      <br />
                      Pro Kurstag kann ein Guthaben genutzt werden.
                    </>
                  )
                ) : currentLang === "en" ? (
                  <>
                    Credits are tied to your email address. They are
                    non-transferable and limited to one ticket per course day.
                  </>
                ) : (
                  <>
                    Guthaben sind an deine E-Mail-Adresse gebunden.
                    <br />
                    Sie sind nicht übertragbar und auf ein Ticket pro Kurstag
                    begrenzt.
                  </>
                )}
              </p>

              {pricing?.specialEvents?.some((se) => se.freeWithPack) && (
                <div
                  style={{
                    backgroundColor: "rgba(153, 96, 168, 0.1)",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(153, 96, 168, 0.2)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "700",
                      color: "#9960a8",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Star size={14} fill="#9960a8" />
                    {currentLang === "en"
                      ? "Intro Special"
                      : "Einführungs-Special"}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "0.85rem",
                      textAlign: "left",
                    }}
                  >
                    {currentLang === "en"
                      ? "When purchasing a pack, all mandatory intro courses for this session are free of charge."
                      : "Beim Kauf eines Pakets sind alle obligatorischen Einführungskurse für diesen Termin kostenlos."}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPackInfo(false)}
              style={{
                ...S.primaryBtnStyle(isMobile),
                marginTop: "1.5rem",
                padding: "12px",
              }}
            >
              {currentLang === "en" ? "Got it" : "Verstanden"}
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM GIFT NAME PROMPT MODAL */}
      {giftPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28, 7, 0, 0.4)",
            zIndex: 30000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setGiftPrompt(null)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              maxWidth: "350px",
              width: "100%",
              borderRadius: "24px",
              padding: "2rem",
              boxShadow: "0 20px 40px rgba(28, 7, 0, 0.2)",
              position: "relative",
              border: "1px solid #caaff3",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setGiftPrompt(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.4,
              }}
            >
              <X size={20} />
            </button>
            <h3
              style={{
                margin: 0,
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "1.5rem",
                color: "#1c0700",
              }}
            >
              {currentLang === "en" ? "Gift Details" : "Geschenk-Details"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
              {currentLang === "en"
                ? "Who is this gift for?"
                : "Für wen ist dieses Geschenk?"}
            </p>
            <input
              autoFocus
              type="text"
              placeholder={
                currentLang === "en" ? "Recipient Name" : "Name des Beschenkten"
              }
              style={{
                ...S.guestInputStyle,
                padding: "12px",
                fontSize: "0.9rem",
                backgroundColor: "rgba(255, 252, 227, 0.6)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSelectedPacks((prev) => [
                    ...prev,
                    {
                      ...giftPrompt,
                      id: Date.now().toString() + Math.random(),
                    },
                  ]);
                  setGiftPrompt(null);
                }
              }}
              onChange={(e) =>
                setGiftPrompt({ ...giftPrompt, recipientName: e.target.value })
              }
              value={giftPrompt.recipientName || ""}
            />
            <button
              onClick={() => {
                setSelectedPacks((prev) => [
                  ...prev,
                  { ...giftPrompt, id: Date.now().toString() + Math.random() },
                ]);
                setGiftPrompt(null);
              }}
              style={{ ...S.primaryBtnStyle(isMobile), marginTop: "0.5rem" }}
            >
              {currentLang === "en" ? "Add to Cart" : "Hinzufügen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
