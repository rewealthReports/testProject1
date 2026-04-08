# App Brief

## Problem

Advisors need a fast, branded, repeatable way to capture a client's risk tolerance without maintaining a separate questionnaire stack outside PlannerXchange.

## Initial user

`advisor_user`

The v1 workflow assumes an advisor facilitates the questionnaire, but the saved record structure is compatible with a future client-facing flow.

## Smallest useful v1

- select a household and respondent
- answer the RTQ in one sitting
- compute a risk band and model allocation tilt
- save the result as a PlannerXchange app-data `questionnaire_response` record

## Persistence choice

The app saves builder-owned work product in PlannerXchange app-data.

- canonical data used: household list and client summary reads
- app-owned work product: questionnaire answers, score, narrative, advisor notes, recommended review date

## Required scopes

- `tenant.read`
- `user.read`
- `branding.read`
- `legal.read`
- `canonical.household.read`
- `canonical.client.summary.read`
- `app_data.read`
- `app_data.write`

## White-label requirement

The app must inherit PlannerXchange runtime branding and disclosure text instead of hardcoding a single firm presentation layer.
