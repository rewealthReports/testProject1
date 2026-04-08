# PlannerXchange Context

This RTQ follows the PlannerXchange shell contract described in [docs/plannerxchange-template](/c:/Users/dkenn/OneDrive%20-%20REWealth%20Financial%20Planning/Desktop/Desktop/REWealthReports/testProject1/docs/plannerxchange-template).

Builder assumptions for this repo:

- PlannerXchange owns auth, tenant resolution, firm context, top-level routing, branding, and disclosure merging
- the app should mount as a plugin and must not add its own login, invite redemption, password, or onboarding flow
- the manifest `entryPoint` stays source-oriented as `src/plugin.tsx`
- the build must emit `dist/plannerxchange.publish.json`
- runtime branding and disclosure text come from shell context or governed APIs, not hardcoded assets

Local development intentionally uses mock shell context and a mock RTQ gateway unless both `VITE_PX_API_BASE_URL` and `VITE_PX_ID_TOKEN` are present.
