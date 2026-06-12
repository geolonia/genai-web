import { useEffect } from 'react';
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
  const swrResult = useSWRInfinite<ListInvokeExAppHistoriesResponse>(
    getExAppHistoriesKey(teamId, exAppId),
    teamApiFetcher,
    {
      revalidateOnFocus: false,
      suspense: true,
      refreshInterval: computeRefreshInterval,
    },
  );

  // [FORK_DIFF: geolonia/genai-web] SWR の refreshInterval 関数はマウント時に一度だけ評価される。
  // フォーム送信後に mutate で ACCEPTED アイテムが出現しても polling は再起動しないため、
  // data 変化を監視して active job がある間は手動でポーリングする。
  useEffect(() => {
    const interval = computeRefreshInterval(swrResult.data);
    if (!interval) return;
    const timer = setTimeout(() => swrResult.mutate(), interval);
    return () => clearTimeout(timer);
  }, [swrResult.data, swrResult.mutate]);

  return swrResult;
};
