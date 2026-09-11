'use client';

import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';

type Props = {
  src: string;
};

const BOX_CLASS = 'h-[50px] w-[50px] shrink-0 rounded border border-border/60';

/**
 * 상품 목록의 50x50 메인이미지 썸네일.
 *
 * 값이 비었거나 로드에 실패하면 같은 크기의 회색 박스로 바꾼다. 크기가 같아 자리가 흔들리지 않는다.
 * 실패 경로는 예외가 아니라 일상이다 — 데모 버킷에 25일 수명주기 규칙이 걸려 있어
 * "key는 있는데 객체가 없는" 상태가 정상적으로 발생한다.
 *
 * alt를 비우는 것은 의도다. 상품명이 바로 옆에 나란히 있어 화면 낭독기가 같은 이름을 두 번 읽는다.
 */
export const ProductThumbnail = ({ src }: Props) => {
  const [hasError, setHasError] = useState(false);

  // 페이지를 넘길 때는 행의 key(상품코드)가 달라져 컴포넌트가 새로 만들어지므로 문제가 없다.
  // 이 초기화가 필요한 경우는 목록이 마운트된 채 TanStack Query가 재조회(창 포커스 복귀, 캐시
  // 무효화 등)해 같은 상품의 이미지 값만 바뀔 때다. 상품 상세로 나갔다 돌아오는 경로는 해당하지
  // 않는다 — 목록 화면 자체가 통째로 재마운트되므로(체크 상태가 해제되는 이유이기도 하다) 이
  // 컴포넌트도 함께 새로 만들어진다.
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={`${BOX_CLASS} flex items-center justify-center bg-muted`}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  // next/image를 쓰지 않는다. 도입하려면 images.remotePatterns 호스트 화이트리스트가
  // 함께 필요해 범위가 늘어난다(스펙 §10 오픈 이슈).
  return <img src={src} alt="" className={`${BOX_CLASS} object-cover`} onError={() => setHasError(true)} />;
};
