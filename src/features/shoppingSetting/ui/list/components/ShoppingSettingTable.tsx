'use client';

import { useAtom } from 'jotai';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { selectedSettingsAtom } from '@/features/shoppingSetting/store/search.store';
import { SHOPPING_SETTING_TABLE_HEAD } from '@/features/shoppingSetting/constant/shoppingSetting.constants';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { useAlert } from '@/hooks/useAlert';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

interface ShoppingSettingTableProps {
  settings: ShoppingSetting[];
}

export const ShoppingSettingTable = ({ settings }: ShoppingSettingTableProps) => {
  const [selectedSettings, setSelectedSettings] = useAtom(selectedSettingsAtom);
  const { showAlert } = useAlert();

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSettings((prev) => [...prev, id]);
    } else {
      setSelectedSettings((prev) => prev.filter((v) => v !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedSettings(checked ? settings.map((s) => s.id) : []);
  };

  const notReady = () => showAlert({ message: '준비중인 기능입니다.', type: 'info' });

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={settings.length > 0 && selectedSettings.length === settings.length}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {SHOPPING_SETTING_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="text-center font-bold uppercase tracking-widest">
              {item.title}
            </TableHead>
          ))}
          <TableHead className="text-center font-bold uppercase tracking-widest">수정</TableHead>
          <TableHead className="text-center font-bold uppercase tracking-widest">복사</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {settings.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={SHOPPING_SETTING_TABLE_HEAD.length + 3}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              조건에 맞는 설정이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          settings.map((setting) => (
            <TableRow
              key={setting.id}
              className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
            >
              <TableCell>
                <Checkbox
                  checked={selectedSettings.includes(setting.id)}
                  onCheckedChange={(checked: boolean) => handleSelect(setting.id, checked)}
                />
              </TableCell>
              <TableCell className="text-center">{getMallName(setting.mallCode)}</TableCell>
              <TableCell className="text-center">{setting.mallId}</TableCell>
              <TableCell className="text-left">{setting.nickname || '-'}</TableCell>
              <TableCell className="text-center">
                <Badge variant={setting.isActive ? 'default' : 'secondary'}>
                  {setting.isActive ? '사용' : '미사용'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{setting.createdAt}</TableCell>
              <TableCell className="text-center">{setting.updatedAt}</TableCell>
              <TableCell className="text-center">
                <Button variant="outline" size="sm" onClick={notReady}>
                  수정
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <Button variant="outline" size="sm" onClick={notReady}>
                  복사
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
