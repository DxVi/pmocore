/**
 * Representative BASC demonstration data (PKG-4).
 *
 * - Synthetic records only: no real project history, people, or client facts.
 * - Clearly identifiable: every demo project code starts with "DEMO-", its name
 *   starts with "[DEMO]", and records carry a demonstration remark.
 * - Repeatable: loading skips demo projects that already exist.
 * - Removable: `removeDemoData` deletes only DEMO- projects and everything in
 *   them; real operational projects are never touched.
 */
import { and, eq, inArray, like, sql } from 'drizzle-orm';
import {
  ActivityCreateSchema,
  DefectCreateSchema,
  DocumentCreateSchema,
  ProjectCreateSchema,
  RaidItemCreateSchema,
  ReleaseCreateSchema,
  RequirementCreateSchema,
  TestCaseCreateSchema,
  WorkItemCreateSchema,
  AcceptanceCreateSchema,
  type ReferenceCategory,
} from '@pmocore/shared';
import { attachments, db, projects, users } from '@pmocore/database';
import { todayInTimeZone } from '../lib/today.js';
import { addFollowUps, createActivity } from '../modules/activities/activities.service.js';
import { getAttachmentStorage } from '../modules/attachments/storage/index.js';
import { createDocument } from '../modules/documents/documents.service.js';
import { createProject } from '../modules/projects/projects.service.js';
import { createRaidItem } from '../modules/raid/raid.service.js';
import { findReferenceByCode } from '../modules/reference-data/reference.service.js';
import {
  createAcceptance,
  createRelease,
  replaceReleaseDefects,
  replaceReleaseRequirements,
} from '../modules/releases/releases.service.js';
import {
  createRequirement,
  replaceRequirementWorkItems,
} from '../modules/requirements/requirements.service.js';
import { createDefect, createTestCase } from '../modules/testing/testing.service.js';
import { createWorkItem } from '../modules/work-items/work-items.service.js';

export const DEMO_CODE_PREFIX = 'DEMO-';
export const DEMO_REMARK = 'Synthetic demonstration record — remove before production use.';

const shift = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

async function refId(category: ReferenceCategory, code: string): Promise<number> {
  const value = await findReferenceByCode(category, code);
  if (!value) throw new Error(`Reference value ${category}/${code} is missing; run db:seed first.`);
  return value.id;
}

type DemoProjectSpec = {
  code: string;
  name: string;
  summary: string;
  phase: string;
  status: string;
  health: string;
  targetOffset: number;
};

const PROJECTS: DemoProjectSpec[] = [
  {
    code: 'DEMO-HRIS',
    name: '[DEMO] HRIS — Human Resource Information System',
    summary: 'Demonstration project for employee records, leave and service records.',
    phase: 'DEVELOPMENT',
    status: 'IN_PROGRESS',
    health: 'AMBER',
    targetOffset: 45,
  },
  {
    code: 'DEMO-PAYROLL',
    name: '[DEMO] Payroll System',
    summary: 'Demonstration project for payroll computation, deductions and payslips.',
    phase: 'UAT',
    status: 'IN_PROGRESS',
    health: 'GREEN',
    targetOffset: 20,
  },
  {
    code: 'DEMO-QMS',
    name: '[DEMO] Queueing System',
    summary: 'Demonstration project for ticket issuance, counters and queue displays.',
    phase: 'RELEASE_DEPLOYMENT',
    status: 'IN_PROGRESS',
    health: 'RED',
    targetOffset: 8,
  },
];

/** The owner for demo projects: the given email, or the single active user. */
async function resolveOwner(ownerEmail?: string): Promise<string> {
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      ownerEmail ? eq(users.email, ownerEmail.trim().toLowerCase()) : eq(users.isActive, true),
    );
  if (rows.length === 0)
    throw new Error('No matching active user. Create the user first (user:upsert).');
  if (rows.length > 1)
    throw new Error('Several active users exist; pass the owner email explicitly.');
  return rows[0].id;
}

async function loadProject(spec: DemoProjectSpec, ownerId: string, today: string) {
  const status = (code: string) => refId('STATUS', code);
  const priority = (code: string) => refId('PRIORITY', code);
  const project = await createProject(
    ownerId,
    ProjectCreateSchema.parse({
      code: spec.code,
      name: spec.name,
      summary: `${spec.summary} ${DEMO_REMARK}`,
      phaseId: await refId('PROJECT_PHASE', spec.phase),
      statusId: await status(spec.status),
      healthId: await refId('HEALTH', spec.health),
      startDate: shift(today, -60),
      targetDate: shift(today, spec.targetOffset),
      pmRemarks: DEMO_REMARK,
    }),
  );
  const pid = project.id;

  // Plan
  const design = await createWorkItem(
    pid,
    ownerId,
    WorkItemCreateSchema.parse({
      title: 'Design and prototype',
      phaseId: await refId('PROJECT_PHASE', 'DESIGN'),
      statusId: await status('COMPLETED'),
      percentComplete: 100,
      plannedStart: shift(today, -50),
      plannedEnd: shift(today, -30),
      remarks: DEMO_REMARK,
    }),
  );
  const build = await createWorkItem(
    pid,
    ownerId,
    WorkItemCreateSchema.parse({
      title: 'Core module development',
      phaseId: await refId('PROJECT_PHASE', 'DEVELOPMENT'),
      statusId: await status('IN_PROGRESS'),
      percentComplete: 60,
      ownerName: 'Development team',
      plannedStart: shift(today, -30),
      plannedEnd: shift(today, 10),
      remarks: DEMO_REMARK,
    }),
  );
  await createWorkItem(
    pid,
    ownerId,
    WorkItemCreateSchema.parse({
      title: 'Go-live',
      isMilestone: true,
      statusId: await status('NOT_STARTED'),
      plannedEnd: shift(today, spec.targetOffset),
      remarks: DEMO_REMARK,
    }),
  );

  // Requirements
  const reqA = await createRequirement(
    pid,
    ownerId,
    RequirementCreateSchema.parse({
      statement: 'Authorized staff can search records by name or ID number.',
      acceptanceCriteria: 'Results appear within 3 seconds for a demonstration dataset.',
      priorityId: await priority('HIGH'),
      statusId: await status('IN_PROGRESS'),
      dateRaised: shift(today, -40),
      source: 'Demonstration end user',
      remarks: DEMO_REMARK,
    }),
  );
  const reqB = await createRequirement(
    pid,
    ownerId,
    RequirementCreateSchema.parse({
      statement: 'Supervisors can export a monthly summary report.',
      priorityId: await priority('MEDIUM'),
      statusId: await status('ACCEPTED'),
      dateRaised: shift(today, -35),
      remarks: DEMO_REMARK,
    }),
  );
  await replaceRequirementWorkItems(pid, reqA.id, ownerId, [design.id, build.id]);
  await replaceRequirementWorkItems(pid, reqB.id, ownerId, [build.id]);

  // Meeting / visit with follow-ups
  const meeting = await createActivity(
    pid,
    ownerId,
    ActivityCreateSchema.parse({
      title: 'Demonstration site visit',
      activityDate: shift(today, -3),
      activityTypeId: await refId('ACTIVITY_TYPE', 'SITE_VISIT'),
      statusId: await status('COMPLETED'),
      location: 'Demonstration office',
      attendees: 'Demo attendee A\nDemo attendee B',
      agenda: 'Walk-through of the current build',
      findings: 'Search screen needs clearer labels.',
      outcomes: 'Agreed to revise labels before UAT.',
      relatedRequirementId: reqA.id,
      nextScheduleDate: shift(today, 7),
      nextScheduleNote: 'Follow-up demonstration',
    }),
  );
  await addFollowUps(pid, meeting.id, ownerId, {
    actions: [
      {
        raidTypeId: null,
        title: 'Revise search screen labels',
        ownerName: 'Development team',
        dueDate: shift(today, -1),
        priorityId: await priority('HIGH'),
      },
      {
        raidTypeId: null,
        title: 'Prepare UAT script draft',
        ownerName: 'PM',
        dueDate: shift(today, 5),
        priorityId: null,
      },
    ],
  });
  await createActivity(
    pid,
    ownerId,
    ActivityCreateSchema.parse({
      title: 'Demonstration UAT planning meeting',
      activityDate: shift(today, 4),
      activityTypeId: await refId('ACTIVITY_TYPE', 'MEETING'),
      statusId: await status('NOT_STARTED'),
      location: 'Online',
    }),
  );
  await createRaidItem(
    pid,
    ownerId,
    RaidItemCreateSchema.parse({
      typeId: await refId('RAID_TYPE', 'ISSUE'),
      title: 'Demonstration server access pending',
      dateRaised: shift(today, -6),
      statusId: await status('BLOCKED'),
      ownerName: 'IT (demo)',
      priorityId: await priority('CRITICAL'),
      remarks: DEMO_REMARK,
    }),
  );
  await createRaidItem(
    pid,
    ownerId,
    RaidItemCreateSchema.parse({
      typeId: await refId('RAID_TYPE', 'RISK'),
      title: 'Key users may be unavailable during UAT week',
      dateRaised: shift(today, -10),
      statusId: await status('IN_PROGRESS'),
      mitigation: 'Schedule alternates in advance.',
      remarks: DEMO_REMARK,
    }),
  );

  // Testing
  const failed = await createTestCase(
    pid,
    ownerId,
    TestCaseCreateSchema.parse({
      scenario: 'Search by partial name returns matching records',
      requirementId: reqA.id,
      stageId: await refId('TEST_STAGE', 'SIT'),
      expectedResult: 'Matching records listed',
      actualResult: 'No results for partial names',
      resultId: await refId('TEST_RESULT', 'FAILED'),
      testDate: shift(today, -2),
      remarks: DEMO_REMARK,
    }),
  );
  await createTestCase(
    pid,
    ownerId,
    TestCaseCreateSchema.parse({
      scenario: 'Monthly summary export opens in a spreadsheet',
      requirementId: reqB.id,
      stageId: await refId('TEST_STAGE', 'UAT'),
      resultId: await refId('TEST_RESULT', 'FOR_RETEST'),
      testDate: shift(today, -1),
      remarks: DEMO_REMARK,
    }),
  );
  await createTestCase(
    pid,
    ownerId,
    TestCaseCreateSchema.parse({
      scenario: 'Login with valid demonstration account',
      stageId: await refId('TEST_STAGE', 'SIT'),
      resultId: await refId('TEST_RESULT', 'PASSED'),
      testDate: shift(today, -4),
      remarks: DEMO_REMARK,
    }),
  );
  const defect = await createDefect(
    pid,
    ownerId,
    DefectCreateSchema.parse({
      title: 'Partial-name search not supported',
      testCaseId: failed.id,
      severityId: await priority('HIGH'),
      statusId: await status('IN_PROGRESS'),
      assigneeName: 'Development team',
      targetFixDate: shift(today, 3),
      remarks: DEMO_REMARK,
    }),
  );

  // Release, scope and acceptance history
  const release = await createRelease(
    pid,
    ownerId,
    ReleaseCreateSchema.parse({
      versionLabel: 'v0.9-demo',
      name: 'Demonstration pilot',
      environmentId: await refId('ENVIRONMENT', 'UAT'),
      deploymentStatusId: await status('COMPLETED'),
      releaseDate: shift(today, -7),
      uatDate: shift(today, -5),
      uatResultId: await refId('TEST_RESULT', 'PASSED'),
      remarks: DEMO_REMARK,
    }),
  );
  await replaceReleaseRequirements(pid, release.id, ownerId, {
    items: [{ requirementId: reqB.id, note: 'demo scope' }],
  });
  await replaceReleaseDefects(pid, release.id, ownerId, {
    items: [{ defectId: defect.id, note: 'partial fix (demo)' }],
  });
  await createAcceptance(
    pid,
    release.id,
    ownerId,
    AcceptanceCreateSchema.parse({
      statusId: await status('ACCEPTED'),
      acceptanceDate: shift(today, -4),
      acceptedBy: 'Demonstration approver',
      certificateRef: 'DEMO-CERT-001',
      remarks: DEMO_REMARK,
    }),
  );

  // Documents
  await createDocument(
    pid,
    ownerId,
    DocumentCreateSchema.parse({
      title: 'Demonstration site visit minutes',
      relatedActivityId: meeting.id,
      phaseId: await refId('PROJECT_PHASE', spec.phase),
      statusId: await status('COMPLETED'),
      docVersion: '1.0',
      documentDate: shift(today, -3),
      remarks: DEMO_REMARK,
    }),
  );
  return project.code;
}

/** Loads the demonstration projects that do not exist yet. Returns the created codes. */
export async function loadDemoData(
  ownerEmail?: string,
): Promise<{ created: string[]; skipped: string[] }> {
  const ownerId = await resolveOwner(ownerEmail);
  const today = todayInTimeZone();
  const existing = new Set(
    (
      await db
        .select({ code: projects.code })
        .from(projects)
        .where(like(projects.code, `${DEMO_CODE_PREFIX}%`))
    ).map((p) => p.code),
  );
  const created: string[] = [];
  const skipped: string[] = [];
  for (const spec of PROJECTS) {
    if (existing.has(spec.code)) skipped.push(spec.code);
    else created.push(await loadProject(spec, ownerId, today));
  }
  return { created, skipped };
}

/** Deletes every DEMO- project and all of its records (and stored files). */
export async function removeDemoData(): Promise<{ removed: string[] }> {
  const demo = await db
    .select({ id: projects.id, code: projects.code })
    .from(projects)
    .where(like(projects.code, `${DEMO_CODE_PREFIX}%`));
  if (demo.length === 0) return { removed: [] };
  const ids = demo.map((p) => p.id);
  const idList = sql`ARRAY[${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )}]::uuid[]`;

  const storageKeys = (
    await db
      .select({ key: attachments.storageKey })
      .from(attachments)
      .where(inArray(attachments.projectId, ids))
  ).map((r) => r.key);

  await db.transaction(async (tx) => {
    const run = (statement: string) =>
      tx.execute(sql`${sql.raw(statement)} WHERE project_id = ANY(${idList})`);
    // Break references between records, then delete children before parents.
    await run('UPDATE requirements SET change_request_raid_id = NULL, target_release_id = NULL');
    await run('UPDATE activities SET previous_activity_id = NULL, minutes_document_id = NULL');
    await run('UPDATE work_items SET evidence_document_id = NULL');
    await run('UPDATE acceptances SET certificate_document_id = NULL');
    for (const table of [
      'attachments',
      'release_defects',
      'release_requirements',
      'requirement_work_items',
      'acceptances',
      'documents',
      'raid_items',
      'defects',
      'test_cases',
      'activities',
      'requirements',
      'work_items',
      'releases',
      'record_counters',
    ]) {
      await run(`DELETE FROM ${table}`);
    }
    await tx
      .delete(projects)
      .where(and(inArray(projects.id, ids), like(projects.code, `${DEMO_CODE_PREFIX}%`)));
  });

  const storage = getAttachmentStorage();
  for (const key of storageKeys) await storage.delete(key).catch(() => undefined);
  return { removed: demo.map((p) => p.code) };
}
