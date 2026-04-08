"use client";

import {Sparkles} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {ChatInterface} from "@/components/chat/chat-interface";
import {DashboardSidebar, type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {ThemeToggle} from "@/components/ui/theme-toggle";

export default function ChatPage() {
	const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

	useEffect(() => {
		setSidebarCollapsed(window.localStorage.getItem("plantify-dashboard-sidebar-collapsed") === "true");
	}, []);

	const navItems = useMemo<DashboardNavItem[]>(() => {
		return [
			{id: "scan", label: "Scan", icon: "leaf", href: "/dashboard#scan"},
			{id: "analyze", label: "Analyze", icon: "activity", href: "/dashboard#analyze"},
			{id: "act", label: "Act", icon: "clipboard", href: "/dashboard#act"},
			{id: "scan-history", label: "History", icon: "history", href: "/scan-history"}
		];
	}, []);

	return (
		<div className={sidebarCollapsed ? "h-[100svh] overflow-hidden lg:pl-24" : "h-[100svh] overflow-hidden lg:pl-[22rem]"}>
			<DashboardSidebar
				collapsed={sidebarCollapsed}
				onCollapsedChange={setSidebarCollapsed}
				navItems={navItems}
				activeSection="chat"
			/>

			<main className="flex h-[100svh] min-h-0 flex-col overflow-hidden px-4 pb-4 pt-4 md:px-6">
				<header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,245,0.9))] px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))]">
					<div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
						<Sparkles className="h-3.5 w-3.5" />
						Advisor Live
					</div>

					<div className="flex items-center gap-2">
						<ThemeToggle />
					</div>
				</header>

				<section className="min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
					<ChatInterface />
				</section>
			</main>
		</div>
	);
}
