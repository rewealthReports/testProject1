# RTQ Data Contract

## Canonical reads

The questionnaire is portable because it attaches work product to PlannerXchange firm context instead of inventing a parallel identity model.

Routes used:

- `GET /canonical/households`
- `GET /canonical/households/{householdId}/clients`

Scopes used:

- `canonical.household.read`
- `canonical.client.summary.read`

## Work-product writes

Completed questionnaires are written through the PlannerXchange app-data API as `questionnaire_response` records.

Route:

- `POST /app-data`

Required headers:

- `Authorization: Bearer {idToken}`
- `x-plannerxchange-app-installation-id: {appInstallationId}`

Record direction for this app:

- `recordType`: `questionnaire_response`
- `schemaVersion`: `1`
- `status`: `final`
- `householdId`: selected canonical household
- `payload.respondentClientId`: optional selected canonical client summary ID
- `sourceRefs`: `canonical_household`, optional `canonical_client`, and `manual_entry`

The app does not mutate canonical household or client records.
