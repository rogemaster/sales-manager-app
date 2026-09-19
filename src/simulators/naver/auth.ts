import type { NaverRepository } from './repository';
import type { NaverSeller, SimulatorResult } from './types';

const BEARER_PREFIX = 'Bearer ';

/** 실제 네이버는 OAuth2 토큰을 이 자리에 넣는다. 흐름은 흉내내지 않고 값만 고정 키로 둔다. */
export const extractApiKey = (authorization: string | null | undefined): string | null => {
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) return null;
  const apiKey = authorization.slice(BEARER_PREFIX.length).trim();
  return apiKey.length > 0 ? apiKey : null;
};

export const authenticate = async (
  repository: NaverRepository,
  authorization: string | null | undefined,
): Promise<SimulatorResult<NaverSeller>> => {
  const apiKey = extractApiKey(authorization);
  if (!apiKey) return { ok: false, reason: 'UNAUTHORIZED', invalidInputs: [] };

  const seller = await repository.findSellerByApiKey(apiKey);
  if (!seller) return { ok: false, reason: 'UNAUTHORIZED', invalidInputs: [] };

  return { ok: true, data: seller };
};
