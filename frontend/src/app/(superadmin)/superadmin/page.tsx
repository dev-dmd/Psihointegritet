import { StatCard } from "@/components/panel/stat-card";
import { ActivityFeed } from "@/features/superadmin/components/activity-feed";
import { HealthCard } from "@/features/superadmin/components/health-card";
import { PageHeader } from "@/features/superadmin/components/page-header";
import { LAST_CHECK_INITIAL, platformStats } from "@/features/superadmin/data";
import { requireSuperadmin } from "@/lib/auth/guards";

/** Pregled platforme — 8 stat kartica, Platform Health, poslednja aktivnost. */
export default async function SuperadminOverviewPage() {
  await requireSuperadmin();

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Pregled platforme"
        description="Stanje sistema, tenanata i poslednja aktivnost — pretežno read-only."
      />
      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {platformStats.map((stat) => (
          <StatCard
            key={stat.label}
            value={stat.value}
            label={stat.label}
            dot={stat.dot}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        <HealthCard
          title="Platform Health"
          lastCheck={LAST_CHECK_INITIAL}
          lastCheckPrefix
        />
        <ActivityFeed />
      </div>
    </section>
  );
}
