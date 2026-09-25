# PMOCore Solo MVP v1.0 — Requirements

## Purpose

PMOCore is a multi-project project-management tracking and traceability system. The Solo MVP enables a single operational Project Manager to manage real projects from planning and requirements through meetings/visits, actions, testing, release, delivery, and formal acceptance by **October 13, 2026**. It replaces or improves the current spreadsheet-based PM tracking workflow.

This specification defines product requirements only. It builds on the accepted AUTH-01 foundation and does not replace its infrastructure, security, responsive, API-response, testing, or configuration requirements.

## Scope and Principles

The Solo MVP has one authenticated operational user. It does not include multi-PM administration, invitations, participant management, or granular permissions. Nevertheless, no Solo MVP requirement may knowingly require destructive redesign before project ownership, membership, Assistant PM, Contributor, Viewer, invitations, and project-level authorization can be added later.

PMOCore traceability is centered on these relationships, which are not required to be strictly linear:

```text
Project -> Plan / Work Item -> Requirement -> Meeting / Visit -> Action / RAID
                                      -> Test / Defect -> Release -> Acceptance
```

Where a relationship is required, the product shall use a real relationship or identifier rather than relying solely on manually typed IDs in notes. The MVP does not require a generic graph engine.

## Authentication and Session

**SOLOMVP-REQ-001** — The product SHALL provide an authentication/login flow for the single operational user.

**SOLOMVP-REQ-002** — Unauthenticated users SHALL be prevented from accessing PMOCore operational records and workflows.

**SOLOMVP-REQ-003** — The authenticated user SHALL be able to end their session through a logout action.

**SOLOMVP-REQ-004** — The authentication model SHALL preserve an identity that can be associated with records created or updated by the authenticated user.

**SOLOMVP-REQ-005** — The Solo MVP SHALL NOT require invitation, role-management, membership-management, or granular project-permission user interfaces.

## Dashboard

**SOLOMVP-REQ-006** — The dashboard SHALL present operational visibility derived from PMOCore project records rather than requiring a separate manual reporting surface.

**SOLOMVP-REQ-007** — The dashboard SHALL show, per project or in an aggregate view as appropriate, the system/project name, current phase, overall status, health, and plan progress percentage where plan data exists.

**SOLOMVP-REQ-008** — The dashboard SHALL show open requirements, open actions, overdue actions, open issues, and failed tests for the relevant project or aggregate scope when those records exist.

**SOLOMVP-REQ-009** — The dashboard SHALL show the next milestone, target date, last activity, and PM remarks where applicable and available.

**SOLOMVP-REQ-010** — Dashboard measures SHALL clearly represent unavailable or not-yet-recorded data without presenting it as a completed or healthy state.

**SOLOMVP-REQ-011** — The Solo MVP dashboard SHALL NOT require configurable BI dashboards, predictive analytics, AI, or custom report building.

## Projects and Project Overview

**SOLOMVP-REQ-012** — The user SHALL be able to create, view, and update a project.

**SOLOMVP-REQ-013** — Each project SHALL have a stable project identifier, name, summary or description, lifecycle phase, overall status, health, target date(s), and remarks fields where applicable.

**SOLOMVP-REQ-014** — Each project SHALL be traceable to its records, including work items, requirements, activities, RAID records, tests, defects, releases, acceptance, documents, and attachments where those records are created.

**SOLOMVP-REQ-015** — A project record SHALL preserve ownership-ready information sufficient to support later project ownership and membership without requiring the Solo MVP to expose a membership UI.

**SOLOMVP-REQ-016** — The user SHALL be able to archive a project without deleting its retained operational records; archived projects SHALL be visibly distinguishable from active projects.

**SOLOMVP-REQ-017** — The Project Overview SHALL present the project phase, status, health, progress, important dates or milestones, and recent activity.

**SOLOMVP-REQ-018** — The Project Overview SHALL summarize open requirements, actions, issues, testing state, and release/acceptance state when relevant data exists.

## Project Plan / Work Items

**SOLOMVP-REQ-019** — The product SHALL support project plan/work-item records using the practical BASC tracking model as a conceptual baseline.

**SOLOMVP-REQ-020** — A work item SHALL support a stable work-item ID, project relationship, phase, module or workstream, deliverable/task, and description.

**SOLOMVP-REQ-021** — A work item SHALL support owner, planned start/end, actual start/end, percentage complete, status, priority, dependency, remarks, and last-updated information where applicable.

**SOLOMVP-REQ-022** — A work item SHALL support a relationship to a requirement and an evidence or document reference where applicable; these relationships shall not require duplicating the related record's full text.

**SOLOMVP-REQ-023** — Work-item progress shown in project-level views SHALL be derived from recorded work-item data where practical.

## Requirements Management

**SOLOMVP-REQ-024** — The product SHALL support requirements from being raised through validation, acceptance, or another appropriate terminal state.

**SOLOMVP-REQ-025** — A requirement SHALL support a stable requirement ID, project relationship, module, date raised, source/end user, requirement statement, and acceptance criteria.

**SOLOMVP-REQ-026** — A requirement SHALL support requirement type, priority, assignee, status, target release, change-request indicator, validation/evidence, remarks, and last-updated information where applicable.

**SOLOMVP-REQ-027** — A requirement SHALL support a relationship to one or more work items where applicable.

**SOLOMVP-REQ-028** — Requirement status shall make the current lifecycle state visible and shall not require the user to infer acceptance from free-text notes alone.

## Meetings & Visits

**SOLOMVP-REQ-029** — The product SHALL support Meetings & Visits as a P0 Solo MVP capability.

**SOLOMVP-REQ-030** — Meetings & Visits SHALL support activity types including Meeting, Site Visit, Release Demo, Workshop, Training, UAT, and Support Visit, while allowing the activity type to be recorded clearly.

**SOLOMVP-REQ-031** — A Meeting/Visit SHALL support a stable activity ID, date, activity type, project relationship, location or mode, and end-user/attendee information.

**SOLOMVP-REQ-032** — A Meeting/Visit SHALL support agenda, discussion/findings, outputs/decisions, to-do summary, minutes/document reference, prepared-by identity where available, and last-updated information.

**SOLOMVP-REQ-033** — A Meeting/Visit SHALL support related action items, action owner, due date, status, and next-schedule information where applicable.

**SOLOMVP-REQ-034** — The product SHALL permit a Meeting/Visit to create or relate to follow-up Action/RAID records without requiring duplicate manual entry of common contextual information where a later design can reasonably avoid it.

## Meetings & Visits Attachments

**SOLOMVP-REQ-035** — A Meeting/Visit SHALL support attachment of multiple files and images directly to that activity.

**SOLOMVP-REQ-036** — On supported client devices and browsers, the user SHALL be able to select one or more images from the device/gallery for a Meeting/Visit attachment.

**SOLOMVP-REQ-037** — On supported client devices and browsers, the user SHALL be able to capture a photo using the device camera and attach it to a Meeting/Visit without requiring a native PMOCore mobile application.

**SOLOMVP-REQ-038** — A Meeting/Visit SHALL display attachment information sufficient to identify the attached file or image and shall support opening/viewing supported attachments and downloading files where applicable.

**SOLOMVP-REQ-039** — The user SHALL be able to remove a Meeting/Visit attachment while its parent record remains editable.

**SOLOMVP-REQ-040** — Each attachment SHALL preserve its association with its project and parent Meeting/Visit and shall retain upload timestamp and uploader identity where available.

**SOLOMVP-REQ-041** — The product SHALL enforce configured file-size and file-type constraints and shall safely report rejected or invalid uploads.

**SOLOMVP-REQ-042** — Attachment handling SHALL not permit user-controlled server filesystem paths.

**SOLOMVP-REQ-043** — Meetings & Visits, including attachment selection and supported camera capture, SHALL remain usable on mobile devices.

## Actions & RAID

**SOLOMVP-REQ-044** — The product SHALL support a unified project record model for Actions, Risks, Issues, Decisions, Dependencies, and Change Requests (RAID).

**SOLOMVP-REQ-045** — A RAID record SHALL support a stable record ID, project relationship, record type, source activity, date raised, description, impact, and owner.

**SOLOMVP-REQ-046** — A RAID record SHALL support probability where applicable, severity/priority, due date, status, mitigation/required action, decision/resolution, closed date, evidence, and remarks where applicable.

**SOLOMVP-REQ-047** — A RAID record SHALL support relationships to a requirement and release where applicable.

**SOLOMVP-REQ-048** — Overdue state and age/days open SHALL be derived from relevant dates and status where practical rather than requiring duplicate manually maintained state.

## Testing & Defects

**SOLOMVP-REQ-049** — The product SHALL support test records and defect tracking for relevant stages including SIT and UAT where applicable.

**SOLOMVP-REQ-050** — A test record SHALL support a stable test ID, project relationship, module, related requirement, test stage, scenario, expected result, actual result, tester, test date, result, status, evidence, and remarks.

**SOLOMVP-REQ-051** — A defect record or defect information associated with a test SHALL support a defect reference, description, severity, assignee, target fix date, fix version, retest date, and retest result where applicable.

**SOLOMVP-REQ-052** — The product SHALL support Requirement -> Test -> Defect -> Retest traceability without requiring every test to have a defect.

**SOLOMVP-REQ-053** — Failed-test counts displayed in operational views shall be derived from recorded test results where practical.

## Releases & Acceptance

**SOLOMVP-REQ-054** — The product SHALL support PM operational tracking of releases, deployment, delivery, and acceptance; it SHALL NOT require a CI/CD deployment platform.

**SOLOMVP-REQ-055** — A release SHALL support a stable release ID, project relationship, version, release date, environment, release scope, deployment status, demo date, UAT date/result, delivery date, training/turnover date, and remarks where applicable.

**SOLOMVP-REQ-056** — A release SHALL support relationships to included requirements and included defects.

**SOLOMVP-REQ-057** — Acceptance information SHALL support acceptance status, acceptance date, accepted-by, acceptance certificate/document reference, and handover notes where applicable.

**SOLOMVP-REQ-058** — The product SHALL support traceability from requirements and defects into a release and from a release through acceptance.

## Documents / Basic Attachments

**SOLOMVP-REQ-059** — The product SHALL support basic project document tracking without becoming a full enterprise document-management system.

**SOLOMVP-REQ-060** — A document record SHALL support a stable document ID, project relationship, phase, document type, title, version, owner, document date, status, file/link reference, related record, and remarks where applicable.

**SOLOMVP-REQ-061** — The attachment capability shall be reusable by document records and future record types; Meetings & Visits attachment/gallery/camera capability remains mandatory for the October 13 Solo MVP.

## Search, Filter, Status, and Record States

**SOLOMVP-REQ-062** — Operational list screens SHALL provide search, filtering, and status visibility appropriate to the record type.

**SOLOMVP-REQ-063** — Operational list screens SHALL provide sorting where materially useful to practical PM work, such as dates, status, priority, or overdue state.

**SOLOMVP-REQ-064** — Operational screens SHALL provide clear empty, loading, and error states.

**SOLOMVP-REQ-065** — The Solo MVP SHALL NOT require advanced saved views, configurable report builders, or extensive user-configurable column systems.

## Responsive Operation

**SOLOMVP-REQ-066** — Building on AUTH01-REQ-070 through AUTH01-REQ-073, Solo MVP workflows SHALL remain usable on desktop, tablet, and mobile form factors.

**SOLOMVP-REQ-067** — Critical PM workflows, including creating and editing Meetings & Visits and adding supported attachments, SHALL NOT require desktop-only interaction.

## Traceability and Operational Metadata

**SOLOMVP-REQ-068** — The product SHALL support Meeting/Visit -> Action relationships.

**SOLOMVP-REQ-069** — The product SHALL support Requirement -> Work Item relationships.

**SOLOMVP-REQ-070** — The product SHALL support Requirement -> Test relationships.

**SOLOMVP-REQ-071** — The product SHALL support Test -> Defect relationships.

**SOLOMVP-REQ-072** — The product SHALL support Requirement/Defect -> Release relationships.

**SOLOMVP-REQ-073** — The product SHALL support Release -> Acceptance relationships.

**SOLOMVP-REQ-074** — Business records SHALL preserve created and updated timestamps and creator/updater identity where the authentication model supports that information.

## Future Multi-User Readiness and Deferred Scope

**SOLOMVP-REQ-075** — The Solo MVP project and record model SHALL preserve a non-destructive path to future project ownership, membership, project-specific access checks, multiple Project Managers, and Assistant PM, Contributor, and Viewer roles.

**SOLOMVP-REQ-076** — Future multi-user APIs shall independently verify project access and applicable permissions; the Solo MVP does not authorize a membership or detailed-permission interface.

**SOLOMVP-REQ-077** — The following are explicitly deferred beyond the October 13 Solo MVP: multi-PM functionality, invitations, Assistant PM/Contributor/Viewer management, detailed project permissions, full Client Management, dedicated Production Support, dedicated Calendar, Travel, advanced reports/analytics, advanced saved views, configurable workflow engine, AI functionality, Pablo integration, and a native mobile application.

## Out of Scope for This Specification

This specification does not prescribe database schema, API endpoints, UI layouts, storage providers, attachment storage implementation, architecture/design, implementation tasks, migrations, dependency changes, or application code. Those require separately authorized work.
