"use client";

import {Users} from "lucide-react";
import {useMemo} from "react";
import {useEffect, useState} from "react";

import {CommunityExperience} from "@/components/community/community-experience";
import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {getStoredProfile} from "@/lib/api";

export default function CommunityPage() {
  const [profile, setProfile] = useState<ReturnType<typeof getStoredProfile>>(null);

  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="community"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ring)]/25 bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
          <Users className="h-3.5 w-3.5" />
          Community
        </div>
      }
      contentClassName="overflow-hidden"
    >
      <CommunityExperience profile={profile} />
    </DashboardShell>
  );
}
