export default function Sparkline({
  data,
  width = 140,
  height = 36,
  className = "text-accent",
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const y = (v: number) => height - ((v - min) / range) * (height - 2) - 1;
  const pts = data.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} fill="currentColor" fillOpacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
