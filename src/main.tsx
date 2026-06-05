import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startIosEmojiReplacer } from "./utils/iosEmojis";

createRoot(document.getElementById("root")!).render(<App />);

if (typeof window !== "undefined") {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(startIosEmojiReplacer, 200);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(startIosEmojiReplacer, 200));
  }
}
