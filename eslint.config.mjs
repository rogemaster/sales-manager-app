import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // 가짜 외부몰은 우리 도메인을 모른다. import 금지선이 곧 네트워크 경계다.
    files: ['src/simulators/**/*.ts', 'src/app/api/external/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/**', '**/features/**'],
              message: '시뮬레이터는 우리 도메인 타입을 알면 안 된다 — 네이버 이름으로 자체 정의할 것.',
            },
            {
              group: ['@/mocks/*', '@/mocks/**', '**/mocks/**'],
              message: '시뮬레이터는 MSW mock을 알면 안 된다.',
            },
            {
              group: ['@/db/schema', '**/db/schema'],
              message: '시뮬레이터는 우리 테이블을 읽지 않는다 — 네이버 테이블은 src/simulators/naver/schema.ts에 있다.',
            },
            {
              group: ['**/shared/**', '**/types/**', '**/utils/**', '**/constant/**', '**/components/**'],
              message: '시뮬레이터는 우리 공용 모듈도 쓰지 않는다 — 필요한 값은 자기 이름으로 복제할 것.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
