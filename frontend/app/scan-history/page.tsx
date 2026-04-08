"use client";

import {History} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {useTranslations} from "next-intl";

import {DashboardSidebar, type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {ScanHistoryContent} from "@/components/scan-history/scan-history-content";
import {ThemeToggle} from "@/components/ui/theme-toggle";

export default function ScanHistoryPage() {
	const t = useTranslations("dashboard");
	const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

	useEffect(() => {
		setSidebarCollapsed(window.localStorage.getItem("plantify-dashboard-sidebar-collapsed") === "true");
	}, []);

	const navItems = useMemo<DashboardNavItem[]>(() => {
		return [
			{id: "scan", label: "Scan", icon: "leaf", href: "/dashboard#scan"},
			{id: "analyze", label: "Analyze", icon: "activity", href: "/dashboard#analyze"},
			{id: "act", label: "Act", icon: "clipboard", href: "/dashboard#act"},
			{id: "scan-history", label: t("history.title"), icon: "history", href: "/scan-history"}
		];
	}, [t]);

	return (
		<div className={sidebarCollapsed ? "lg:pl-24" : "lg:pl-[22rem]"}>
			<DashboardSidebar
				collapsed={sidebarCollapsed}
				onCollapsedChange={setSidebarCollapsed}
				navItems={navItems}
				activeSection="scan-history"
			/>

			<main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 md:px-6">
				<header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,245,0.9))] px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))]">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)]">
							<History className="h-4 w-4" />
						</div>
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">{t("history.title")}</p>
							<p className="text-xs text-[var(--text-tertiary)]">All previous scans in one place</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<ThemeToggle />
					</div>
				</header>

				<ScanHistoryContent />
			</main>
		</div>
	);
}
