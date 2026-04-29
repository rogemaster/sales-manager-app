import { HomeStats } from '@/features/home/types/home.types';

type Props = {
  stats: HomeStats;
};

export const StatCards = ({ stats }: Props) => {
  const cards = [
    { label: '판매 상품', value: stats.total.toLocaleString(), bg: 'bg-[#00BCD4]' },
    { label: '판매중 상품', value: stats.onSale.toLocaleString(), bg: 'bg-[#4CAF50]' },
    { label: '품절 상품', value: stats.soldOut.toLocaleString(), bg: 'bg-[#FF9800]' },
    { label: '판매중지 상품', value: stats.saleDis.toLocaleString(), bg: 'bg-[#F44336]' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} rounded-lg p-5 text-white`}>
          <p className="text-sm font-medium opacity-90 mb-2">{card.label}</p>
          <p className="text-4xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
};
