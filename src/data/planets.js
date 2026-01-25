// 1. Import both sets of images
const desktopImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});
const mobileImages = import.meta.glob("../assets/planets_mobile/*.png", {
  eager: true,
});

// 2. Helper to get the correct path with a fallback mechanism
const getImage = (filename, fallbackFilename = null) => {
  const isPortrait = window.innerWidth < window.innerHeight;
  const folder = isPortrait ? "planets_mobile" : "planets";
  const imageSet = isPortrait ? mobileImages : desktopImages;

  const key = `../assets/${folder}/${filename}`;
  const image = imageSet[key]?.default;

  // If the image exists, return it.
  if (image) return image;

  // If the image doesn't exist and we have a fallback, try to get the fallback
  if (fallbackFilename) {
    const fallbackKey = `../assets/${folder}/${fallbackFilename}`;
    return imageSet[fallbackKey]?.default || "";
  }

  return "";
};

// 3. Definition (Note: We use getters so the logic runs whenever the icon is accessed)
export const planets = [
  {
    id: "sight",
    type: "courses",
    get icon() {
      return { en: getImage("sight_en.png"), de: getImage("sight_de.png") };
    },
    get iconHover() {
      return {
        en: getImage("sight_hover_en.png"),
        de: getImage("sight_hover_de.png"),
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
      return { en: getImage("touch_en.png"), de: getImage("touch_de.png") };
    },
    get iconHover() {
      return {
        en: getImage("touch_hover_en.png"),
        de: getImage("touch_hover_de.png"),
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
      return { en: getImage("hearing_en.png"), de: getImage("hearing_de.png") };
    },
    get iconHover() {
      return {
        en: getImage("hearing_hover_en.png"),
        de: getImage("hearing_hover_de.png"),
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
      return { en: getImage("smell_en.png"), de: getImage("smell_de.png") };
    },
    get iconHover() {
      return {
        en: getImage("smell_hover_en.png"),
        de: getImage("smell_hover_de.png"),
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
      return { en: getImage("taste_en.png"), de: getImage("taste_de.png") };
    },
    get iconHover() {
      return {
        en: getImage("taste_hover_en.png"),
        de: getImage("taste_hover_de.png"),
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
      return { en: getImage("team_en.png"), de: getImage("team_de.png") };
    },
    courses: [
      { text: { en: "get to know us", de: "das sind wir" }, link: "/team" },
    ],
  },
  {
    id: "events",
    type: "info",
    get icon() {
      return { en: getImage("events_en.png"), de: getImage("events_de.png") };
    },
    courses: [
      { text: { en: "come back later :)", de: "komm später wieder :)" } },
    ],
  },
  {
    id: "contact",
    type: "action",
    get icon() {
      return { en: getImage("contact_en.png"), de: getImage("contact_de.png") };
    },
    courses: [
      { text: { en: "get in touch!", de: "melde dich!" }, link: "/contact" },
    ],
  },
  {
    id: "rent",
    type: "action",
    get icon() {
      return { en: getImage("rent_en.png"), de: getImage("rent_de.png") };
    },
    courses: [
      { text: { en: "rent our space", de: "raum mieten" }, link: "/rent" },
    ],
  },
];
