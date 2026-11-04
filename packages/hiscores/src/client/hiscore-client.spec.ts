import { describe, expect, it, vi } from 'vitest';
import { JagexHiscoreJson } from '../mapper/from-jagex';
import { getHiscore, HiscoreFetch, HiscoreTable } from './hiscore-client';

const baseUrl = 'https://hiscores.example';

const hiscore: JagexHiscoreJson = {
  name: 'lynx titan',
  skills: [{ id: 0, name: 'Overall', rank: 1, level: 2376, xp: 4_600_000_000 }],
  activities: [{ id: 0, name: 'Grid Points', rank: -1, score: -1 }],
};

function respond(status: number, body: unknown = hiscore) {
  return vi.fn<HiscoreFetch>(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }));
}

describe('getHiscore', () => {
  it('returns found with the body mapped to the domain model and its layout', async () => {
    const result = await getHiscore({ baseUrl, username: 'lynx titan', fetch: respond(200) });
    expect(result).toEqual({
      status: 'found',
      hiscore: {
        skills: { Overall: { rank: 1, level: 2376, xp: 4_600_000_000 } },
        activities: { 'Grid Points': null },
      },
      layout: { skills: ['Overall'], activities: ['Grid Points'] },
    });
  });

  it('URL-encodes the name and defaults to the normal table', async () => {
    const fetch = respond(200);
    await getHiscore({ baseUrl, username: 'lynx titan', fetch });
    expect(fetch.mock.calls[0][0]).toBe(`${baseUrl}/m=hiscore_oldschool/index_lite.json?player=lynx%20titan`);
  });

  it.each<HiscoreTable>([
    'hiscore_oldschool',
    'hiscore_oldschool_ironman',
    'hiscore_oldschool_ultimate',
    'hiscore_oldschool_hardcore_ironman',
    'hiscore_oldschool_hardcore_mains',
  ])('uses the given table (%s)', async (table) => {
    const fetch = respond(200);
    await getHiscore({ baseUrl, username: 'zezima', table, fetch });
    expect(fetch.mock.calls[0][0]).toBe(`${baseUrl}/m=${table}/index_lite.json?player=zezima`);
  });

  it("returns a dead hardcore player's death time as diedAt", async () => {
    const dead: JagexHiscoreJson = {
      ...hiscore,
      skills: [{ ...hiscore.skills[0], death: { timeStamp: 1_670_857_144_138 } }],
    };
    const result = await getHiscore({ baseUrl, username: 'lynx titan', fetch: respond(200, dead) });
    expect(result).toMatchObject({ status: 'found', diedAt: new Date('2022-12-12T14:59:04.138Z') });
  });

  it('returns no diedAt for a living player', async () => {
    const result = await getHiscore({ baseUrl, username: 'lynx titan', fetch: respond(200) });
    expect(result).not.toHaveProperty('diedAt');
  });

  it('sends no-cache and a timeout signal', async () => {
    const fetch = respond(200);
    await getHiscore({ baseUrl, username: 'zezima', fetch });
    const init = fetch.mock.calls[0][1];
    expect(init.headers).toEqual({ 'cache-control': 'no-cache' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([404, 400] as const)('returns notFound on HTTP %i', async (status) => {
    const result = await getHiscore({ baseUrl, username: 'zezima', fetch: respond(status) });
    expect(result).toEqual({ status: 'notFound', httpStatus: status });
  });

  it('returns failed on other non-2xx', async () => {
    const result = await getHiscore({ baseUrl, username: 'zezima', fetch: respond(503) });
    expect(result).toEqual({ status: 'failed', reason: 'HTTP 503' });
  });

  it.each([
    ['null', null],
    ['no skills', { name: 'zezima', activities: [] }],
    ['no activities', { name: 'zezima', skills: [] }],
    ['an HTML page', '<html></html>'],
    ['a null skill', { name: 'zezima', skills: [null], activities: [] }],
  ])('returns failed on an unexpected body (%s)', async (_, body) => {
    const result = await getHiscore({ baseUrl, username: 'zezima', fetch: respond(200, body) });
    expect(result).toEqual({ status: 'failed', reason: 'unexpected body' });
  });

  it('returns failed when the body is not JSON', async () => {
    const fetch = vi.fn<HiscoreFetch>(async () => ({
      status: 200,
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    }));
    const result = await getHiscore({ baseUrl, username: 'zezima', fetch });
    expect(result).toEqual({ status: 'failed', reason: 'unexpected body' });
  });

  it('returns failed on a timeout', async () => {
    const fetch = vi.fn<HiscoreFetch>(
      (_, { signal }) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
    );
    const result = await getHiscore({ baseUrl, username: 'zezima', fetch, timeoutMs: 10 });
    expect(result).toEqual({ status: 'failed', reason: 'timed out after 10ms' });
  });

  it('returns failed on a network error', async () => {
    const fetch = vi.fn<HiscoreFetch>(async () => {
      throw new TypeError('fetch failed');
    });
    const result = await getHiscore({ baseUrl, username: 'zezima', fetch });
    expect(result).toEqual({ status: 'failed', reason: 'network error: fetch failed' });
  });
});
