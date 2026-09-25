import 'server-only';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { detectImageType, DetectedImage } from '@/lib/storage';
import {
  INVALID_IMAGE_URL_MESSAGE,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_SIZE_LABEL,
  MAX_IMAGE_URL_LENGTH,
} from '@/shared/constant/upload.constant';

export type RemoteImageErrorCode =
  | 'INVALID_URL'
  | 'BLOCKED_ADDRESS'
  | 'HTTP_ERROR'
  | 'TOO_MANY_REDIRECTS'
  | 'TIMEOUT'
  | 'TOO_LARGE'
  | 'NOT_IMAGE'
  | 'NETWORK_ERROR';

export class RemoteImageError extends Error {
  constructor(
    readonly code: RemoteImageErrorCode,
    readonly status?: number,
  ) {
    super(code);
    this.name = 'RemoteImageError';
  }
}

export const remoteImageErrorMessage = (error: RemoteImageError): string => {
  switch (error.code) {
    case 'INVALID_URL':
      return INVALID_IMAGE_URL_MESSAGE;
    case 'BLOCKED_ADDRESS':
      return '허용되지 않는 주소입니다.';
    case 'HTTP_ERROR':
      return `이미지를 불러올 수 없습니다(HTTP ${error.status ?? '알 수 없음'}).`;
    case 'TOO_MANY_REDIRECTS':
      return '리다이렉트가 너무 많습니다.';
    case 'TIMEOUT':
      return '응답 시간이 초과되었습니다.';
    case 'TOO_LARGE':
      return `${MAX_IMAGE_SIZE_LABEL} 이하 이미지만 사용할 수 있습니다.`;
    case 'NOT_IMAGE':
      return 'PNG 또는 JPG 이미지가 아닙니다.';
    case 'NETWORK_ERROR':
      return '이미지 서버에 연결할 수 없습니다.';
  }
};

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export const readImageUrl = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) return null;
  const { url } = body as { url?: unknown };
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed && trimmed.length <= MAX_IMAGE_URL_LENGTH ? trimmed : null;
};

// ─── 주소 차단 판정 ───────────────────────────────────────────────

const ipv4ToInt = (ip: string): number => ip.split('.').reduce((acc, part) => acc * 256 + Number(part), 0);

const BLOCKED_V4: [base: string, bits: number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // 링크로컬 — 클라우드 메타데이터(169.254.169.254) 포함
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['224.0.0.0', 4], // 멀티캐스트
  ['240.0.0.0', 4], // 예약 — 255.255.255.255 포함
];

const inV4Range = (ip: string, base: string, bits: number): boolean => {
  const size = 2 ** (32 - bits);
  return Math.floor(ipv4ToInt(ip) / size) === Math.floor(ipv4ToInt(base) / size);
};

/** net.isIPv6가 참인 값을 16비트 그룹 8개로 펼친다. 끝이 IPv4 표기(`::ffff:1.2.3.4`)여도 처리한다. */
const expandIPv6 = (ip: string): number[] => {
  let value = ip.toLowerCase();
  const zoneIndex = value.indexOf('%');
  if (zoneIndex !== -1) value = value.slice(0, zoneIndex);

  const embeddedV4 = value.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (embeddedV4) {
    const n = ipv4ToInt(embeddedV4[1]);
    value = `${value.slice(0, -embeddedV4[1].length)}${Math.floor(n / 65536).toString(16)}:${(n % 65536).toString(16)}`;
  }

  const [head, tail] = value.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const fill = value.includes('::') ? 8 - headParts.length - tailParts.length : 0;
  return [...headParts, ...Array<string>(fill).fill('0'), ...tailParts].map((part) => parseInt(part, 16));
};

const groupsToV4 = (high: number, low: number): string =>
  [Math.floor(high / 256), high % 256, Math.floor(low / 256), low % 256].join('.');

/**
 * 서버가 대신 요청해서는 안 되는 주소인지 판정한다. 판정할 수 없는 값은 막는다.
 * 여기서 막지 못하면 로그인한 사용자가 서버를 통해 내부망·클라우드 메타데이터를 읽을 수 있다(SSRF).
 */
export const isBlockedAddress = (ip: string): boolean => {
  if (net.isIPv4(ip)) return BLOCKED_V4.some(([base, bits]) => inV4Range(ip, base, bits));
  if (!net.isIPv6(ip)) return true;

  const g = expandIPv6(ip);
  const isZero = (from: number, to: number) => g.slice(from, to).every((part) => part === 0);

  if (isZero(0, 5) && g[5] === 0xffff) return isBlockedAddress(groupsToV4(g[6], g[7])); // ::ffff:0:0/96
  if (g[0] === 0x64 && g[1] === 0xff9b && isZero(2, 6)) return isBlockedAddress(groupsToV4(g[6], g[7])); // NAT64
  if (isZero(0, 8)) return true; // ::
  if (isZero(0, 7) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8
  return false;
};

// ─── URL 사전 검사 ────────────────────────────────────────────────

export const parseRemoteImageUrl = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RemoteImageError('INVALID_URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new RemoteImageError('INVALID_URL');
  // WHATWG URL은 스킴의 기본 포트를 빈 문자열로 정규화한다. 값이 남아 있으면 기본 포트가 아니다.
  if (url.port !== '') throw new RemoteImageError('INVALID_URL');
  if (url.username || url.password) throw new RemoteImageError('INVALID_URL');

  // IP 리터럴은 lookup을 거치지 않고 바로 연결되므로 여기서 막아야 한다.
  // `2130706433`·`0x7f.1` 같은 변형은 URL 파서가 이미 `127.0.0.1`로 정규화해 준다.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedAddress(host)) throw new RemoteImageError('BLOCKED_ADDRESS');

  return url;
};

// ─── 연결 ─────────────────────────────────────────────────────────

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void;

/**
 * 해석한 주소를 검사한 뒤 **그 주소로** 연결하게 한다. fetch 전에 따로 조회하면 조회와 연결 사이에
 * DNS 응답이 내부 주소로 바뀌는 공격(DNS rebinding)을 막을 수 없다.
 * 주소가 여러 개면 하나라도 차단 대상일 때 거부한다 — 연결 단계에서 어느 주소가 고를지 모르기 때문이다.
 */
export const safeLookup = (hostname: string, options: dns.LookupOptions, callback: LookupCallback): void => {
  // all: true를 명시한 타입으로 넘겨야 addresses가 배열인 오버로드가 선택된다.
  const lookupOptions: dns.LookupAllOptions = { ...options, all: true };
  dns.lookup(hostname, lookupOptions, (err, addresses) => {
    if (err) return callback(err, '');
    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
      return callback(new RemoteImageError('BLOCKED_ADDRESS'), '');
    }
    // Node 20은 autoSelectFamily 때문에 all: true로 호출하는 경우가 있다. 그때는 배열을 돌려줘야 한다.
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
};

type RawResponse = { status: number; location?: string; body?: Buffer };

const requestOnce = (url: URL, signal: AbortSignal): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(
      url,
      {
        method: 'GET',
        signal,
        // http.request의 lookup 타입은 net.LookupFunction 오버로드 묶음이라 구현 시그니처와 직접 맞지 않는다.
        lookup: safeLookup as unknown as net.LookupFunction,
        headers: { Accept: 'image/png,image/jpeg' },
      },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400) {
          res.resume();
          resolve({ status, location: res.headers.location });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          resolve({ status });
          return;
        }

        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
          res.destroy();
          reject(new RemoteImageError('TOO_LARGE'));
          return;
        }

        // Content-Length가 없거나 거짓이어도 받은 양으로 다시 끊는다.
        const chunks: Buffer[] = [];
        let received = 0;
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > MAX_IMAGE_BYTES) {
            res.destroy();
            reject(new RemoteImageError('TOO_LARGE'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ status, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });

const isBlockedLookupError = (error: unknown): boolean =>
  error instanceof RemoteImageError || (error as { code?: unknown })?.code === 'BLOCKED_ADDRESS';

/**
 * 리다이렉트 응답의 `Location`은 원격 서버가 마음대로 채우는 값이라 `new URL(location, current)`이
 * `TypeError`를 던질 수 있다(예: `http://[`, `https://exa mple.com/`). 여기서 잡지 않으면 분류되지 않은
 * TypeError가 그대로 새어나가 route handler에서 500이 된다 — 모든 실패는 `RemoteImageError`여야 한다.
 * 해석에 성공한 뒤에는 `parseRemoteImageUrl`로 다시 태워 스킴·포트·IP 차단 검사를 동일하게 적용한다.
 */
export const resolveRedirectUrl = (location: string, current: URL): URL => {
  let resolved: string;
  try {
    resolved = new URL(location, current).toString();
  } catch {
    throw new RemoteImageError('INVALID_URL');
  }
  return parseRemoteImageUrl(resolved);
};

/**
 * 외부 이미지를 내려받아 PNG·JPG인지 판정한다. 응답의 Content-Type은 믿지 않는다.
 * 리다이렉트는 자동으로 따르지 않고 매 단계 URL 검사와 주소 검사를 다시 태운다.
 */
export const fetchRemoteImage = async (value: string): Promise<{ buffer: Buffer; detected: DetectedImage }> => {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = parseRemoteImageUrl(value);

  for (let redirects = 0; ; redirects += 1) {
    let res: RawResponse;
    try {
      res = await requestOnce(url, signal);
    } catch (error) {
      if (error instanceof RemoteImageError && error.code !== 'BLOCKED_ADDRESS') throw error;
      if (isBlockedLookupError(error)) throw new RemoteImageError('BLOCKED_ADDRESS');
      if (signal.aborted) throw new RemoteImageError('TIMEOUT');
      throw new RemoteImageError('NETWORK_ERROR');
    }

    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new RemoteImageError('HTTP_ERROR', res.status);
      if (redirects >= MAX_REDIRECTS) throw new RemoteImageError('TOO_MANY_REDIRECTS');
      url = resolveRedirectUrl(res.location, url);
      continue;
    }

    if (!res.body) throw new RemoteImageError('HTTP_ERROR', res.status);

    const detected = detectImageType(res.body);
    if (!detected) throw new RemoteImageError('NOT_IMAGE');
    return { buffer: res.body, detected };
  }
};
