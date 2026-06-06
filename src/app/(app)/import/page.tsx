import FileUpload from "@/components/FileUpload";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-ink">Upload</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Import workouts from FIT files. Each file is parsed once, metrics are
        computed, and your fitness curves update automatically.
      </p>
      <FileUpload />
    </section>
  );
}
