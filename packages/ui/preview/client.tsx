import { hydrateRoot } from "react-dom/client";
import { Preview, type PreviewData } from "./Preview";

declare global { interface Window { __PREVIEW__: PreviewData } }
hydrateRoot(document.getElementById("root")!, <Preview data={window.__PREVIEW__} />);
