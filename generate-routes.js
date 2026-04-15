import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map your routes to their specific SEO data
const routes = [
  {
    path: "/pottery",
    title: "Pottery Tuesdays | Sinnesküche",
    description:
      "Join our Pottery Tuesdays in Schlieren. All skill levels welcome for creative clay workshops.",
  },
  {
    path: "/singing",
    title: "Vocal Coaching",
    description:
      "Discover your voice with our Vocal Coaching sessions in Schlieren.",
  },
  {
    path: "/artistic-vision",
    title: "Artistic Vision",
    description:
      "Explore and expand your creative horizons with our Artistic Vision workshops.",
  },
  {
    path: "/get-ink",
    title: "Get Ink!",
    description:
      "Dive into the world of drawing and inking at the Sinnesküche.",
  },
  {
    path: "/extended-voice-lab",
    title: "Extended Voice Lab",
    description: "Push your vocal boundaries in our Extended Voice Lab.",
  },
  {
    path: "/performing-words",
    title: "Performing Words",
    description: "Creative writing and spoken word workshops in Schlieren.",
  },
  {
    path: "/singing-basics",
    title: "Singing Basics Weekend",
    description: "A weekend workshop dedicated to the fundamentals of singing.",
  },
  {
    path: "/team",
    title: "Team",
    description:
      "Meet the creative minds behind the Sinnesküche community space.",
  },
  {
    path: "/location",
    title: "Location",
    description: "How to find the Sinnesküche studio in Schlieren, Zurich.",
  },
  {
    path: "/contact",
    title: "Contact",
    description: "Get in touch with the Sinnesküche team.",
  },
  {
    path: "/rent",
    title: "Rent our Space",
    description:
      "Rent our creative community space in Schlieren for your next event or workshop.",
  },
];

const distDir = path.resolve(__dirname, "dist");
const indexHtmlPath = path.join(distDir, "index.html");

if (fs.existsSync(indexHtmlPath)) {
  const baseHtml = fs.readFileSync(indexHtmlPath, "utf-8");

  routes.forEach((route) => {
    const folderPath = path.join(distDir, route.path.substring(1));

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Replace the generic SEO tags with the route-specific ones
    let customHtml = baseHtml;
    const pageUrl = `https://sinneskueche.ch${route.path}`;

    // Standard HTML Metadata
    customHtml = customHtml.replace(
      /<title>.*?<\/title>/gi,
      `<title>${route.title}</title>`,
    );
    customHtml = customHtml.replace(
      /<meta name="title" content=".*?">/gi,
      `<meta name="title" content="${route.title}">`,
    );
    customHtml = customHtml.replace(
      /<meta name="description" content=".*?">/gi,
      `<meta name="description" content="${route.description}">`,
    );

    // Open Graph / Facebook
    customHtml = customHtml.replace(
      /<meta property="og:title" content=".*?">/gi,
      `<meta property="og:title" content="${route.title}">`,
    );
    customHtml = customHtml.replace(
      /<meta property="og:description" content=".*?">/gi,
      `<meta property="og:description" content="${route.description}">`,
    );
    customHtml = customHtml.replace(
      /<meta property="og:url" content=".*?">/gi,
      `<meta property="og:url" content="${pageUrl}">`,
    );

    // Twitter
    customHtml = customHtml.replace(
      /<meta property="twitter:title" content=".*?">/gi,
      `<meta property="twitter:title" content="${route.title}">`,
    );
    customHtml = customHtml.replace(
      /<meta property="twitter:description" content=".*?">/gi,
      `<meta property="twitter:description" content="${route.description}">`,
    );
    customHtml = customHtml.replace(
      /<meta property="twitter:url" content=".*?">/gi,
      `<meta property="twitter:url" content="${pageUrl}">`,
    );

    // Write the injected HTML file into the route's folder
    fs.writeFileSync(path.join(folderPath, "index.html"), customHtml);
  });

  console.log("Static SEO route folders generated with custom meta tags");
} else {
  console.error("index.html not found in dist folder. Build might have failed");
}
