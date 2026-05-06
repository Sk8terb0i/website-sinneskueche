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
    type: "courses",
    get icon() {
      return {
        en: getImage("luca_name.png"),
        de: getImage("luca_name.png"),
        base: getImage("luca.png"),
      };
    },
    pronouns: {
      de: "es/they/keine Pronomen",
      en: "they/them",
    },
    bio: {
      de: [
        {
          q: "Wer bist du?",
          a: "Ich erzähle Geschichten als genderfluide Künstler*in, Journalist*in und Lehrer*in. Hinter den sieben Bergen im Kanton Schwyz aufgewachsen, bin ich heute in Zürich zu Hause. Hier realisiere ich meine Projekte, für die die Devise gilt: Je mehr Sinne sie ansprechen, desto besser! Ich bin im Herzen Minimalist*in, doch komplett dem Maximalismus verfallen. Keine Idee ist zu gross, und zum Glück werde ich von meinen lieben Mitmenschen immer mal wieder aus den kreativen Wolken auf den Boden der Tatsachen geholt.",
        },
        {
          q: "Was kreierst du?",
          a: "Meine Stimme und mein Körper sind meine primären Medien. An der Hochschule Luzern habe ich Jazzgesang und Music & Art Performance studiert und realisiere heute gerne kleine Gesamtkunstwerke, die meist in Form von Konzerten stattfinden. Meine Töpferkunst ist nicht ganz so ausgefeilt wie meine Klänge, aber nicht weniger verspielt, organisch und queer. Ich schreibe auch sehr gerne Texte und arbeite mit Textilien.",
        },
        {
          q: "Was setzt du in der Sinnesküche um?",
          a: "2024 habe ich dieses Atelier an der Sägestrasse in Schlieren zu meinem kreativen Zuhause gemacht – ursprünglich, um meine eigenen Projekte zu realisieren, mit Bands zu proben und Gesangsunterricht anzubieten. Doch der Raum bietet unendlich viele Möglichkeiten, und so ist daraus auch ein Töpferstudio und ein Kurslokal entstanden. Nun ist die Sinnesküche ein Atelier für alle, in dem man Techniken lernen kann, um die Sinne zu nähren, und sich Zeit nimmt, bewusst wahrzunehmen.\nIch leite hier die Gesangsküche, arbeite in der Töpferküche mit und gebe diverse Wochenend-Workshops.",
        },
      ],
      en: [
        {
          q: "Who are you?",
          a: "I tell stories as a genderfluid artist, journalist, and teacher. I grew up “beyond the seven mountains” in the canton of Schwyz, and today I call Zurich my home. This is where I bring my projects to life, guided by one principle: the more senses they engage, the better. At heart, I’m a minimalist—yet completely devoted to maximalism. No idea is too big, and luckily, the people around me occasionally bring me back down from my creative clouds to solid ground.",
        },
        {
          q: "What do you create?",
          a: "My voice and my body are my primary mediums. I studied jazz vocals and Music & Art Performance at the Lucerne University of Applied Sciences and Arts, and today I love creating small “total works of art,” usually in the form of concerts. My ceramics may not be quite as refined as my sound, but they are just as playful, organic, and queer. I also enjoy writing texts and working with textiles.",
        },
        {
          q: "What do you realize in the Sinnesküche?",
          a: "In 2024, I turned this studio on Sägestrasse in Schlieren into my creative home—originally to realize my own projects, rehearse with bands, and offer vocal lessons. But the space holds endless possibilities, and so it has also grown into a ceramics studio and a workshop venue. Now, the Sinnesküche is a space for everyone—a studio where people can learn techniques to nourish the senses and take time to perceive more consciously.\nHere, I lead the “voice kitchen,” collaborate in the “ceramics kitchen,” and facilitate various weekend workshops.",
        },
      ],
    },

    links: [
      {
        label: { de: "lucakoch.ch", en: "lucakoch.com" },
        url: { de: "https://www.lucakoch.ch", en: "https://www.lucakoch.ch" },
      },
      { label: "Instagram", url: "https://www.instagram.com/luca_koch" },
      { label: "TikTok", url: "https://www.tiktok.com" },
    ],

    courses: [
      {
        text: {
          en: "horsing around",
          de: "pferdig mit den nerven",
        },
      },
    ],
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
  {
    id: "gini",
    type: "courses",
    get icon() {
      return {
        en: getImage("gini_name.png"),
        de: getImage("gini_name.png"),
        base: getImage("gini.png"),
      };
    },
    courses: [
      {
        text: {
          en: "out galloping",
          de: "suche sonnenuntergang für abendgallop",
        },
      },
    ],
  },
  {
    id: "noe",
    type: "courses",
    get icon() {
      return {
        en: getImage("noe_name.png"),
        de: getImage("noe_name.png"),
        base: getImage("noe.png"),
      };
    },
    pronouns: {
      de: "er/ihm",
      en: "he/him",
    },
    bio: {
      de: [
        {
          q: "Wer bist du?",
          a: "Konzeptionell bin ich ein Horse; künstlerisch eine Identitätskrise. Ich habe Game Design studiert...",
        },
        {
          q: "Was kreierst du?",
          a: "Wenn es für mich nach Spass klingt, erschaffe ich es...",
        },
        {
          q: "Was setzt du in der Sinnesküche um?",
          a: "Ich habe die Webseite gemacht :) und stärke meinen Horse-sinn.",
        },
      ],
      en: [
        {
          q: "Who are you?",
          a: "Conceptually, I’m a horse; artistically, an identity crisis. I studied game design...",
        },
        {
          q: "What do you create?",
          a: "If it sounds fun to me, I will create it...",
        },
        {
          q: "What do you realize in the Sinnesküche?",
          a: "I created this website :) and work on strengthening my horse sense.",
        },
      ],
    },
    links: [
      {
        label: "streaming-web.design",
        url: "https://www.streaming-web.design",
      },
      { label: "noearnold.com", url: "https://noearnold.com" },
      { label: "Instagram", url: "https://www.instagram.com/noe.arnold/" },
    ],

    courses: [
      {
        text: {
          en: "horse (conceptual)",
          de: "horse (konzeptionell)",
        },
      },
    ],
  },
];
