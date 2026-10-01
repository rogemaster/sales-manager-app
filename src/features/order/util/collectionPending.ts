import { RunCollectionBody } from '../types/collection.types';

/**
 * 진행 중인 수집 요청(mutation 캐시)에서 "수집중"인 계정 ID를 모은다.
 * 화면 상태(atom)에 두지 않는 이유: mutate() 호출 단위 콜백은 화면을 떠나면 실행되지 않아 atom이 비워지지 않고,
 * 다시 돌아온 화면의 새 useMutation은 isPending이 false라 같은 계정을 또 수집할 수 있었다(라운드 3 최종 리뷰).
 */
export const pendingCollectionAccountIds = (variables: (RunCollectionBody | undefined)[]): string[] => [
  ...new Set(variables.flatMap((body) => body?.accountIds ?? [])),
];
