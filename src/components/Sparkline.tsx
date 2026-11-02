export default function Sparkline({ values, down }: { values: number[]; down: boolean }) {
  if (values.length < 2) {
    return <div className="h-10 w-28" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 112;
  const height = 40;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const gradientId = `sparkGrad-${down ? "down" : "up"}`;

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={down ? "#818cf8" : "#f87171"} stopOpacity={0.3} />
          <stop offset="100%" stopColor={down ? "#818cf8" : "#f87171"} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={down ? "#818cf8" : "#f87171"}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
