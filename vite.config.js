import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/website-sinneskueche/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // If the module is inside node_modules
          if (id.includes("node_modules")) {
            // Put Firebase in its own chunk
            if (id.includes("firebase")) {
              return "vendor-firebase";
            }
            // Put icons in their own chunk
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            // Put Framer Motion in its own chunk (it's also quite heavy)
            if (id.includes("framer-motion")) {
              return "vendor-animation";
            }
            // All other third-party libraries go to 'vendor'
            return "vendor";
          }
        },
      },
    },
  },
});
