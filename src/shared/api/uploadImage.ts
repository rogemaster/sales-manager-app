import { uploadProductImage } from '@/features/products/api/uploadProductImage';

/**
 * 폼 값이 File이면 업로드해서 key를 받고, 이미 문자열이면 그대로 쓴다.
 * 수정 화면에서 이미지를 바꾸지 않은 경우가 후자다.
 */
export const resolveMainImageKey = async (value: File | string): Promise<string> =>
  typeof value === 'string' ? value : uploadProductImage(value);
