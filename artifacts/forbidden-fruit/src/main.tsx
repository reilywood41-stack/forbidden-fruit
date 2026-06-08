import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function hideLoader() {
  const loader = document.getElementById("initial-loader");
  if (!loader) return;
  loader.classList.add("done");
  setTimeout(() => loader.remove(), 450);
}

createRoot(document.getElementById("root")!).render(<App />);

// Hide loader immediately after render() is called — React will paint on next frame
hideLoader();
