# PlannerXchange RTQ Contract Notes

This file summarizes the PlannerXchange template guidance relevant to this risk tolerance questionnaire.

## Why this app is portable

The intended model is:

- read canonical household and client summary context from PlannerXchange
- save RTQ answers and score as builder-owned work product through the PlannerXchange app-data API
- render runtime branding and disclosure context supplied by PlannerXchange

That keeps the app aligned with `plannerxchange_portable` instead of inventing separate firm, user, or branding contracts.

## White-label rules

Source docs:

- `plannerxchange/branding-and-legal-api.md`
- `plannerxchange/context.md`
- `plannerxchange/publish-notes.md`

What matters for this project:

- request `branding.read` if the app renders branded chrome
- request `legal.read` if the app renders disclosure text or policy links
- use PlannerXchange-provided `logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `fontColor`, and `supportEmail`
- treat missing logo or favicon as a normal fallback case
- render `legal.disclosureText` exactly as returned

## Canonical reads

Source docs:

- `plannerxchange/data-contract.md`
- `plannerxchange/api-reference.md`

Routes and scopes used by the RTQ:

- `GET /canonical/households` with `canonical.household.read`
- `GET /canonical/households/{householdId}/clients` with `canonical.client.summary.read`

These routes are for respondent selection and firm-scoped context only. The current app does not need `canonical.client.sensitive.read`.

## Canonical household and client creation

Source docs:

- `plannerxchange/data-contract.md`
- `plannerxchange/context.md`

Current documented rule:

- PlannerXchange canonical data is read-only for builder apps in v1
- create, update, and delete of canonical records are documented as shell-owned workflows
- firms populate canonical data through PlannerXchange shell flows such as CSV import or manual entry

Practical implication for this RTQ:

- the app can safely read households and client summaries through the documented builder routes
- mock mode can simulate household/client creation for local product design
- live PlannerXchange household/client creation should not be wired until PlannerXchange exposes a builder-facing create contract or provides a shell handoff flow for apps

## App-data persistence

Source docs:

- `plannerxchange/app-data-api.md`
- `plannerxchange/api-reference.md`

RTQ responses should be saved as:

- `recordType`: `questionnaire_response`
- `status`: `draft` or `final`
- `schemaVersion`: `1`

Recommended payload fields:

- respondent name
- respondent role
- canonical household ID
- optional canonical client summary ID
- question/answer list
- total score
- normalized percentage
- risk band
- recommended allocation
- advisor notes
- completion timestamp

Required transport:

- `Authorization: Bearer {idToken}`
- `x-plannerxchange-app-installation-id: {appInstallationId}`

## Boundaries

- PlannerXchange owns authentication and top-level routing
- the app must not add its own sign-in, onboarding, invite, verification, or password flows
- `firmId` is the maximum data boundary
- builder-owned RTQ outputs are app-data, not canonical data
- canonical reference facts remain read-only

## Local development rule

This repository defaults to mock shell and mock API mode because localhost development does not naturally have a PlannerXchange session token.

To exercise live PlannerXchange routes locally, supply:

- `VITE_PX_API_BASE_URL`
- `VITE_PX_ID_TOKEN`

The dev host is pinned to `http://localhost:3001/`.
