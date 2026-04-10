import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { BrandingProfile, LegalProfile, PlannerXchangeManifest, ShellRuntimeContext } from "./plannerxchange";
import { MockBanner } from "./components/MockBanner";
import { BrandedHeader } from "./components/BrandedHeader";
import { AdvisorDashboard } from "./pages/AdvisorDashboard";
import { QuestionnaireEditor } from "./pages/QuestionnaireEditor";
import { RTQFlow } from "./pages/RTQFlow";
import { RTQReport } from "./pages/RTQReport";
import { fetchBranding, fetchLegal } from "./lib/pxApi";
import { initStore } from "./lib/store";

export function App({
  context,
}: {
  context: ShellRuntimeContext;
  manifest: PlannerXchangeManifest;
}) {
  initStore(context);

  // branding.read — resolved via fetchBranding (GET /branding/current).
  // Shell injects an initial value; we refresh from the API when live so the
  // app always renders the most current firm branding.
  const [branding, setBranding] = useState<BrandingProfile>(context.branding);

  // legal.read — resolved via fetchLegal (GET /legal/current).
  // Shell injects an initial value; refresh from the API when live.
  const [legal, setLegal] = useState<LegalProfile>(context.legal);

  useEffect(() => {
    fetchBranding(context).then(setBranding).catch(() => {/* fallback: keep shell-injected value */});
    fetchLegal(context).then(setLegal).catch(() => {/* fallback: keep shell-injected value */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inject brand CSS custom properties so any component can consume them.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", branding.primaryColor);
    root.style.setProperty("--brand-secondary", branding.secondaryColor ?? "#d9e1e8");
    root.style.setProperty("--brand-font", branding.fontColor ?? "#ffffff");
  }, [branding]);

  // Merge live branding/legal back into context so all child components
  // automatically receive the resolved values.
  const activeContext: ShellRuntimeContext = { ...context, branding, legal };

  // The shell-provided basename scopes all in-app routing to /apps/<slug>.
  // BrowserRouter (not MemoryRouter) is required so deep links and browser
  // history work correctly per the PlannerXchange builder checklist.
  return (
    <BrowserRouter basename={activeContext.appBasename}>
      {activeContext.publicationEnvironment === "dev" && <MockBanner />}

      {/*
        RTQ flow and report can be accessed by clients directly via invitation
        link. They get their own full-screen layout and do NOT show the advisor
        nav header.
      */}
      <Routes>
        <Route path="/rtq/:token" element={<RTQFlow context={activeContext} />} />
        <Route path="/report/:responseId" element={<RTQReport context={activeContext} />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <BrandedHeader branding={activeContext.branding} />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<AdvisorDashboard context={activeContext} />} />
                  <Route path="/settings" element={<QuestionnaireEditor context={activeContext} />} />
                </Routes>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
