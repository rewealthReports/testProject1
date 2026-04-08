import { createMockRuntimeContext } from "./dev-context";
import { mount } from "./plugin";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container.");
}

void Promise.resolve(mount(createMockRuntimeContext(container)));
