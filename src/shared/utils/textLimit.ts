/** 사용자 입력 텍스트의 길이 상한. 컬럼이 text라 DB가 걸러주지 않으므로 폼과 route가 같은 값을 쓴다. */
export const TEXT_LIMITS = {
  email: 254,
  shortText: 100,
  longText: 500,
  password: 100,
  search: 100,
} as const;

export const maxLengthMessage = (max: number): string => `${max}자 이하로 입력해주세요.`;
