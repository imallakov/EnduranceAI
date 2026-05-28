import React, { useState } from 'react';

interface DataPoint {
  day: number;
  ctl: number;
  atl: number;
  tsb: number;
}

interface LineChartProps {
  width?: number;
  height?: number;
  data: DataPoint[];
  padding?: { t: number; r: number; b: number; l: number };
}

const TODAY = new Date();

function dateAt(i: number, n: number): Date {
  const d = new Date(TODAY);
  d.setDate(TODAY.getDate() - (n - 1 - i));
  return d;
}

function dateLabel(d: Date): string {
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
}

const LineChart: React.FC<LineChartProps> = ({
  width = 720,
  height = 240,
  data,
  padding = { t: 12, r: 16, b: 28, l: 36 },
}) => {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  const w = width, h = height;
  const iw = w - padding.l - padding.r;
  const ih = h - padding.t - padding.b;
  const yMin = -30, yMax = 80;
  const n = data.length;

  const xAt = (i: number) => padding.l + (i / (n - 1)) * iw;
  const yAt = (v: number) => padding.t + (1 - (v - yMin) / (yMax - yMin)) * ih;
  const yZero = yAt(0);

  const pathFor = (key: keyof DataPoint) =>
    data.map((d, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(2)},${yAt(d[key] as number).toFixed(2)}`).join(' ');

  const yTicks = [-25, 0, 25, 50, 75];
  const xTickIdx = [0, 14, 28, 42, 56, 70, 83];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scaledX = (x / rect.width) * w;
    const i = Math.max(0, Math.min(n - 1, Math.round(((scaledX - padding.l) / iw) * (n - 1))));
    setHover({ i, x: xAt(i), y: yAt(data[i].ctl) });
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Y gridlines */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padding.l} x2={w - padding.r}
              y1={yAt(t)} y2={yAt(t)}
              stroke={t === 0 ? '#D6D3D1' : '#F1EFEC'}
              strokeWidth="1"
            />
            <text
              x={padding.l - 8} y={yAt(t) + 3}
              textAnchor="end"
              style={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Geist Mono Variable, monospace' }}
            >{t}</text>
          </g>
        ))}

        {/* X labels */}
        {xTickIdx.map((i) => (
          <text
            key={i} x={xAt(i)} y={h - 8}
            textAnchor="middle"
            style={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Inter, sans-serif' }}
          >{dateLabel(dateAt(i, n))}</text>
        ))}

        {/* TSB baseline fill */}
        <path
          d={`${pathFor('tsb')} L ${xAt(n - 1)},${yZero} L ${xAt(0)},${yZero} Z`}
          fill="#10B981" opacity="0.06"
        />

        {/* CTL — indigo solid */}
        <path d={pathFor('ctl')} fill="none" stroke="#4F46E5" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />
        {/* ATL — coral dashed */}
        <path d={pathFor('atl')} fill="none" stroke="#F97066" strokeWidth="2"
              strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
        {/* TSB — emerald thin */}
        <path d={pathFor('tsb')} fill="none" stroke="#10B981" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round" />

        {/* Endpoint dots */}
        <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].ctl)} r="3.5" fill="#4F46E5" />
        <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].atl)} r="3.5" fill="#F97066" />
        <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].tsb)} r="3" fill="#10B981" />

        {/* Hover crosshair */}
        {hover && (
          <g>
            <line
              x1={hover.x} x2={hover.x}
              y1={padding.t} y2={h - padding.b}
              stroke="#1E1B4B" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
            />
            <circle cx={hover.x} cy={yAt(data[hover.i].ctl)} r="3.5" fill="#fff" stroke="#4F46E5" strokeWidth="2" />
            <circle cx={hover.x} cy={yAt(data[hover.i].atl)} r="3.5" fill="#fff" stroke="#F97066" strokeWidth="2" />
            <circle cx={hover.x} cy={yAt(data[hover.i].tsb)} r="3" fill="#fff" stroke="#10B981" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover && (
        <div
          className="chart-tooltip mono"
          style={{
            left: `${(hover.x / w) * 100}%`,
            top: `${(yAt(data[hover.i].ctl) / h) * 100}%`,
          }}
        >
          <div style={{ fontFamily: 'Inter', fontSize: 10, opacity: 0.7, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {dateLabel(dateAt(hover.i, n))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 12, rowGap: 2 }}>
            <span style={{ color: '#A5B4FC' }}>CTL</span><span>{data[hover.i].ctl.toFixed(1)}</span>
            <span style={{ color: '#FCA5A5' }}>ATL</span><span>{data[hover.i].atl.toFixed(1)}</span>
            <span style={{ color: '#6EE7B7' }}>TSB</span>
            <span>{data[hover.i].tsb >= 0 ? '+' : ''}{data[hover.i].tsb.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChart;
