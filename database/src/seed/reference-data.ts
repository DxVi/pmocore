/**
 * Initial reference data (SOLO-MVP-01 design §6.2, approved seq. 00011).
 *
 * - Approved BASC values are seeded exactly, in the approved order.
 * - TEST_STAGE values are taken from REQ-049 (SIT, UAT).
 * - HEALTH is a documented provisional default (RAG) pending Project Leadership confirmation.
 * - REQUIREMENT_TYPE, ACTIVITY_MODE, PROBABILITY and DOCUMENT_TYPE are genuinely missing
 *   and intentionally have no values; their fields are optional until values are supplied.
 *
 * Values are only ever added or deactivated — never deleted or re-coded — so existing
 * records keep resolving their labels.
 */
export type ReferenceSeedValue = {
  code: string;
  label: string;
  semantic?: string;
};

export const REFERENCE_SEED: Record<string, ReferenceSeedValue[]> = {
  PROJECT_PHASE: [
    { code: 'INITIATION', label: 'Initiation' },
    { code: 'DATA_GATHERING', label: 'Data Gathering' },
    { code: 'REQUIREMENTS_ANALYSIS', label: 'Requirements Analysis' },
    { code: 'DESIGN', label: 'Design' },
    { code: 'DEVELOPMENT', label: 'Development' },
    { code: 'INTERNAL_TESTING_SIT', label: 'Internal Testing / SIT' },
    { code: 'UAT', label: 'UAT' },
    { code: 'RELEASE_DEPLOYMENT', label: 'Release / Deployment' },
    { code: 'TRAINING_AND_TURNOVER', label: 'Training and Turnover' },
    { code: 'ACCEPTANCE', label: 'Acceptance' },
    { code: 'POST_IMPLEMENTATION_SUPPORT', label: 'Post-Implementation Support' },
  ],
  STATUS: [
    { code: 'NOT_STARTED', label: 'Not Started', semantic: 'OPEN' },
    { code: 'IN_PROGRESS', label: 'In Progress', semantic: 'OPEN' },
    { code: 'FOR_REVIEW_VALIDATION', label: 'For Review / Validation', semantic: 'OPEN' },
    { code: 'BLOCKED', label: 'Blocked', semantic: 'OPEN' },
    { code: 'COMPLETED', label: 'Completed', semantic: 'DONE' },
    { code: 'ACCEPTED', label: 'Accepted', semantic: 'DONE' },
    { code: 'DEFERRED', label: 'Deferred', semantic: 'INACTIVE' },
    { code: 'CANCELLED', label: 'Cancelled', semantic: 'INACTIVE' },
  ],
  PRIORITY: [
    { code: 'CRITICAL', label: 'Critical' },
    { code: 'HIGH', label: 'High' },
    { code: 'MEDIUM', label: 'Medium' },
    { code: 'LOW', label: 'Low' },
  ],
  ACTIVITY_TYPE: [
    { code: 'MEETING', label: 'Meeting' },
    { code: 'SITE_VISIT', label: 'Site Visit' },
    { code: 'RELEASE_DEMO', label: 'Release Demo' },
    { code: 'WORKSHOP', label: 'Workshop' },
    { code: 'TRAINING', label: 'Training' },
    { code: 'UAT', label: 'UAT' },
    { code: 'SUPPORT_VISIT', label: 'Support Visit' },
  ],
  RAID_TYPE: [
    { code: 'ACTION', label: 'Action' },
    { code: 'RISK', label: 'Risk' },
    { code: 'ISSUE', label: 'Issue' },
    { code: 'DECISION', label: 'Decision' },
    { code: 'DEPENDENCY', label: 'Dependency' },
    { code: 'CHANGE_REQUEST', label: 'Change Request' },
  ],
  TEST_RESULT: [
    { code: 'NOT_RUN', label: 'Not Run', semantic: 'NOT_RUN' },
    { code: 'PASSED', label: 'Passed', semantic: 'PASS' },
    { code: 'FAILED', label: 'Failed', semantic: 'FAIL' },
    { code: 'BLOCKED', label: 'Blocked', semantic: 'BLOCKED' },
    { code: 'FOR_RETEST', label: 'For Retest', semantic: 'RETEST' },
  ],
  ENVIRONMENT: [
    { code: 'DEVELOPMENT', label: 'Development' },
    { code: 'TEST', label: 'Test' },
    { code: 'UAT', label: 'UAT' },
    { code: 'PRODUCTION', label: 'Production' },
  ],
  // Derived from REQ-049, not a new taxonomy.
  TEST_STAGE: [
    { code: 'SIT', label: 'SIT' },
    { code: 'UAT', label: 'UAT' },
  ],
  // Provisional default (design §6.2) — confirm or replace via this seed.
  HEALTH: [
    { code: 'GREEN', label: 'Green', semantic: 'GREEN' },
    { code: 'AMBER', label: 'Amber', semantic: 'AMBER' },
    { code: 'RED', label: 'Red', semantic: 'RED' },
    { code: 'NOT_ASSESSED', label: 'Not Assessed', semantic: 'UNKNOWN' },
  ],
  // Genuinely missing — no values until supplied by Project Leadership.
  REQUIREMENT_TYPE: [],
  ACTIVITY_MODE: [],
  PROBABILITY: [],
  DOCUMENT_TYPE: [],
};
