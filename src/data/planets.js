// 1. Import images from the standard folder
const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});

// 2. Helper to get the path
const getImage = (filename) => {
  const key = `../assets/planets/${filename}`;
  return planetImages[key]?.default || "";
};

// 3. Planet Definitions
// Both 'en' and 'de' now point to the '_en.png' asset.
export const planets = [
  {
    id: "sight",
    type: "courses",
    get icon() {
      return {
        en: getImage("sight_en.png"),
        de: getImage("sight_en.png"),
      };
    },
    courses: [
      {
        text: { en: "pottery tuesdays", de: "pottery tuesdays" },
        link: "/pottery",
      },
    ],
  },
  {
    id: "touch",
    type: "courses",
    get icon() {
      return {
        en: getImage("touch_en.png"),
        de: getImage("touch_en.png"),
      };
    },
    courses: [
      {
        text: { en: "pottery tuesdays", de: "pottery tuesdays" },
        link: "/pottery",
      },
    ],
  },
  {
    id: "hearing",
    type: "courses",
    get icon() {
      return {
        en: getImage("hearing_en.png"),
        de: getImage("hearing_en.png"),
      };
    },
    courses: [
      {
        text: { en: "singing lessons", de: "gesangsunterricht" },
        link: "/singing",
      },
    ],
  },
  {
    id: "smell",
    type: "courses",
    get icon() {
      return {
        en: getImage("smell_en.png"),
        de: getImage("smell_en.png"),
      };
    },
    courses: [
      {
        text: {
          en: "something's in the air, smell you later!",
          de: "ich kanns schon fast riechen!",
        },
      },
    ],
  },
  {
    id: "taste",
    type: "courses",
    get icon() {
      return {
        en: getImage("taste_en.png"),
        de: getImage("taste_en.png"),
      };
    },
    courses: [
      {
        text: {
          en: "it's on the tip of my tongue",
          de: "es liegt mir auf der zunge",
        },
      },
    ],
  },
  {
    id: "location",
    type: "info",
    get icon() {
      return {
        en: getImage("location_en.png"),
        de: getImage("location_en.png"),
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
        de: getImage("contact_en.png"),
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
        de: getImage("rent_en.png"),
      };
    },
    courses: [
      { text: { en: "rent our space", de: "raum mieten" }, link: "/rent" },
    ],
  },
];
