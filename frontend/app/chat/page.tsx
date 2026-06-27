"use client";

import {Sparkles} from "lucide-react";
import {useMemo} from "react";

import {ChatInterface} from "@/components/chat/chat-interface";
import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";

export default function ChatPage() {
	const navItems = useMemo<DashboardNavItem[]>(() => {
		return [];
	}, []);

	return (
		<DashboardShell
			navItems={navItems}
			activeSection="chat"
			topBarLead={
				<div className="inline-flex items-center gap-2 rounded-full border border-[var(--ring)]/25 bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
					<Sparkles className="h-3.5 w-3.5" />
					Advisor Live
				</div>
			}
			contentClassName="overflow-hidden"
		>
			<section className="min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-md)]">
				<ChatInterface />
			</section>
		</DashboardShell>
	);
}
