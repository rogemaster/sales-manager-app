import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const uploadProductImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  // Content-Type을 직접 지정하면 boundary가 빠져 서버가 파싱하지 못한다. 브라우저가 붙이게 둔다.
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/image`, {
    method: 'POST',
    body: formData,
  });

  await throwIfNotOk(response, '이미지 업로드 실패');

  const { key } = (await response.json()) as { key: string };
  return key;
};
