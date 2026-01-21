// Dynamically import all images in the folder
const planetImages = import.meta.glob("../assets/planets/*.png", {
  eager: true,
});

// Helper to get the imported image path by filename
const getImage = (filename) => {
  const key = `../assets/planets/${filename}`;
  return planetImages[key]?.default || "";
};

export const planets = [
  {
    id: "sight",
    type: "courses",
    icon: { en: getImage("sight_en.png"), de: getImage("sight_de.png") },
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
    icon: { en: getImage("touch_en.png"), de: getImage("touch_de.png") },
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
    icon: { en: getImage("hearing_en.png"), de: getImage("hearing_de.png") },
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
    icon: { en: getImage("smell_en.png"), de: getImage("smell_de.png") },
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
    icon: { en: getImage("taste_en.png"), de: getImage("taste_de.png") },
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
    icon: { en: getImage("location_en.png"), de: getImage("location_de.png") },
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
    icon: { en: getImage("team_en.png"), de: getImage("team_de.png") },
    courses: [
      { text: { en: "get to know us", de: "das sind wir" }, link: "/team" },
    ],
  },
  {
    id: "events",
    type: "info",
    icon: { en: getImage("events_en.png"), de: getImage("events_de.png") },
    courses: [
      { text: { en: "come back later :)", de: "komm später wieder :)" } },
    ],
  },
  {
    id: "contact",
    type: "action",
    icon: { en: getImage("contact_en.png"), de: getImage("contact_de.png") },
    courses: [
      { text: { en: "get in touch!", de: "melde dich!" }, link: "/contact" },
    ],
  },
  {
    id: "rent",
    type: "action",
    icon: { en: getImage("rent_en.png"), de: getImage("rent_de.png") },
    courses: [
      { text: { en: "rent our space", de: "raum mieten" }, link: "/rent" },
    ],
  },
];
