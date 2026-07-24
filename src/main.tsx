import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/wire-one";
import { OnlineWorkshopApp } from "./OnlineWorkshopApp";
import "./index.css";
import "./online.css";
import "./community.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OnlineWorkshopApp />
  </StrictMode>,
);
