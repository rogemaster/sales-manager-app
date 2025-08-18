import { ExcelTemplate } from '@/types/ExcelInterface';

export const ExcelTemplateInfo = ({ templateTitle: title, template }: ExcelTemplate) => {
  return (
    <div className="mt-4 text-sm text-muted-foreground">
      <p className="font-medium mb-2">{title}</p>
      <ul className="list-disc list-inside space-y-1">
        {template.length > 0 &&
          template.map((item) => (
            <li key={item.name}>
              {item.name} {item.req ? '(필수)' : '(선택)'}
            </li>
          ))}
      </ul>
    </div>
  );
};
