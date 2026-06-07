import StatusScreen from "./StatusScreen";

/** Placeholder for features that aren't built yet. */
export default function ComingSoon({
  feature,
  frown = 2,
}: {
  feature: string;
  frown?: 1 | 2 | 3;
}) {
  return (
    <StatusScreen
      frown={frown}
      eyebrow="Coming soon"
      title={`${feature} isn't here yet`}
      message={
        <>
          We haven&apos;t built {feature} yet — it&apos;s on the way. Want it
          sooner? It&apos;s open source: grab the code and build it yourself.
        </>
      }
      githubLabel="Build it on GitHub"
    />
  );
}
