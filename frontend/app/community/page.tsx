import {Users} from "lucide-react";

export default function CommunityPage() {
	return (
		<main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
			<section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 md:p-8">
				<div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
					<Users className="h-5 w-5" />
				</div>
				<h1 className="text-2xl font-semibold text-[var(--text-primary)]">Community</h1>
				<p className="mt-2 text-sm text-[var(--text-secondary)]">
					This space is now wired and reachable from the dashboard side panel. Community threads and shared cases can be added here next.
				</p>
			</section>
		</main>
	);
}
