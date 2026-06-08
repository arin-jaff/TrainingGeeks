import Link from "next/link";
import { GITHUB_URL } from "@/lib/constants";

export const metadata = {
  title: "Privacy Policy · TrainingGeeks",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="border-b border-line bg-nav">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <Link href="/login" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={22} height={22} className="rounded" />
            <span className="text-[15px] font-bold tracking-tight text-white">
              TRAINING<span className="text-accent">GEEKS</span>
            </span>
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-xs font-medium text-white/70 hover:text-white">
            GitHub →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink">Privacy Policy</h1>
        <p className="mt-1 text-sm text-ink-muted">Last updated: June 7, 2026</p>

        <p className="mt-6 text-sm leading-relaxed text-ink-muted">
          TrainingGeeks is a <strong className="text-ink">self-hosted, local-first</strong> training
          log. There is no TrainingGeeks company, server, or cloud account behind it — the
          application runs on a machine <em>you</em> control, and your data lives in a database on
          that machine. This policy explains what the software stores and how it behaves. Whoever
          operates an instance (likely you) is the data controller for the data in it.
        </p>

        <Section title="Data the app stores">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-ink">Profile.</strong> Name, email, units, time zone, date of birth, and a hash of your access password.</li>
            <li><strong className="text-ink">Training data.</strong> Planned and completed workouts, durations, distances, paces, power, calories, TSS/IF, notes, and training plans you schedule.</li>
            <li><strong className="text-ink">Health &amp; wellness.</strong> Metrics you log or sync — heart rate, HRV, resting HR, VO₂max, weight, sleep, mood — and injuries you record. You choose what to enter.</li>
            <li><strong className="text-ink">Equipment &amp; settings.</strong> Gear, zones, thresholds, and dashboard preferences.</li>
            <li><strong className="text-ink">Imported files.</strong> Activity files (FIT) you upload or that are pulled from a connected service, including GPS, heart-rate, and power streams.</li>
          </ul>
          <p>
            That&apos;s it. There are <strong className="text-ink">no analytics, no advertising, no
            trackers, and no telemetry</strong>. The app does not phone home.
          </p>
        </Section>

        <Section title="Where your data lives">
          <p>
            All of the above is stored in a local SQLite database on the machine running TrainingGeeks.
            It is never sent to us — because there is no &quot;us&quot; with a server. Backups, disk
            encryption, and access to that machine are under your control.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            TrainingGeeks integrates with <a className="text-accent hover:underline" href="https://intervals.icu" target="_blank" rel="noreferrer">intervals.icu</a>, and
            only when <em>you</em> enter your own Athlete ID and API key to enable sync. When enabled,
            your instance exchanges activity and planned-workout data directly with intervals.icu under
            <a className="text-accent hover:underline" href="https://intervals.icu/privacy" target="_blank" rel="noreferrer"> their privacy policy</a>.
            Remove the key to stop syncing. No other third parties receive your data.
          </p>
        </Section>

        <Section title="How data leaves your instance (only when you ask)">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-ink">intervals.icu sync</strong>, when you configure it.</li>
            <li><strong className="text-ink">CSV export</strong> you trigger from Settings.</li>
            <li>A <strong className="text-ink">calendar (.ics) feed</strong> you choose to expose with a token.</li>
          </ul>
          <p>Each of these is initiated by you. Nothing is shared automatically.</p>
        </Section>

        <Section title="Security">
          <p>
            Access is gated by a single password (stored only as a hash) and a signed session cookie.
            Because the app is self-hosted, securing the host is your responsibility — run it behind
            HTTPS, keep the machine patched, and protect the database file and your environment
            variables (which hold secrets like your intervals.icu API key). No system is perfectly
            secure.
          </p>
        </Section>

        <Section title="Your rights and control">
          <p>
            It is your database, so you have complete control: view, edit, export, or delete any record
            from within the app, or by operating on the database directly. There is no deletion request
            to file — removing data is something you do, not something you ask us to do.
          </p>
        </Section>

        <Section title="Children">
          <p>TrainingGeeks is not intended for use by anyone under 16.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            This policy may change as the software evolves. The authoritative version lives in the
            source repository, and its history is public.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, corrections, or concerns? Open an issue on{" "}
            <a className="text-accent hover:underline" href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer">GitHub</a>.
          </p>
        </Section>

        <div className="mt-10 border-t border-line pt-6 text-sm">
          <Link href="/login" className="font-medium text-accent hover:underline">← Back to sign in</Link>
        </div>
      </main>
    </div>
  );
}
