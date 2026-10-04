/**
 * ilike 부분일치(`%검색어%`)에 넣기 전에 검색어를 이스케이프한다. Postgres LIKE의 기본 이스케이프 문자는 \ 다.
 * 이스케이프하지 않으면 `%`는 "아무거나", `_`는 "아무 글자 하나"가 되어 '50%'가 '500ml'에도 걸리고 '%' 하나로 전체가 나온다.
 * 목록 route의 검색어 부분일치는 전부 이 함수를 거친다.
 */
export const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);
