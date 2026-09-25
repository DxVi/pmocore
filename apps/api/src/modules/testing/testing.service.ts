import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db, defects, releaseDefects, releases, testCases } from '@pmocore/database';
import {
  RECORD_CODE_PREFIXES,
  type Defect,
  type DefectCreate,
  type DefectDetail,
  type DefectListQuery,
  type DefectUpdate,
  type TestCase,
  type TestCaseCreate,
  type TestCaseDetail,
  type TestCaseListQuery,
  type TestCaseUpdate,
} from '@pmocore/shared';
import { likePattern, pageOffset, paginationMeta } from '../../lib/pagination.js';
import { allocateRecordCode } from '../../lib/record-code.js';
import { assertReferenceFields } from '../reference-data/reference.service.js';
import {
  metaDto,
  notFound,
  openStatusCondition,
  recordRef,
  versionConflict,
} from '../work-items/record-support.js';

/**
 * Minimal Testing & Defects (SA-2): each test case keeps its latest result
 * (Failed and For Retest stay distinct reference values); retest is tracked on
 * the defect. No execution-history subsystem.
 */
type TestCaseRow = typeof testCases.$inferSelect;
type DefectRow = typeof defects.$inferSelect;

export function toTestCaseDto(row: TestCaseRow): TestCase {
  return {
    ...metaDto(row),
    module: row.module,
    requirementId: row.requirementId,
    stageId: row.stageId,
    scenario: row.scenario,
    expectedResult: row.expectedResult,
    actualResult: row.actualResult,
    testerName: row.testerName,
    testDate: row.testDate,
    resultId: row.resultId,
    statusId: row.statusId,
    evidence: row.evidence,
    remarks: row.remarks,
  };
}

export function toDefectDto(row: DefectRow): Defect {
  return {
    ...metaDto(row),
    testCaseId: row.testCaseId,
    externalRef: row.externalRef,
    title: row.title,
    description: row.description,
    severityId: row.severityId,
    assigneeName: row.assigneeName,
    statusId: row.statusId,
    targetFixDate: row.targetFixDate,
    targetFixReleaseId: row.targetFixReleaseId,
    retestDate: row.retestDate,
    retestResultId: row.retestResultId,
    remarks: row.remarks,
  };
}

const testRefFields = (i: {
  stageId: number | null;
  resultId: number | null;
  statusId: number | null;
}) => ({
  stageId: i.stageId,
  resultId: i.resultId,
  statusId: i.statusId,
});

const defectRefFields = (i: {
  severityId: number | null;
  statusId: number | null;
  retestResultId: number | null;
}) => ({ severityId: i.severityId, statusId: i.statusId, retestResultId: i.retestResultId });

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const TEST_SORTS = {
  code: testCases.code,
  testDate: testCases.testDate,
  updatedAt: testCases.updatedAt,
} as const;

export async function listTestCases(projectId: string, query: TestCaseListQuery) {
  const conditions: (SQL | undefined)[] = [eq(testCases.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(testCases.code, pattern),
        ilike(testCases.scenario, pattern),
        ilike(testCases.module, pattern),
        ilike(testCases.testerName, pattern),
      ),
    );
  }
  if (query.requirementId) conditions.push(eq(testCases.requirementId, query.requirementId));
  if (query.stageId) conditions.push(eq(testCases.stageId, query.stageId));
  if (query.resultId) conditions.push(eq(testCases.resultId, query.resultId));
  if (query.statusId) conditions.push(eq(testCases.statusId, query.statusId));
  const where = and(...conditions);
  const direction = query.dir === 'asc' ? asc : desc;
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(testCases)
      .where(where)
      .orderBy(sql`${direction(TEST_SORTS[query.sort])} NULLS LAST`, asc(testCases.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(testCases).where(where),
  ]);
  return {
    items: rows.map(toTestCaseDto),
    meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0),
  };
}

async function findTestCase(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(testCases)
    .where(and(eq(testCases.projectId, projectId), eq(testCases.id, id)))
    .limit(1);
  return row;
}

export async function getTestCase(projectId: string, id: string): Promise<TestCaseDetail> {
  const row = await findTestCase(projectId, id);
  if (!row) throw notFound('Test case');
  const [requirement, defectRows] = await Promise.all([
    recordRef('requirements', projectId, row.requirementId),
    db
      .select()
      .from(defects)
      .where(and(eq(defects.projectId, projectId), eq(defects.testCaseId, id)))
      .orderBy(asc(defects.code)),
  ]);
  return { ...toTestCaseDto(row), requirement, defects: defectRows.map(toDefectDto) };
}

export async function createTestCase(projectId: string, actorId: string, input: TestCaseCreate) {
  await assertReferenceFields(testRefFields(input));
  const row = await db.transaction(async (tx) => {
    const code = await allocateRecordCode(
      tx,
      projectId,
      'test-case',
      RECORD_CODE_PREFIXES.testCase,
    );
    const [inserted] = await tx
      .insert(testCases)
      .values({ ...input, projectId, code, createdBy: actorId, updatedBy: actorId })
      .returning();
    return inserted;
  });
  if (!row) throw new Error('Test case insert returned no row');
  return getTestCase(projectId, row.id);
}

export async function updateTestCase(
  projectId: string,
  id: string,
  actorId: string,
  input: TestCaseUpdate,
) {
  const current = await findTestCase(projectId, id);
  if (!current) throw notFound('Test case');
  await assertReferenceFields(testRefFields(input), testRefFields(current));
  const { version, ...fields } = input;
  const [row] = await db
    .update(testCases)
    .set({
      ...fields,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${testCases.version} + 1`,
    })
    .where(
      and(eq(testCases.projectId, projectId), eq(testCases.id, id), eq(testCases.version, version)),
    )
    .returning();
  if (!row) throw versionConflict('test case');
  return getTestCase(projectId, id);
}

/** Test cases with defects cannot be deleted (409 RECORD_IN_USE). */
export async function deleteTestCase(projectId: string, id: string) {
  const deleted = await db
    .delete(testCases)
    .where(and(eq(testCases.projectId, projectId), eq(testCases.id, id)))
    .returning({ id: testCases.id });
  if (deleted.length === 0) throw notFound('Test case');
}

// ---------------------------------------------------------------------------
// Defects
// ---------------------------------------------------------------------------

const DEFECT_SORTS = {
  code: defects.code,
  targetFixDate: defects.targetFixDate,
  updatedAt: defects.updatedAt,
  severity: sql`(SELECT rv.sort_order FROM reference_values rv WHERE rv.id = "defects"."severity_id")`,
} as const;

export async function listDefects(projectId: string, query: DefectListQuery) {
  const conditions: (SQL | undefined)[] = [eq(defects.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(defects.code, pattern),
        ilike(defects.title, pattern),
        ilike(defects.externalRef, pattern),
        ilike(defects.assigneeName, pattern),
      ),
    );
  }
  if (query.testCaseId) conditions.push(eq(defects.testCaseId, query.testCaseId));
  if (query.severityId) conditions.push(eq(defects.severityId, query.severityId));
  if (query.statusId) conditions.push(eq(defects.statusId, query.statusId));
  if (query.open === true) conditions.push(openStatusCondition(defects.statusId));
  if (query.open === false) conditions.push(sql`NOT ${openStatusCondition(defects.statusId)}`);
  const where = and(...conditions);
  const direction = query.dir === 'asc' ? asc : desc;
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(defects)
      .where(where)
      .orderBy(sql`${direction(DEFECT_SORTS[query.sort])} NULLS LAST`, asc(defects.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(defects).where(where),
  ]);
  return {
    items: rows.map(toDefectDto),
    meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0),
  };
}

async function findDefect(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(defects)
    .where(and(eq(defects.projectId, projectId), eq(defects.id, id)))
    .limit(1);
  return row;
}

export async function getDefect(projectId: string, id: string): Promise<DefectDetail> {
  const row = await findDefect(projectId, id);
  if (!row) throw notFound('Defect');
  const [testCase, targetFixRelease, fixedIn] = await Promise.all([
    recordRef('test_cases', projectId, row.testCaseId),
    recordRef('releases', projectId, row.targetFixReleaseId),
    db
      .select({
        id: releases.id,
        code: releases.code,
        title: releases.versionLabel,
        note: releaseDefects.note,
      })
      .from(releaseDefects)
      .innerJoin(releases, eq(releases.id, releaseDefects.releaseId))
      .where(and(eq(releaseDefects.projectId, projectId), eq(releaseDefects.defectId, id)))
      .orderBy(asc(releases.releaseDate), asc(releases.code)),
  ]);
  return { ...toDefectDto(row), testCase, targetFixRelease, fixedIn };
}

export async function createDefect(projectId: string, actorId: string, input: DefectCreate) {
  await assertReferenceFields(defectRefFields(input));
  const row = await db.transaction(async (tx) => {
    const code = await allocateRecordCode(tx, projectId, 'defect', RECORD_CODE_PREFIXES.defect);
    const [inserted] = await tx
      .insert(defects)
      .values({ ...input, projectId, code, createdBy: actorId, updatedBy: actorId })
      .returning();
    return inserted;
  });
  if (!row) throw new Error('Defect insert returned no row');
  return getDefect(projectId, row.id);
}

export async function updateDefect(
  projectId: string,
  id: string,
  actorId: string,
  input: DefectUpdate,
) {
  const current = await findDefect(projectId, id);
  if (!current) throw notFound('Defect');
  await assertReferenceFields(defectRefFields(input), defectRefFields(current));
  const { version, ...fields } = input;
  const [row] = await db
    .update(defects)
    .set({
      ...fields,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${defects.version} + 1`,
    })
    .where(and(eq(defects.projectId, projectId), eq(defects.id, id), eq(defects.version, version)))
    .returning();
  if (!row) throw versionConflict('defect');
  return getDefect(projectId, id);
}

/** Defects included in a release cannot be deleted (409 RECORD_IN_USE). */
export async function deleteDefect(projectId: string, id: string) {
  const deleted = await db
    .delete(defects)
    .where(and(eq(defects.projectId, projectId), eq(defects.id, id)))
    .returning({ id: defects.id });
  if (deleted.length === 0) throw notFound('Defect');
}
