import { createRoot, type Root } from "react-dom/client";
import manifestJson from "../plannerxchange.app.json";
import { App } from "./App";
import type {
  PlannerXchangeManifest,
  PlannerXchangePluginModule,
  ShellRuntimeContext
} from "./plannerxchange";
import "./styles.css";

const manifest = manifestJson as PlannerXchangeManifest;

let root: Root | null = null;
let activeContainer: HTMLElement | null = null;

export function mount(context: ShellRuntimeContext): void {
  const container = context.containerElement ?? document.getElementById("root");

  if (!container) {
    throw new Error("Missing PlannerXchange mount container.");
  }

  if (activeContainer && activeContainer !== container) {
    root?.unmount();
    root = null;
  }

  if (!root) {
    root = createRoot(container);
    activeContainer = container;
  }

  root.render(<App context={context} manifest={manifest} />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
  activeContainer = null;
}

export const pluginModule: PlannerXchangePluginModule = {
  manifest,
  mount,
  unmount
};

export { manifest };
