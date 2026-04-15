import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// These are all the URLs you want Google to index properly
const routes = [
  "/pottery",
  "/singing",
  "/artistic-vision",
  "/extended-voice-lab",
  "/performing-words",
  "/singing-basics",
  "/get-ink",
  "/team",
  "/location",
  "/contact",
  "/rent",
];

const distDir = path.resolve(__dirname, "dist");
const indexHtmlPath = path.join(distDir, "index.html");

if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");

  routes.forEach((route) => {
    // Remove the leading slash to create the folder name
    const folderPath = path.join(distDir, route.substring(1));

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Drop a copy of index.html into that folder
    fs.writeFileSync(path.join(folderPath, "index.html"), indexHtml);
  });

  console.log("✅ Static SEO route folders generated successfully!");
} else {
  console.error(
    "❌ index.html not found in dist folder. Build might have failed.",
  );
}
