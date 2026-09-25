/**
 * Project and project-scoped business records (SOLO-MVP-01 design §5).
 *
 * Every project-scoped table:
 *   - has a non-null `project_id` and `UNIQUE (project_id, id)`;
 *   - carries a stable, immutable, per-project `code` (`UNIQUE (project_id, code)`);
 *   - carries audit columns and an optimistic-concurrency `version`.
 * Every cross-record link is a composite foreign key that includes `project_id`,
 * so the database itself rejects links between records of different projects.
 * All tables live in this one module so their mutual references never form an
 * import cycle; foreign keys are declared in lazily evaluated callbacks.
 */
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  type ExtraConfigColumn,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './identity.js';
import { referenceValues } from './reference.js';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
const businessDate = (name: string) => date(name, { mode: 'string' });
const refId = (name: string) =>
  integer(name).references(() => referenceValues.id, { onDelete: 'restrict' });
const userRef = (name: string) => uuid(name).references(() => users.id, { onDelete: 'restrict' });

function auditColumns() {
  return {
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    createdBy: userRef('created_by').notNull(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
    updatedBy: userRef('updated_by').notNull(),
    version: integer('version').notNull().default(1),
  };
}

function recordColumns() {
  return {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
  };
}

type Ref = { projectId: AnyPgColumn; id: AnyPgColumn };
type ScopedColumns = Ref & { code: AnyPgColumn; updatedAt: ExtraConfigColumn };

/** Constraints shared by every project-scoped record table. */
function recordConstraints(table: string, t: ScopedColumns) {
  return [
    unique(`${table}_project_id_id_key`).on(t.projectId, t.id),
    unique(`${table}_project_id_code_key`).on(t.projectId, t.code),
    index(`${table}_project_updated_idx`).on(t.projectId, t.updatedAt.desc()),
  ];
}

/** Composite same-project foreign key: (project_id, <column>) → target (project_id, id). */
function sameProject(
  name: string,
  projectId: AnyPgColumn,
  column: AnyPgColumn,
  target: () => Ref,
  onDelete: 'restrict' | 'cascade' = 'restrict',
) {
  const ref = target();
  return foreignKey({
    name,
    columns: [projectId, column],
    foreignColumns: [ref.projectId, ref.id],
  }).onDelete(onDelete);
}

// ---------------------------------------------------------------------------
// Projects and infrastructure
// ---------------------------------------------------------------------------

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    summary: text('summary'),
    phaseId: refId('phase_id'),
    statusId: refId('status_id'),
    healthId: refId('health_id'),
    startDate: businessDate('start_date'),
    targetDate: businessDate('target_date'),
    goLiveDate: businessDate('go_live_date'),
    nextMilestoneLabel: text('next_milestone_label'),
    nextMilestoneDate: businessDate('next_milestone_date'),
    pmRemarks: text('pm_remarks'),
    ownerUserId: userRef('owner_user_id').notNull(),
    archivedAt: timestamptz('archived_at'),
    archivedBy: userRef('archived_by'),
    ...auditColumns(),
  },
  (t) => [
    check('projects_code_format', sql`${t.code} ~ '^[A-Z0-9-]{2,20}$'`),
    index('projects_owner_archived_idx').on(t.ownerUserId, t.archivedAt),
    index('projects_updated_idx').on(t.updatedAt.desc()),
  ],
);

export const recordCounters = pgTable(
  'record_counters',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    recordType: text('record_type').notNull(),
    nextValue: integer('next_value').notNull(),
  },
  (t) => [primaryKey({ name: 'record_counters_pkey', columns: [t.projectId, t.recordType] })],
);

// ---------------------------------------------------------------------------
// Plan and requirements
// ---------------------------------------------------------------------------

export const workItems = pgTable(
  'work_items',
  {
    ...recordColumns(),
    phaseId: refId('phase_id'),
    workstream: text('workstream'),
    title: text('title').notNull(),
    description: text('description'),
    ownerName: text('owner_name'),
    plannedStart: businessDate('planned_start'),
    plannedEnd: businessDate('planned_end'),
    actualStart: businessDate('actual_start'),
    actualEnd: businessDate('actual_end'),
    percentComplete: smallint('percent_complete').notNull().default(0),
    statusId: refId('status_id'),
    priorityId: refId('priority_id'),
    isMilestone: boolean('is_milestone').notNull().default(false),
    dependencyNote: text('dependency_note'),
    evidenceRef: text('evidence_ref'),
    evidenceDocumentId: uuid('evidence_document_id'),
    remarks: text('remarks'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('work_items', t),
    check('work_items_percent_range', sql`${t.percentComplete} BETWEEN 0 AND 100`),
    check(
      'work_items_planned_order',
      sql`${t.plannedEnd} IS NULL OR ${t.plannedStart} IS NULL OR ${t.plannedEnd} >= ${t.plannedStart}`,
    ),
    check(
      'work_items_actual_order',
      sql`${t.actualEnd} IS NULL OR ${t.actualStart} IS NULL OR ${t.actualEnd} >= ${t.actualStart}`,
    ),
    sameProject(
      'work_items_evidence_document_fk',
      t.projectId,
      t.evidenceDocumentId,
      (): Ref => documents,
    ),
    index('work_items_project_status_idx').on(t.projectId, t.statusId),
    index('work_items_project_planned_end_idx').on(t.projectId, t.plannedEnd),
  ],
);

export const requirements = pgTable(
  'requirements',
  {
    ...recordColumns(),
    module: text('module'),
    dateRaised: businessDate('date_raised'),
    source: text('source'),
    statement: text('statement').notNull(),
    acceptanceCriteria: text('acceptance_criteria'),
    typeId: refId('type_id'),
    priorityId: refId('priority_id'),
    assigneeName: text('assignee_name'),
    statusId: refId('status_id'),
    targetReleaseId: uuid('target_release_id'),
    isChangeRequest: boolean('is_change_request').notNull().default(false),
    changeRequestRaidId: uuid('change_request_raid_id'),
    validationEvidence: text('validation_evidence'),
    remarks: text('remarks'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('requirements', t),
    sameProject(
      'requirements_target_release_fk',
      t.projectId,
      t.targetReleaseId,
      (): Ref => releases,
    ),
    sameProject(
      'requirements_change_request_raid_fk',
      t.projectId,
      t.changeRequestRaidId,
      (): Ref => raidItems,
    ),
    index('requirements_project_status_idx').on(t.projectId, t.statusId),
    index('requirements_project_target_release_idx').on(t.projectId, t.targetReleaseId),
  ],
);

export const requirementWorkItems = pgTable(
  'requirement_work_items',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    requirementId: uuid('requirement_id').notNull(),
    workItemId: uuid('work_item_id').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    createdBy: userRef('created_by').notNull(),
  },
  (t) => [
    primaryKey({ name: 'requirement_work_items_pkey', columns: [t.requirementId, t.workItemId] }),
    sameProject(
      'requirement_work_items_requirement_fk',
      t.projectId,
      t.requirementId,
      (): Ref => requirements,
      'cascade',
    ),
    sameProject(
      'requirement_work_items_work_item_fk',
      t.projectId,
      t.workItemId,
      (): Ref => workItems,
      'cascade',
    ),
    index('requirement_work_items_work_item_idx').on(t.workItemId),
  ],
);

// ---------------------------------------------------------------------------
// Meetings & Visits and RAID
// ---------------------------------------------------------------------------

export const activities = pgTable(
  'activities',
  {
    ...recordColumns(),
    activityTypeId: refId('activity_type_id'),
    title: text('title').notNull(),
    activityDate: businessDate('activity_date').notNull(),
    startTime: time('start_time'),
    endTime: time('end_time'),
    modeId: refId('mode_id'),
    location: text('location'),
    endUsers: text('end_users'),
    attendees: text('attendees'),
    agenda: text('agenda'),
    findings: text('findings'),
    outcomes: text('outcomes'),
    todoSummary: text('todo_summary'),
    minutesRef: text('minutes_ref'),
    minutesDocumentId: uuid('minutes_document_id'),
    preparedByUserId: userRef('prepared_by_user_id'),
    statusId: refId('status_id'),
    nextScheduleDate: businessDate('next_schedule_date'),
    nextScheduleNote: text('next_schedule_note'),
    relatedRequirementId: uuid('related_requirement_id'),
    previousActivityId: uuid('previous_activity_id'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('activities', t),
    sameProject(
      'activities_minutes_document_fk',
      t.projectId,
      t.minutesDocumentId,
      (): Ref => documents,
    ),
    sameProject(
      'activities_related_requirement_fk',
      t.projectId,
      t.relatedRequirementId,
      (): Ref => requirements,
    ),
    sameProject(
      'activities_previous_activity_fk',
      t.projectId,
      t.previousActivityId,
      (): Ref => activities,
    ),
    index('activities_project_date_idx').on(t.projectId, t.activityDate.desc()),
    index('activities_project_status_idx').on(t.projectId, t.statusId),
  ],
);

export const raidItems = pgTable(
  'raid_items',
  {
    ...recordColumns(),
    typeId: refId('type_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    impact: text('impact'),
    ownerName: text('owner_name'),
    dateRaised: businessDate('date_raised').notNull(),
    sourceActivityId: uuid('source_activity_id'),
    probabilityId: refId('probability_id'),
    priorityId: refId('priority_id'),
    dueDate: businessDate('due_date'),
    statusId: refId('status_id'),
    mitigation: text('mitigation'),
    resolution: text('resolution'),
    closedDate: businessDate('closed_date'),
    evidence: text('evidence'),
    remarks: text('remarks'),
    requirementId: uuid('requirement_id'),
    releaseId: uuid('release_id'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('raid_items', t),
    check(
      'raid_items_closed_order',
      sql`${t.closedDate} IS NULL OR ${t.closedDate} >= ${t.dateRaised}`,
    ),
    sameProject(
      'raid_items_source_activity_fk',
      t.projectId,
      t.sourceActivityId,
      (): Ref => activities,
    ),
    sameProject('raid_items_requirement_fk', t.projectId, t.requirementId, (): Ref => requirements),
    sameProject('raid_items_release_fk', t.projectId, t.releaseId, (): Ref => releases),
    index('raid_items_project_type_status_idx').on(t.projectId, t.typeId, t.statusId),
    index('raid_items_project_due_idx').on(t.projectId, t.dueDate),
    index('raid_items_project_source_activity_idx').on(t.projectId, t.sourceActivityId),
  ],
);

// ---------------------------------------------------------------------------
// Testing and defects
// ---------------------------------------------------------------------------

export const testCases = pgTable(
  'test_cases',
  {
    ...recordColumns(),
    module: text('module'),
    requirementId: uuid('requirement_id'),
    stageId: refId('stage_id'),
    scenario: text('scenario').notNull(),
    expectedResult: text('expected_result'),
    actualResult: text('actual_result'),
    testerName: text('tester_name'),
    testDate: businessDate('test_date'),
    resultId: refId('result_id'),
    statusId: refId('status_id'),
    evidence: text('evidence'),
    remarks: text('remarks'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('test_cases', t),
    sameProject('test_cases_requirement_fk', t.projectId, t.requirementId, (): Ref => requirements),
    index('test_cases_project_requirement_idx').on(t.projectId, t.requirementId),
    index('test_cases_project_result_idx').on(t.projectId, t.resultId),
  ],
);

export const defects = pgTable(
  'defects',
  {
    ...recordColumns(),
    testCaseId: uuid('test_case_id'),
    externalRef: text('external_ref'),
    title: text('title').notNull(),
    description: text('description'),
    severityId: refId('severity_id'),
    assigneeName: text('assignee_name'),
    statusId: refId('status_id'),
    targetFixDate: businessDate('target_fix_date'),
    targetFixReleaseId: uuid('target_fix_release_id'),
    retestDate: businessDate('retest_date'),
    retestResultId: refId('retest_result_id'),
    remarks: text('remarks'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('defects', t),
    sameProject('defects_test_case_fk', t.projectId, t.testCaseId, (): Ref => testCases),
    sameProject(
      'defects_target_fix_release_fk',
      t.projectId,
      t.targetFixReleaseId,
      (): Ref => releases,
    ),
    index('defects_project_test_case_idx').on(t.projectId, t.testCaseId),
    index('defects_project_status_idx').on(t.projectId, t.statusId),
  ],
);

// ---------------------------------------------------------------------------
// Releases and acceptance
// ---------------------------------------------------------------------------

export const releases = pgTable(
  'releases',
  {
    ...recordColumns(),
    versionLabel: text('version_label').notNull(),
    name: text('name'),
    plannedDate: businessDate('planned_date'),
    releaseDate: businessDate('release_date'),
    environmentId: refId('environment_id'),
    scope: text('scope'),
    deploymentStatusId: refId('deployment_status_id'),
    demoDate: businessDate('demo_date'),
    uatDate: businessDate('uat_date'),
    uatResultId: refId('uat_result_id'),
    deliveryDate: businessDate('delivery_date'),
    trainingDate: businessDate('training_date'),
    remarks: text('remarks'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('releases', t),
    unique('releases_project_version_key').on(t.projectId, t.versionLabel),
    index('releases_project_release_date_idx').on(t.projectId, t.releaseDate),
  ],
);

export const releaseRequirements = pgTable(
  'release_requirements',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    releaseId: uuid('release_id').notNull(),
    requirementId: uuid('requirement_id').notNull(),
    note: text('note'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    createdBy: userRef('created_by').notNull(),
  },
  (t) => [
    primaryKey({ name: 'release_requirements_pkey', columns: [t.releaseId, t.requirementId] }),
    sameProject(
      'release_requirements_release_fk',
      t.projectId,
      t.releaseId,
      (): Ref => releases,
      'cascade',
    ),
    sameProject(
      'release_requirements_requirement_fk',
      t.projectId,
      t.requirementId,
      (): Ref => requirements,
    ),
    index('release_requirements_requirement_idx').on(t.requirementId),
  ],
);

export const releaseDefects = pgTable(
  'release_defects',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    releaseId: uuid('release_id').notNull(),
    defectId: uuid('defect_id').notNull(),
    note: text('note'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    createdBy: userRef('created_by').notNull(),
  },
  (t) => [
    primaryKey({ name: 'release_defects_pkey', columns: [t.releaseId, t.defectId] }),
    sameProject(
      'release_defects_release_fk',
      t.projectId,
      t.releaseId,
      (): Ref => releases,
      'cascade',
    ),
    sameProject('release_defects_defect_fk', t.projectId, t.defectId, (): Ref => defects),
    index('release_defects_defect_idx').on(t.defectId),
  ],
);

export const acceptances = pgTable(
  'acceptances',
  {
    ...recordColumns(),
    releaseId: uuid('release_id').notNull(),
    statusId: refId('status_id'),
    acceptanceDate: businessDate('acceptance_date'),
    acceptedBy: text('accepted_by'),
    certificateRef: text('certificate_ref'),
    certificateDocumentId: uuid('certificate_document_id'),
    handoverNotes: text('handover_notes'),
    remarks: text('remarks'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('acceptances', t),
    sameProject('acceptances_release_fk', t.projectId, t.releaseId, (): Ref => releases),
    sameProject(
      'acceptances_certificate_document_fk',
      t.projectId,
      t.certificateDocumentId,
      (): Ref => documents,
    ),
    index('acceptances_project_release_created_idx').on(
      t.projectId,
      t.releaseId,
      t.createdAt.desc(),
    ),
  ],
);

// ---------------------------------------------------------------------------
// Documents and attachments
// ---------------------------------------------------------------------------

export const documents = pgTable(
  'documents',
  {
    ...recordColumns(),
    phaseId: refId('phase_id'),
    documentTypeId: refId('document_type_id'),
    title: text('title').notNull(),
    docVersion: text('doc_version'),
    ownerName: text('owner_name'),
    documentDate: businessDate('document_date'),
    statusId: refId('status_id'),
    linkUrl: text('link_url'),
    relatedRequirementId: uuid('related_requirement_id'),
    relatedActivityId: uuid('related_activity_id'),
    relatedReleaseId: uuid('related_release_id'),
    relatedWorkItemId: uuid('related_work_item_id'),
    remarks: text('remarks'),
    ...auditColumns(),
  },
  (t) => [
    ...recordConstraints('documents', t),
    check(
      'documents_single_related_record',
      sql`num_nonnulls(${t.relatedRequirementId}, ${t.relatedActivityId}, ${t.relatedReleaseId}, ${t.relatedWorkItemId}) <= 1`,
    ),
    check('documents_link_url_scheme', sql`${t.linkUrl} IS NULL OR ${t.linkUrl} ~* '^https?://'`),
    sameProject(
      'documents_related_requirement_fk',
      t.projectId,
      t.relatedRequirementId,
      (): Ref => requirements,
    ),
    sameProject(
      'documents_related_activity_fk',
      t.projectId,
      t.relatedActivityId,
      (): Ref => activities,
    ),
    sameProject(
      'documents_related_release_fk',
      t.projectId,
      t.relatedReleaseId,
      (): Ref => releases,
    ),
    sameProject(
      'documents_related_work_item_fk',
      t.projectId,
      t.relatedWorkItemId,
      (): Ref => workItems,
    ),
    index('documents_project_type_idx').on(t.projectId, t.documentTypeId),
  ],
);

export const ATTACHMENT_PARENT_TYPES = ['activity', 'document'] as const;
export const ATTACHMENT_MAX_BYTES_LIMIT = 10_485_760;

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    parentType: text('parent_type', { enum: ATTACHMENT_PARENT_TYPES }).notNull(),
    parentId: uuid('parent_id').notNull(),
    originalName: text('original_name').notNull(),
    contentType: text('content_type').notNull(),
    extension: text('extension').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    storageDriver: text('storage_driver').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    captureSource: text('capture_source', { enum: ['camera', 'gallery', 'file'] }),
    uploadedBy: userRef('uploaded_by').notNull(),
    uploadedAt: timestamptz('uploaded_at').notNull().defaultNow(),
    deletedAt: timestamptz('deleted_at'),
    deletedBy: userRef('deleted_by'),
    purgedAt: timestamptz('purged_at'),
  },
  (t) => [
    unique('attachments_project_id_id_key').on(t.projectId, t.id),
    check(
      'attachments_size_range',
      sql`${t.sizeBytes} BETWEEN 1 AND ${sql.raw(String(ATTACHMENT_MAX_BYTES_LIMIT))}`,
    ),
    check('attachments_parent_type_allowed', sql`${t.parentType} IN ('activity', 'document')`),
    check(
      'attachments_capture_source_allowed',
      sql`${t.captureSource} IS NULL OR ${t.captureSource} IN ('camera', 'gallery', 'file')`,
    ),
    index('attachments_parent_active_idx')
      .on(t.projectId, t.parentType, t.parentId)
      .where(sql`${t.deletedAt} IS NULL`),
    index('attachments_deleted_purge_idx')
      .on(t.deletedAt)
      .where(sql`${t.deletedAt} IS NOT NULL AND ${t.purgedAt} IS NULL`),
  ],
);
