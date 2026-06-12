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

  // [FORK_DIFF: geolonia/genai-web] SWR v2.4.1 は refreshInterval=0 で polling が停止した後、
  // キャッシュのみの変化（mutate 経由の data 更新）では polling タイマーを再スケジュールしない。
  // そのため、フォーム送信後に ACCEPTED アイテムが出現しても上記の refreshInterval 設定だけでは
  // polling が再起動しない。このブロックは data 変化を監視して手動で mutate を呼び出す。
  // ★二重 polling 注意: refreshInterval: computeRefreshInterval が有効な interval を返している
  //   間はこの useEffect と SWR 内部タイマーが並走する。upstream で polling 自動再起動が
  //   サポートされた場合はこのブロックごと削除すること。
  // ★連続同値問題: SWR v2 は deep-equal 比較で data が変化なしと判断した場合に state 更新を
  //   スキップするため [data] 依存だけではチェーンが途切れる。isValidating を依存に加えることで
  //   poll 完了(isValidating false→false のトグル)を確実にトリガーとして使う。
  useEffect(() => {
    if (swrResult.isValidating) return;
    const interval = computeRefreshInterval(swrResult.data);
    if (!interval) return;
    const timer = setTimeout(() => swrResult.mutate(), interval);
    return () => clearTimeout(timer);
  }, [swrResult.data, swrResult.isValidating, swrResult.mutate]);

  return swrResult;
};
