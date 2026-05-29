'use client';

import { useAtom } from 'jotai';
import { userGradeAtom } from '@/features/account/store/userSearch.store';
import { ALL_USER_GRADE, USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { FilterSelect } from '@/components/common/FilterSelect';
import { UserGrade } from '@/features/auth/types/Auth';

export const UserGradeFilter = () => {
  const [grade, setGrade] = useAtom(userGradeAtom);

  return (
    <FilterSelect
      label="등급"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={grade}
      onValueChange={(v) => setGrade(v as UserGrade | 'ALL')}
      options={USER_GRADE_OPTIONS}
      allOption={ALL_USER_GRADE}
      triggerClassName="w-32"
    />
  );
};
