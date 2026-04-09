import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { PlannerXchangeManifest, ShellRuntimeContext } from "./plannerxchange";
import { MockBanner } from "./components/MockBanner";
import { BrandedHeader } from "./components/BrandedHeader";
import { AdvisorDashboard } from "./pages/AdvisorDashboard";
import { QuestionnaireEditor } from "./pages/QuestionnaireEditor";
import { RTQFlow } from "./pages/RTQFlow";
import { RTQReport } from "./pages/RTQReport";

export function App({
  context,
}: {
  context: ShellRuntimeContext;
  manifest: PlannerXchangeManifest;
}) {
  // Inject brand CSS custom properties so any component can consume them.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", context.branding.primaryColor);
    root.style.setProperty("--brand-secondary", context.branding.secondaryColor ?? "#d9e1e8");
    root.style.setProperty("--brand-font", context.branding.fontColor ?? "#ffffff");
  }, [context.branding]);

  // The shell-provided basename scopes all in-app routing to /apps/<slug>.
  // BrowserRouter (not MemoryRouter) is required so deep links and browser
  // history work correctly per the PlannerXchange builder checklist.
  return (
    <BrowserRouter basename={context.appBasename}>
      {context.publicationEnvironment === "dev" && <MockBanner />}

      {/*
        RTQ flow and report can be accessed by clients directly via invitation
        link. They get their own full-screen layout and do NOT show the advisor
        nav header.
      */}
      <Routes>
        <Route path="/rtq/:token" element={<RTQFlow context={context} />} />
        <Route path="/report/:responseId" element={<RTQReport context={context} />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <BrandedHeader branding={context.branding} />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<AdvisorDashboard context={context} />} />
                  <Route path="/settings" element={<QuestionnaireEditor context={context} />} />
                </Routes>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
