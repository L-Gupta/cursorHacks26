import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="mono text-[10px] p-2 rounded-sm"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)' }}
    >
      <div style={{ color: 'var(--text-secondary)' }}>T+{label}s</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function CredibilityTimeline({ credibilityHistory }) {
  const data = credibilityHistory.length > 0
    ? credibilityHistory
    : [{ time: 0, ceoScore: 100, cfoScore: 100 }];

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>CREDIBILITY TIMELINE</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00d4ff' }} />
            <span className="mono text-[8px]" style={{ color: '#00d4ff' }}>CEO</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ffab00' }} />
            <span className="mono text-[8px]" style={{ color: '#ffab00' }}>CFO</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-2 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="ceoCred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cfoCred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffab00" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ffab00" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={(v) => `${v}s`} />
            <YAxis domain={[0, 100]} orientation="right" axisLine={false} tickLine={false} width={25} />
            <ReferenceLine y={50} stroke="var(--text-dim)" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="ceoScore" stroke="#00d4ff" strokeWidth={1.5} fill="url(#ceoCred)" name="CEO" dot={false} />
            <Area type="monotone" dataKey="cfoScore" stroke="#ffab00" strokeWidth={1.5} fill="url(#cfoCred)" name="CFO" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
