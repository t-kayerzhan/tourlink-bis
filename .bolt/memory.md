# Project memory

## Product intent & audience

- Travel/tour management platform with role-based access: admin, agency, tourist.
- Admins manage tours via a dedicated admin panel.
- Tourists browse tours; agencies have a separate role (scope not yet detailed).

## Brand personality & voice

- Helpful, direct, troubleshooting-oriented.
- Anticipates user confusion (e.g., wrong role signed in) and offers immediate next steps.

## Visual design & UX direction

- Admin panel layout: sidebar navigation with sections including "Tours."
- Tours page renders a table; each tour row has action buttons: Edit (pencil icon), Publish, Archive.
- Edit button positioned leftmost among row actions.
- Edit opens a full tour editor supporting: tour detail changes, viewing/deleting existing photos, uploading new photos.
- Role-gated UI: admin panel and Tours page visible only to admin-role users; tourists and agencies do not see them.

## Decisions, constraints & rationale

- Role-based access control enforced: only admin accounts can access admin panel → Tours.
- Tour editing is admin-only; photo management is integrated into the tour editor rather than a separate page.

## Open questions & assumptions

- Agency role capabilities and scope are unspecified.
- No confirmation whether the user was signed in as admin when they couldn't find the Edit button; assumed role mismatch.
- Framework noted as vite-react; further stack details (routing library, UI component library, backend/API) not yet confirmed.