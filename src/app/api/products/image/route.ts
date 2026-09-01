import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import { buildImageKey, detectImageType, putImage, PRODUCT_IMAGE_PREFIX } from '@/lib/storage';
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from '@/shared/constant/upload.constant';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // multipart/form-data는 CORS simple request라 preflight가 없다. 이 프로젝트의 다른 mutating route는
  // application/json이라 preflight로 암묵적 보호를 받지만 여기는 받지 못한다.
  // 헤더 부재는 통과시킨다 — 비브라우저 클라이언트(수동 검증·테스트)를 깨지 않기 위해서다.
  if (req.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
      return NextResponse.json({ error: 'PNG 또는 JPG 이미지만 업로드할 수 있습니다.' }, { status: 400 });
    }

    // Vercel 서버리스 함수의 요청 본문 제한(4.5MB)이 이 검사보다 먼저 걸린다 — 운영(Vercel)에서는
    // 초과 요청이 여기 도달하기 전에 플랫폼이 413으로 끊는다. 로컬 개발 서버·자체 호스팅 배포에는
    // 그 제한이 없으므로, 실제로 실행되는 쪽은 이 검사다.
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '4MB 이하 이미지를 업로드해 주세요.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json({ error: '이미지 파일이 아닙니다.' }, { status: 400 });
    }

    const key = buildImageKey(PRODUCT_IMAGE_PREFIX, session.ownerId, detected.ext);
    await putImage(key, buffer, detected.contentType);

    return NextResponse.json({ key });
  } catch (error) {
    console.error('이미지 업로드 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
