# Risk Tolerance Questionnaire

This repository is a PlannerXchange-ready risk tolerance questionnaire starter for local development and future governed publication.

It does three things from day one:

- mounts as a PlannerXchange plugin with a source-oriented `entryPoint`
- renders with runtime branding and disclosure data instead of hardcoded firm chrome
- saves questionnaire outputs as PlannerXchange app-data `questionnaire_response` records instead of inventing a separate persistence contract

## Local development

1. Run `npm install`
2. Run `npm run dev`
3. Open `http://localhost:3001/`

The Vite dev host is pinned to port `3001` and will fail fast instead of falling back to `8000`, `8080`, or `5173`.

By default the app runs in a mock PlannerXchange mode so it can be developed outside the shell. If you have a live PlannerXchange API base URL and an active session token, copy `.env.example` to `.env` and set:

- `VITE_PX_API_BASE_URL`
- `VITE_PX_ID_TOKEN`

With both values present, the app will call the documented PlannerXchange routes directly.

## PlannerXchange alignment

- Manifest: [plannerxchange.app.json](/c:/Users/dkenn/OneDrive%20-%20REWealth%20Financial%20Planning/Desktop/Desktop/REWealthReports/testProject1/plannerxchange.app.json)
- App brief: [plannerxchange/app-brief.md](/c:/Users/dkenn/OneDrive%20-%20REWealth%20Financial%20Planning/Desktop/Desktop/REWealthReports/testProject1/plannerxchange/app-brief.md)
- RTQ contract notes: [docs/plannerxchange-rtq-contracts.md](/c:/Users/dkenn/OneDrive%20-%20REWealth%20Financial%20Planning/Desktop/Desktop/REWealthReports/testProject1/docs/plannerxchange-rtq-contracts.md)
- Source documentation clone: [docs/plannerxchange-template](/c:/Users/dkenn/OneDrive%20-%20REWealth%20Financial%20Planning/Desktop/Desktop/REWealthReports/testProject1/docs/plannerxchange-template)

The production build emits `dist/plannerxchange.publish.json`, which PlannerXchange uses to resolve the source `entryPoint` to the compiled asset it will host.
