"use client";

import {Users} from "lucide-react";
import {use, useMemo} from "react";

import {CommunityExperience} from "@/components/community/community-experience";
import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {getStoredProfile} from "@/lib/api";

export default function CommunityThreadPage({params}: {params: Promise<{postId: string}>}) {
  const resolvedParams = use(params);
  const profile = typeof window === "undefined" ? null : getStoredProfile();

  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="community"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          <Users className="h-3.5 w-3.5" />
          Community Thread
        </div>
      }
      contentClassName="overflow-hidden"
    >
      <CommunityExperience profile={profile} initialPostId={resolvedParams.postId} />
    </DashboardShell>
  );
}
