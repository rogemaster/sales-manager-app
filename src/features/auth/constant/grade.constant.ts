/**
 * 사용자 등급 목록의 단일 정본. 타입(UserGrade·SubUserGrade)도 여기서 파생한다.
 * 예전에는 apiAuth·사용자 목록 스키마·사용자 등록 스키마가 각자 배열을 들고 있었다.
 */
export const USER_GRADES = ['super_admin', 'admin', 'operator'] as const;

/** 사용자 관리에서 등록할 수 있는 등급. super_admin은 가입으로만 생긴다. */
export const SUB_USER_GRADES = ['admin', 'operator'] as const;
