// 1. Import images from the standard folder
const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});

import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

// 2. Helper to get the path
const getImage = (filename) => {
  const key = `../assets/planets/${filename}`;
  return planetImages[key]?.default || "";
};

export const planetIcons = {
  sight: {
    en: getImage("sight_en.png"),
    de: getImage("sight_de.png"),
    base: getImage("sight.png"),
  },
  touch: {
    en: getImage("touch_en.png"),
    de: getImage("touch_de.png"),
    base: getImage("touch.png"),
  },
  hearing: {
    en: getImage("hearing_en.png"),
    de: getImage("hearing_de.png"),
    base: getImage("hearing.png"),
  },
  smell: {
    en: getImage("smell_en.png"),
    de: getImage("smell_de.png"),
    base: getImage("smell.png"),
  },
  taste: {
    en: getImage("taste_en.png"),
    de: getImage("taste_de.png"),
    base: getImage("taste.png"),
  },
};

export const planets = [
  {
    id: "sight",
    type: "courses",
    get icon() {
      return {
        en: getImage("sight_en.png"),
        de: getImage("sight_de.png"),
        base: getImage("sight.png"),
      };
    },
    // NEW: Fallback moon data
    fallback: {
      text: {
        en: "I see there's nothing here.",
        de: "Ich sehe, hier ist nichts.",
      },
      isItalic: true,
    },
    courses: [
      {
        text: { en: "pottery tuesdays", de: "pottery tuesdays" },
        link: "/pottery",
      },
      {
        text: { en: "artistic vision", de: "artistic vision" },
        link: "/artistic-vision",
      },
      {
        text: { en: "get ink!", de: "get ink!" },
        link: "/get-ink",
      },
    ],
  },
  {
    id: "touch",
    type: "courses",
    get icon() {
      return {
        en: getImage("touch_en.png"),
        de: getImage("touch_de.png"),
        base: getImage("touch.png"),
      };
    },
    fallback: {
      text: { en: "I feel you.", de: "Ich fühle dich." },
      isItalic: true,
    },
    courses: [
      {
        text: { en: "pottery tuesdays", de: "pottery tuesdays" },
        link: "/pottery",
      },
      {
        text: { en: "artistic vision", de: "artistic vision" },
        link: "/artistic-vision",
      },
      {
        text: { en: "get ink!", de: "get ink!" },
        link: "/get-ink",
      },
    ],
  },
  {
    id: "hearing",
    type: "courses",
    get icon() {
      return {
        en: getImage("hearing_en.png"),
        de: getImage("hearing_de.png"),
        base: getImage("hearing.png"),
      };
    },
    fallback: {
      text: {
        en: "I can hear something in the distance.",
        de: "Ich höre etwas in der Ferne.",
      },
      isItalic: true,
    },
    courses: [
      {
        text: { en: "vocal coaching", de: "gesangscoaching" },
        link: "/singing",
      },
      {
        text: { en: "extended voice lab", de: "extended voice lab" },
        link: "/extended-voice-lab",
      },
      {
        text: { en: "artistic vision", de: "artistic vision" },
        link: "/artistic-vision",
      },
      {
        text: { en: "performing words", de: "performing words" },
        link: "/performing-words",
      },
      {
        text: { en: "singing basics weekend", de: "singing basics weekend" },
        link: "/singing-basics",
      },
    ],
  },
  {
    id: "smell",
    type: "courses",
    get icon() {
      return {
        en: getImage("smell_en.png"),
        de: getImage("smell_de.png"),
        base: getImage("smell.png"),
      };
    },
    fallback: {
      text: { en: "smell you later.", de: "wir riechen uns später." },
      isItalic: true,
    },
    courses: [
      {
        text: { en: "artistic vision", de: "artistic vision" },
        link: "/artistic-vision",
      },
    ],
  },
  {
    id: "taste",
    type: "courses",
    get icon() {
      return {
        en: getImage("taste_en.png"),
        de: getImage("taste_de.png"),
        base: getImage("taste.png"),
      };
    },
    fallback: {
      text: {
        en: "it's on the tip of my tongue.",
        de: "es liegt mir auf der Zunge.",
      },
      isItalic: true,
    },
    courses: [
      {
        text: { en: "artistic vision", de: "artistic vision" },
        link: "/artistic-vision",
      },
    ],
  },
  {
    id: "location",
    type: "info",
    get icon() {
      return {
        en: getImage("location_en.png"),
        de: getImage("location_de.png"),
      };
    },
    courses: [
      {
        text: { en: "how to find us :)", de: "so findest du uns :)" },
        link: "/location",
      },
    ],
  },
  {
    id: "team",
    type: "info",
    get icon() {
      return {
        en: getImage("team_en.png"),
        de: getImage("team_en.png"),
      };
    },
    courses: [
      { text: { en: "get to know us", de: "das sind wir" }, link: "/team" },
    ],
  },
  {
    id: "events",
    type: "info",
    get icon() {
      return {
        en: getImage("events_en.png"),
        de: getImage("events_en.png"),
      };
    },
    courses: [
      { text: { en: "come back later :)", de: "komm später wieder :)" } },
    ],
  },
  {
    id: "contact",
    type: "action",
    get icon() {
      return {
        en: getImage("contact_en.png"),
        de: getImage("contact_de.png"),
      };
    },
    courses: [
      { text: { en: "get in touch!", de: "melde dich!" }, link: "/contact" },
    ],
  },
  {
    id: "rent",
    type: "action",
    get icon() {
      return {
        en: getImage("rent_en.png"),
        de: getImage("rent_de.png"),
      };
    },
    courses: [
      { text: { en: "rent our space", de: "raum mieten" }, link: "/rent" },
    ],
  },
  {
    id: "atelier",
    type: "home",
    get icon() {
      return {
        base: getImage("atelier.png"),
        en: getImage("atelier_en.png"),
        de: getImage("atelier_en.png"),
      };
    },
    courses: [
      {
        text: { en: "about us", de: "über uns" },
        link: "/team",
      },
      {
        text: { en: "location", de: "standort" },
        link: "/location",
      },
      {
        text: { en: "rent our space", de: "raum mieten" },
        link: "/rent",
      },
      {
        text: { en: "contact", de: "kontakt" },
        link: "/contact",
      },
    ],
  },
];

// NEW: Function to dynamically overwrite static names with Firestore names globally
export const syncPlanetCourseNames = async () => {
  try {
    const snap = await getDocs(collection(db, "course_settings"));
    const settings = {};
    snap.docs.forEach((doc) => {
      settings[doc.id] = doc.data();
    });

    planets.forEach((planet) => {
      if (planet.courses) {
        planet.courses.forEach((course) => {
          if (course.link) {
            // Keep the link exactly as it is, just match the ID
            const id = course.link.replace(/\//g, "");
            const customSetting = settings[id];

            if (customSetting) {
              // Overwrite the text object globally
              course.text.en = customSetting.nameEn || course.text.en;
              course.text.de = customSetting.nameDe || course.text.de;
            }
          }
        });
      }
    });
  } catch (err) {
    console.error("Error syncing custom course names to planets:", err);
  }
};
