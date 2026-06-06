export default function PagePlaceholder({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <section className="rounded border border-line bg-surface-card p-6">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
    </section>
  );
}
