'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type Props = {
  showThumbnail: boolean;
  onChangeShowThumbnail: (checked: boolean) => void;
};

const THUMBNAIL_TOGGLE_ID = 'product-list-thumbnail-toggle';

/**
 * 검색 필터와 테이블 사이의 액션 영역. 연동상품 목록(MallLinkedProductActionSection)과 같은 자리·같은 배치다.
 * 지금은 썸네일 토글 하나뿐이고, 앞으로 상품 목록에 일괄 액션이 생기면 이 영역이 그 자리가 된다.
 */
export const ProductListActionSection = ({ showThumbnail, onChangeShowThumbnail }: Props) => {
  return (
    <div className="flex items-center gap-3 py-1">
      <Checkbox id={THUMBNAIL_TOGGLE_ID} checked={showThumbnail} onCheckedChange={onChangeShowThumbnail} />
      <Label htmlFor={THUMBNAIL_TOGGLE_ID} className="cursor-pointer">
        메인이미지 보기
      </Label>
    </div>
  );
};
