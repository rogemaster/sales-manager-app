import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { requireSession } from '@/shared/utils/apiAuth';
import { INVALID_IMAGE_URL_MESSAGE } from '@/shared/constant/upload.constant';
import { fetchRemoteImage, readImageUrl, RemoteImageError, remoteImageErrorMessage } from '@/lib/remoteImage';

// 엑셀 업로드 미리보기 단계에서 이미지 주소가 쓸 수 있는 이미지인지 확인만 한다.
// R2에 저장하지 않는다 — 사용자가 저장하지 않고 초기화하면 파일만 남기 때문이다.
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const url = readImageUrl(await req.json().catch(() => null));
    if (!url) return NextResponse.json({ error: INVALID_IMAGE_URL_MESSAGE }, { status: 400 });

    await fetchRemoteImage(url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return NextResponse.json({ error: remoteImageErrorMessage(error) }, { status: 400 });
    }
    console.error('이미지 확인 중 에러:', error);
    return serverErrorResponse();
  }
}
