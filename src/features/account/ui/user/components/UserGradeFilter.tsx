'use client';

import { useAtom } from 'jotai';
import { userGradeAtom } from '@/features/account/store/userSearch.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
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
      allOption={ALL_FILTER_OPTION}
      triggerClassName="w-32"
    />
  );
};
