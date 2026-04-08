# Publish Notes

Before linking this repository in PlannerXchange:

1. Confirm [plannerxchange.app.json](/c:/Users/dkenn/OneDrive%20-%20REWealth%20Financial%20Planning/Desktop/Desktop/REWealthReports/testProject1/plannerxchange.app.json) still matches the shipped app.
2. Keep scopes minimal. Do not add sensitive client-data scopes unless the RTQ actually needs them.
3. Run `npm run build`.
4. Commit the generated `dist/` directory, including `dist/plannerxchange.publish.json`.
5. Verify the app still renders correctly with missing logo and favicon values.
6. Verify the disclosure block still renders from PlannerXchange legal context.

Governance reminders:

- do not create custom auth UX
- do not store PX canonical data in long-lived browser storage
- do not export PX client data to third-party AI or analytics systems
- keep RTQ persistence inside PlannerXchange app-data or another clearly nonportable app-owned path
