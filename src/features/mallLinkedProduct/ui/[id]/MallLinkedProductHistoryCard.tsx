'use client';

import dayjs from 'dayjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useGetMallLinkedProductHistories } from '../../api/useGetMallLinkedProductHistories';

const ACTION_LABEL = { register: '신규 등록', update: '수정' } as const;
// 시뮬레이터가 없는 몰은 흉내낸 판정이다 — 실제 외부몰 응답과 구분해 보여준다.
const SOURCE_LABEL = { simulator: '외부몰 응답', random: '모의 판정' } as const;

export const MallLinkedProductHistoryCard = ({ id }: { id: string }) => {
  const { data: histories = [], isPending } = useGetMallLinkedProductHistories(id);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-primary" />
            <CardTitle className="text-sm">전송 이력</CardTitle>
          </div>
          <CardDescription>{histories.length}건</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* 한 화면에 이력 3개까지는 스크롤 없이 보이게 높이를 고정한다(헤더 h-16 + 바디 h-14 × 3 = 14.5rem).
            Table 컴포넌트 내부 div(data-slot="table-container")가 이미 overflow-x-auto라 여기에 새 스크롤 컨테이너를
            얹으면 sticky 헤더가 엉뚱한 조상 기준으로 고정된다 — 그 div 자체에 높이 제한을 건다.
            바깥 div의 overflow-hidden은 둥근 모서리만 자를 뿐 스크롤 컨테이너가 아니라 sticky에 영향이 없다. */}
        <div className="overflow-hidden rounded-xl border border-border/60 [&>[data-slot=table-container]]:max-h-[14.5rem] [&>[data-slot=table-container]]:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 z-10 h-16 border-b border-border/40 bg-muted hover:bg-muted">
                <TableHead className="w-40 text-center font-bold uppercase tracking-widest">전송일시</TableHead>
                <TableHead className="w-24 text-center font-bold uppercase tracking-widest">구분</TableHead>
                <TableHead className="w-20 text-center font-bold uppercase tracking-widest">결과</TableHead>
                <TableHead className="font-bold uppercase tracking-widest">사유</TableHead>
                <TableHead className="w-28 text-center font-bold uppercase tracking-widest">판정</TableHead>
                <TableHead className="w-44 text-center font-bold uppercase tracking-widest">실행자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && (
                <TableRow>
                  <TableCell colSpan={6} className="h-14 text-center text-muted-foreground">
                    불러오는 중...
                  </TableCell>
                </TableRow>
              )}
              {!isPending && histories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-14 text-center text-muted-foreground">
                    전송 이력이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {histories.map((history) => (
                <TableRow
                  key={history.id}
                  className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <TableCell className="text-center">{dayjs(history.sentAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell className="text-center">{ACTION_LABEL[history.action]}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={history.status === 'success' ? 'default' : 'destructive'}>
                      {history.status === 'success' ? '성공' : '실패'}
                    </Badge>
                  </TableCell>
                  {/* 필드 오류를 전부 담은 긴 문자열이라 말줄임하고 전체는 title로 보여준다 */}
                  <TableCell className="max-w-md truncate" title={history.errorMessage ?? ''}>
                    {history.errorMessage ?? '-'}
                  </TableCell>
                  <TableCell className="text-center">{SOURCE_LABEL[history.source]}</TableCell>
                  <TableCell className="text-center">{history.sentByEmail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
