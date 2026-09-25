import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

// shadcn/ui 컴포넌트가 이 경로의 cn을 가져다 쓴다(components.json의 utils 별칭). 다른 유틸은 src/shared/utils에 둔다.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
