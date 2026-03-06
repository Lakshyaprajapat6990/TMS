const colorMap = {
  blue:   { wrap: 'bg-blue-50 border-blue-100',   text: 'text-blue-700',   sub: 'text-blue-500'  },
  green:  { wrap: 'bg-green-50 border-green-100',  text: 'text-green-700',  sub: 'text-green-500' },
  red:    { wrap: 'bg-red-50 border-red-100',      text: 'text-red-700',    sub: 'text-red-500'   },
  yellow: { wrap: 'bg-yellow-50 border-yellow-100',text: 'text-yellow-700', sub: 'text-yellow-500'},
  purple: { wrap: 'bg-purple-50 border-purple-100',text: 'text-purple-700', sub: 'text-purple-500'},
};

export default function StatCard({ title, value, subtitle, color = 'blue', icon }) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border p-5 ${c.wrap}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${c.sub}`}>{title}</p>
          <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value}</p>
          {subtitle && <p className={`text-xs mt-1.5 ${c.sub}`}>{subtitle}</p>}
        </div>
        <span className="text-3xl flex-shrink-0">{icon}</span>
      </div>
    </div>
  );
}
