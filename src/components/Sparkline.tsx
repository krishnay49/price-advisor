/**
 * Plain SVG rather than a chart library: the dashboard renders one of these
 * per tracked product, and Recharts' ResponsiveContainer is heavy for a
 * 112x40 decoration with no axes or tooltips.
 */
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

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={down ? "#2F6F4F" : "#B4452C"}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
