# SHAP UI/UX Polish Audit

## Scope

Reviewed the rendered public shell and login route in the local Vite app, then
audited the shared dashboard shell and reusable primitives used by patient,
doctor, organization, administrator, search, table, form, and emergency flows.

## Findings

- The product identity is clear and the indigo/navy palette is appropriate for
  a healthcare operations platform.
- The same visual emphasis was repeated too often: large radii, strong shadows,
  gradient action treatments, and animated status dots.
- Dashboard content padding was slightly generous on laptop widths, reducing
  usable information density.
- Shared buttons carried shadows even when the action was routine.
- Status badges were a little wider and heavier than necessary for tables and
  operational lists.
- Emergency navigation was animated in the persistent sidebar, competing with
  the actual emergency workflow.
- The global header tagline used marketing language where a product descriptor
  is more useful in an authenticated workspace.
- Focus styles and reduced-motion handling were already present and were
  preserved.

## Changes implemented

- Added a shared `app-main` shell hook and tightened dashboard content padding.
- Standardized oversized `rounded-3xl` surfaces to a restrained 12px radius.
- Reduced modal/overlay shadow intensity while retaining depth and separation.
- Removed routine button shadows from the shared `Button` primitive.
- Tightened shared badge padding for denser, more scannable tables.
- Kept emergency color semantics but removed persistent sidebar pulsing.
- Replaced the authenticated header tagline with a descriptive product label
  and added an accessible label to the profile menu trigger.
- Preserved existing routes, APIs, authentication, role navigation, maps, and
  emergency state behavior.

## Deliberately not changed

- Emergency workflow states, GPS/location controls, destination selection,
  resource reservation logic, or Emergency Beep behavior.
- Backend APIs, data models, or business rules.
- Existing page-specific gradients where they are part of an emergency signal,
  map visualization, or public landing illustration rather than a routine
  control.
