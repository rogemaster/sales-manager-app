'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { HomeStats } from '@/features/home/types/home.types';

type Props = {
  stats: HomeStats;
};

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {value >= 15 ? `${name} ${value}%` : `${value}%`}
    </text>
  );
};

export const ProductStatusChart = ({ stats }: Props) => {
  const { total, onSale, soldOut, saleDis } = stats;
  const toPercent = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));

  const pieData = [
    { name: '판매중', value: toPercent(onSale), color: '#4CAF50' },
    { name: '품절', value: toPercent(soldOut), color: '#FF9800' },
    { name: '판매중지', value: toPercent(saleDis), color: '#F44336' },
  ];

  return (
    <div className="col-span-2 rounded-lg border bg-card p-6">
      <h2 className="text-base font-semibold mb-1">상품 상태 현황</h2>
      <hr className="mb-4" />
      <div className="flex items-center gap-8">
        <div className="w-56 h-56 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={105}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-4">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium">
                {item.name} {item.value}%
              </span>
            </div>
          ))}
          <hr className="my-1" />
          <div className="flex items-center gap-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
