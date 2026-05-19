import { createRoot } from "react-dom/client";
import { registerLicense } from "@syncfusion/ej2-base";
import App from "./App";
import "./index.css";

// Unregister broken service workers that cause CacheStorage errors and 401 loops
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

registerLicense("Ngo9BigBOggjHTQxAR8/V1JGaF1cWmhIfEx1RHxQdld5ZFRHallYTnNWUj0eQnxTdENjW31ZcHFUQGVcVkF3WkleYQ==");

createRoot(document.getElementById("root")!).render(<App />);
