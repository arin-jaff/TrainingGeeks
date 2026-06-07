import Link from "next/link";
import StatusScreen from "@/components/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      frown={3}
      eyebrow="404"
      title="This page doesn't exist"
      message="The page you're looking for isn't here. It may have moved, or never existed."
    >
      <Link
        href="/"
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Back home
      </Link>
    </StatusScreen>
  );
}
