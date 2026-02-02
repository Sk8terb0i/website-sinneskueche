// teammembers.js
const teamImages = import.meta.glob("../assets/team/*.png", {
  eager: true,
});

const getImage = (filename) => {
  const key = `../assets/team/${filename}`;
  return teamImages[key]?.default || "";
};

export const planets = [
  {
    id: "luca",
    type: "courses", // Places Luca on the outer orbit
    get icon() {
      return {
        en: getImage("luca_name.png"),
        de: getImage("luca_name.png"),
        base: getImage("luca.png"),
      };
    },
    courses: [{ text: { en: "horsing around", de: "pferdig mit den nerven" } }],
  },
  {
    id: "sonja",
    type: "courses",
    get icon() {
      return {
        en: getImage("sonja_name.png"),
        de: getImage("sonja_name.png"),
        base: getImage("sonja.png"),
      };
    },
    courses: [
      {
        text: {
          en: "horse sense is the thing a horse has",
          de: "pferdesinn ist das, was ein pferd hat",
        },
      },
    ],
  },
  {
    id: "lu",
    type: "courses",
    get icon() {
      return {
        en: getImage("lu_name.png"),
        de: getImage("lu_name.png"),
        base: getImage("lu.png"),
      };
    },
    courses: [
      {
        text: {
          en: "what the monkey considers business, the horse considers play",
          de: "hoppi gallopi",
        },
      },
    ],
  },
];
