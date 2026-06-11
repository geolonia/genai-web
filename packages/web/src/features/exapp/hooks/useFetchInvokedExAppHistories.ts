import { ListInvokeExAppHistoriesResponse } from 'genai-web';
import useSWRInfinite from 'swr/infinite';
import { teamApiFetcher } from '@/lib/fetcher';

export const getExAppHistoriesKey =
  (teamId: string, exAppId: string) =>
  (pageIndex: number, previousPageData?: ListInvokeExAppHistoriesResponse) => {
    if (previousPageData && !previousPageData.lastEvaluatedKey) {
      return null;
    }

    const params = new URLSearchParams({
      teamId,
      exAppId,
    });

    if (pageIndex > 0 && previousPageData?.lastEvaluatedKey) {
      params.append('exclusiveStartKey', JSON.stringify(previousPageData.lastEvaluatedKey));
    }

    return `exapps/histories?${params.toString()}`;
  };

// [FORK_DIFF: geolonia/genai-web] 非同期 ExApp 自動 polling (cmd_510, 2026-06-11)
// upstream に refreshInterval が追加された場合はこのブロックを削除してください
export const computeRefreshInterval = (
  data: ListInvokeExAppHistoriesResponse[] | undefined,
): number => {
  if (!data) return 0;
  const hasActive = data.some((page) =>
    page.history?.some(
      (h) => h.status === 'IN_PROGRESS' || h.status === 'ACCEPTED',
    ),
  );
  return hasActive ? 5000 : 0;
};

export const useFetchInvokedExAppHistories = (teamId: string, exAppId: string) => {
  return useSWRInfinite<ListInvokeExAppHistoriesResponse>(
    getExAppHistoriesKey(teamId, exAppId),
    teamApiFetcher,
    {
      revalidateOnFocus: false,
      suspense: true,
      refreshInterval: computeRefreshInterval,
    },
  );
};
