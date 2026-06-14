import { describe, expect, it } from 'vitest';
import {
  computeRefreshInterval,
} from '../../../../src/features/exapp/hooks/useFetchInvokedExAppHistories';
import type { ListInvokeExAppHistoriesResponse } from 'genai-web';

const makeResponse = (status: string): ListInvokeExAppHistoriesResponse => ({
  history: [
    {
      teamId: 'team1',
      teamName: 'Team 1',
      exAppId: 'exapp1',
      exAppName: 'ExApp 1',
      userId: 'user1',
      inputs: {},
      outputs: '',
      createdDate: '2026-06-11T00:00:00Z',
      status: status as ListInvokeExAppHistoriesResponse['history'][number]['status'],
      progress: '',
    },
  ],
  lastEvaluatedKey: null,
});

describe('computeRefreshInterval', () => {
  it('returns 0 when data is undefined', () => {
    expect(computeRefreshInterval(undefined)).toBe(0);
  });

  it('returns 0 when data is an empty array', () => {
    expect(computeRefreshInterval([])).toBe(0);
  });

  it('returns 0 when all pages have empty history', () => {
    const data: ListInvokeExAppHistoriesResponse[] = [
      { history: [], lastEvaluatedKey: null },
      { history: [], lastEvaluatedKey: null },
    ];
    expect(computeRefreshInterval(data)).toBe(0);
  });

  it('returns 5000 when any item has status IN_PROGRESS', () => {
    expect(computeRefreshInterval([makeResponse('IN_PROGRESS')])).toBe(5000);
  });

  it('returns 5000 when any item has status ACCEPTED', () => {
    expect(computeRefreshInterval([makeResponse('ACCEPTED')])).toBe(5000);
  });

  it('returns 0 when all items have status COMPLETED', () => {
    expect(computeRefreshInterval([makeResponse('COMPLETED')])).toBe(0);
  });

  it('returns 0 when all items have status ERROR', () => {
    expect(computeRefreshInterval([makeResponse('ERROR')])).toBe(0);
  });

  it('returns 5000 when any page among multiple pages has an IN_PROGRESS item', () => {
    const data: ListInvokeExAppHistoriesResponse[] = [
      { ...makeResponse('COMPLETED'), lastEvaluatedKey: 'key1' },
      makeResponse('IN_PROGRESS'),
    ];
    expect(computeRefreshInterval(data)).toBe(5000);
  });

  it('returns 0 when all items across multiple pages are COMPLETED or ERROR', () => {
    const data: ListInvokeExAppHistoriesResponse[] = [
      makeResponse('COMPLETED'),
      makeResponse('ERROR'),
    ];
    expect(computeRefreshInterval(data)).toBe(0);
  });
});
