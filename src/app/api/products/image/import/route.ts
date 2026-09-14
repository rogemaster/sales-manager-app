import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import { buildImageKey, putImage, PRODUCT_IMAGE_PREFIX } from '@/lib/storage';
import { fetchRemoteImage, readImageUrl, RemoteImageError, remoteImageErrorMessage } from '@/lib/remoteImage';

// 엑셀 대량등록 저장 단계에서 외부 이미지를 R2로 옮기고 key를 돌려준다.
// key 형태와 저장 경로는 화면 업로드(/api/products/image)와 같다 — 이후 소유권 검사가 두 경로를 구분하지 않는다.
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const url = readImageUrl(await req.json().catch(() => null));
    if (!url) return NextResponse.json({ error: '올바른 이미지 주소가 아닙니다.' }, { status: 400 });

    const { buffer, detected } = await fetchRemoteImage(url);
    const key = buildImageKey(PRODUCT_IMAGE_PREFIX, session.ownerId, detected.ext);
    await putImage(key, buffer, detected.contentType);

    return NextResponse.json({ key });
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return NextResponse.json({ error: remoteImageErrorMessage(error) }, { status: 400 });
    }
    console.error('이미지 가져오기 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
