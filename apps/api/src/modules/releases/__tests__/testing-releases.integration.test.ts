import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Acceptance,
  Defect,
  DefectDetail,
  Project,
  ReferenceDataResponse,
  Release,
  ReleaseDetail,
  RequirementDetail,
  TestCase,
  TestCaseDetail,
} from '@pmocore/shared';
import { createApp } from '../../../app.js';
import {
  type Agent,
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from '../../../__tests__/setup/helpers.js';

describe.skipIf(!hasTestDatabase)('Testing, Defects, Releases and Acceptance (integration)', () => {
  let agent: Agent;
  let project: Project;
  let refs: ReferenceDataResponse['values'];
  let requirement: RequirementDetail;

  const ref = (category: string, code: string) => {
    const value = refs.find((v) => v.category === category && v.code === code);
    if (!value) throw new Error(`Missing reference ${category}/${code}`);
    return value.id;
  };
  const base = (p: Project = project) => `/api/projects/${p.id}`;
  const post = <T>(path: string, payload: object) =>
    withCsrf(agent.post(`${base()}${path}`))
      .send(payload)
      .then((r) => ({ status: r.status, data: body<T>(r).data, res: r }));
  const put = <T>(path: string, payload: object) =>
    withCsrf(agent.put(`${base()}${path}`))
      .send(payload)
      .then((r) => ({ status: r.status, data: body<T>(r).data, res: r }));
  const get = async <T>(path: string) => body<T>(await agent.get(`${base()}${path}`)).data;

  beforeEach(async () => {
    await resetData();
    await createUser();
    agent = await login(createApp());
    refs = body<ReferenceDataResponse>(await agent.get('/api/reference-data')).data.values;
    project = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code: 'BASC-CQMS', name: 'CQMS' }),
    ).data;
    requirement = (
      await post<RequirementDetail>('/requirements', {
        statement: 'Queue display shows ticket number',
      })
    ).data;
  });

  describe('testing & defects', () => {
    it('traces requirement → test → defect → retest, keeping Failed and For Retest distinct', async () => {
      const created = await post<TestCaseDetail>('/tests', {
        requirementId: requirement.id,
        stageId: ref('TEST_STAGE', 'UAT'),
        scenario: 'Ticket number is readable at 10 m',
        expectedResult: 'Readable',
        actualResult: 'Font too small',
        testerName: 'Registrar staff',
        testDate: '2026-10-06',
        resultId: ref('TEST_RESULT', 'FAILED'),
      });
      expect(created.status).toBe(201);
      const test = created.data;
      expect(test).toMatchObject({ code: 'TC-001', defects: [], requirement: { code: 'REQ-001' } });

      const defect = (
        await post<DefectDetail>('/defects', {
          testCaseId: test.id,
          title: 'Font too small on display',
          severityId: ref('PRIORITY', 'HIGH'),
          assigneeName: 'Dev team',
          statusId: ref('STATUS', 'IN_PROGRESS'),
          targetFixDate: '2026-10-08',
        })
      ).data;
      expect(defect).toMatchObject({ code: 'DEF-001', testCase: { code: 'TC-001' }, fixedIn: [] });

      // Fix delivered: test moves to For Retest; defect records the retest.
      const retest = await put<TestCaseDetail>(`/tests/${test.id}`, {
        ...test,
        resultId: ref('TEST_RESULT', 'FOR_RETEST'),
      });
      expect(retest.data.resultId).toBe(ref('TEST_RESULT', 'FOR_RETEST'));
      expect(retest.data.resultId).not.toBe(ref('TEST_RESULT', 'FAILED'));
      await put<DefectDetail>(`/defects/${defect.id}`, {
        ...defect,
        retestDate: '2026-10-09',
        retestResultId: ref('TEST_RESULT', 'PASSED'),
        statusId: ref('STATUS', 'COMPLETED'),
      });

      const trace = await get<RequirementDetail>(`/requirements/${requirement.id}`);
      expect(trace.tests).toEqual([
        expect.objectContaining({ code: 'TC-001', resultId: ref('TEST_RESULT', 'FOR_RETEST') }),
      ]);
      expect(trace.defects).toEqual([
        expect.objectContaining({
          code: 'DEF-001',
          testCaseId: test.id,
          retestResultId: ref('TEST_RESULT', 'PASSED'),
        }),
      ]);

      const testDetail = await get<TestCaseDetail>(`/tests/${test.id}`);
      expect(testDetail.defects.map((d) => d.code)).toEqual(['DEF-001']);
    });

    it('filters tests and defects, and protects referenced records', async () => {
      const failed = (
        await post<TestCaseDetail>('/tests', {
          scenario: 'A',
          resultId: ref('TEST_RESULT', 'FAILED'),
          stageId: ref('TEST_STAGE', 'SIT'),
        })
      ).data;
      await post('/tests', { scenario: 'B', resultId: ref('TEST_RESULT', 'FOR_RETEST') });
      await post('/tests', { scenario: 'C', resultId: ref('TEST_RESULT', 'PASSED') });

      const scenarios = async (q: string) =>
        (await get<TestCase[]>(`/tests?${q}`)).map((t) => t.scenario);
      expect(await scenarios(`resultId=${ref('TEST_RESULT', 'FAILED')}`)).toEqual(['A']);
      expect(await scenarios(`resultId=${ref('TEST_RESULT', 'FOR_RETEST')}`)).toEqual(['B']);
      expect(await scenarios(`stageId=${ref('TEST_STAGE', 'SIT')}`)).toEqual(['A']);

      await post('/defects', {
        testCaseId: failed.id,
        title: 'Open',
        statusId: ref('STATUS', 'BLOCKED'),
      });
      await post('/defects', { title: 'Closed', statusId: ref('STATUS', 'CANCELLED') });
      const titles = async (q: string) =>
        (await get<Defect[]>(`/defects?${q}`)).map((d) => d.title);
      expect(await titles('open=true')).toEqual(['Open']);
      expect(await titles('open=false')).toEqual(['Closed']);
      expect(await titles(`testCaseId=${failed.id}`)).toEqual(['Open']);

      const blocked = await withCsrf(agent.delete(`${base()}/tests/${failed.id}`));
      expect(blocked.status).toBe(409);
      expect(body(blocked).error?.code).toBe('RECORD_IN_USE');

      expect((await post('/tests', { scenario: '' })).status).toBe(400);
      expect(
        (await post('/tests', { scenario: 'x', resultId: ref('STATUS', 'BLOCKED') })).status,
      ).toBe(400);
      expect(
        (await post('/defects', { title: 'x', severityId: ref('TEST_RESULT', 'FAILED') })).status,
      ).toBe(400);
    });
  });

  describe('releases & acceptance', () => {
    const createRelease = (versionLabel: string, extra: object = {}) =>
      post<ReleaseDetail>('/releases', {
        versionLabel,
        environmentId: ref('ENVIRONMENT', 'UAT'),
        deploymentStatusId: ref('STATUS', 'IN_PROGRESS'),
        releaseDate: versionLabel === 'v1.0' ? '2026-10-10' : '2026-11-10',
        ...extra,
      });

    it('records release scope with history across releases and keeps plans separate', async () => {
      const defect = (await post<DefectDetail>('/defects', { title: 'Font too small' })).data;
      const v1 = (
        await createRelease('v1.0', {
          uatDate: '2026-10-07',
          uatResultId: ref('TEST_RESULT', 'PASSED'),
        })
      ).data;
      const v11 = (await createRelease('v1.1')).data;
      expect([v1.code, v11.code]).toEqual(['REL-001', 'REL-002']);

      const scoped = await put<ReleaseDetail>(`/releases/${v1.id}/requirements`, {
        items: [
          { requirementId: requirement.id, note: 'initial' },
          { requirementId: requirement.id, note: 'dup' },
        ],
      });
      expect(scoped.status).toBe(200);
      expect(scoped.data.includedRequirements).toEqual([
        expect.objectContaining({ code: 'REQ-001', note: 'dup' }),
      ]);
      await put(`/releases/${v1.id}/defects`, {
        items: [{ defectId: defect.id, note: 'fixed in hotfix' }],
      });
      await put(`/releases/${v11.id}/requirements`, {
        items: [{ requirementId: requirement.id, note: 'revision 2' }],
      });
      await put(`/releases/${v11.id}/defects`, {
        items: [{ defectId: defect.id, note: 'regression fix' }],
      });

      // Planning fields do not alter history.
      await put(`/requirements/${requirement.id}`, { ...requirement, targetReleaseId: v11.id });
      await put(`/defects/${defect.id}`, { ...defect, targetFixReleaseId: v11.id });

      const trace = await get<RequirementDetail>(`/requirements/${requirement.id}`);
      expect(trace.targetRelease?.code).toBe('REL-002');
      expect(trace.releasedIn.map((r) => [r.code, r.note])).toEqual([
        ['REL-001', 'dup'],
        ['REL-002', 'revision 2'],
      ]);
      const defectDetail = await get<DefectDetail>(`/defects/${defect.id}`);
      expect(defectDetail.targetFixRelease?.code).toBe('REL-002');
      expect(defectDetail.fixedIn.map((r) => r.note)).toEqual([
        'fixed in hotfix',
        'regression fix',
      ]);

      // Removing from scope affects only that release.
      await put(`/releases/${v1.id}/requirements`, { items: [] });
      const after = await get<RequirementDetail>(`/requirements/${requirement.id}`);
      expect(after.releasedIn.map((r) => r.code)).toEqual(['REL-002']);

      // Duplicate version labels in one project are rejected.
      const duplicate = await createRelease('v1.0');
      expect(duplicate.status).toBe(409);
    });

    it('keeps acceptance history newest first and shows it on the requirement trace', async () => {
      const release = (await createRelease('v1.0')).data;
      await put(`/releases/${release.id}/requirements`, {
        items: [{ requirementId: requirement.id }],
      });

      const first = await post<Acceptance>(`/releases/${release.id}/acceptances`, {
        statusId: ref('STATUS', 'BLOCKED'),
        acceptedBy: 'Registrar',
        remarks: 'Rejected: font size',
      });
      expect(first.status).toBe(201);
      expect(first.data.code).toBe('ACC-001');
      const second = await post<Acceptance>(`/releases/${release.id}/acceptances`, {
        statusId: ref('STATUS', 'ACCEPTED'),
        acceptanceDate: '2026-10-12',
        acceptedBy: 'Registrar',
        certificateRef: 'CERT-2026-01',
      });

      const detail = await get<ReleaseDetail>(`/releases/${release.id}`);
      expect(detail.acceptances.map((a) => a.code)).toEqual(['ACC-002', 'ACC-001']);
      const trace = await get<RequirementDetail>(`/requirements/${requirement.id}`);
      expect(trace.releasedIn[0]?.acceptanceStatusId).toBe(ref('STATUS', 'ACCEPTED'));

      const edited = await put<Acceptance>(`/acceptances/${second.data.id}`, {
        ...second.data,
        handoverNotes: 'Turnover complete',
      });
      expect(edited.data).toMatchObject({ handoverNotes: 'Turnover complete', version: 2 });
      expect((await put(`/acceptances/${second.data.id}`, second.data)).status).toBe(409);

      // A release with acceptance records cannot be deleted.
      expect((await withCsrf(agent.delete(`${base()}/releases/${release.id}`))).status).toBe(409);
      await withCsrf(agent.delete(`${base()}/acceptances/${first.data.id}`)).expect(200);
      await withCsrf(agent.delete(`${base()}/acceptances/${second.data.id}`)).expect(200);
      await withCsrf(agent.delete(`${base()}/releases/${release.id}`)).expect(200);

      const list = await get<Release[]>('/releases');
      expect(list).toEqual([]);
    });

    it('rejects cross-project scope and isolates projects', async () => {
      const release = (await createRelease('v1.0')).data;
      const other = body<Project>(
        await withCsrf(agent.post('/api/projects')).send({ code: 'OTHER', name: 'Other' }),
      ).data;
      const foreignRequirement = body<RequirementDetail>(
        await withCsrf(agent.post(`${base(other)}/requirements`)).send({ statement: 'Foreign' }),
      ).data;

      const rejected = await put(`/releases/${release.id}/requirements`, {
        items: [{ requirementId: foreignRequirement.id }],
      });
      expect(rejected.status).toBe(400);
      expect((await get<ReleaseDetail>(`/releases/${release.id}`)).includedRequirements).toEqual(
        [],
      );

      await agent.get(`${base(other)}/releases/${release.id}`).expect(404);
      const crossAcceptance = await withCsrf(
        agent.post(`${base(other)}/releases/${release.id}/acceptances`),
      ).send({});
      expect(crossAcceptance.status).toBe(404);

      await createUser('other@example.test');
      const intruder = await login(createApp(), 'other@example.test');
      await intruder.get(`${base()}/releases/${release.id}`).expect(404);

      await withCsrf(agent.post(`${base()}/archive`)).expect(200);
      expect((await createRelease('v2.0')).status).toBe(409);
      expect((await post(`/releases/${release.id}/acceptances`, {})).status).toBe(409);
    });
  });
});
