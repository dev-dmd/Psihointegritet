"use client";

import { StatusBadge } from "@/components/panel/status-badge";
import { formatDateSr } from "@/helpers/format-date";
import { localizedPath } from "@/lib/routes/localized-path";
import { useUiLocale } from "@/i18n/use-ui-locale";

import { groupWorkingHours, reasonLabel } from "../../availability-model";
import {
  useAvailabilitySummary,
  useMyTherapistProfile,
} from "../../hooks/use-availability";
import { AvailabilityCard } from "./availability-card";

/** Monday of the current week, as `YYYY-MM-DD`. */
function currentMonday(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

const MAX_EXCEPTION_ROWS = 3;

/**
 * „Moj profil" → tab Dostupnost: the four layers as preview + entry points
 * (design handoff §3/§4).
 *
 * The cards never edit inline. Each is a preview and a door — which is what
 * keeps card 2 honest: the slot count is derived from layer 1, so it has no
 * action of its own.
 */
export function AvailabilityOverviewCards() {
  const locale = useUiLocale();
  const me = useMyTherapistProfile();
  const weekStart = currentMonday();
  const summary = useAvailabilitySummary(me.data?.id ?? null, weekStart);

  if (me.isPending || summary.isPending) {
    return (
      <div className="text-ink-55 text-[13px]">Učitavanje dostupnosti…</div>
    );
  }

  if (me.data === null) {
    return (
      <div className="rounded-card border-warm/45 bg-warm/20 text-coffee border px-5 py-4 text-[13.5px] leading-[1.6]">
        Ovaj nalog nije povezan ni sa jednim terapeutskim profilom, pa nema
        raspored koji bi se prikazao.
      </div>
    );
  }

  if (summary.isError) {
    return (
      <div className="rounded-card border-badge-danger/40 bg-badge-danger-bg text-badge-danger border px-5 py-4 text-[13.5px]">
        Dostupnost trenutno nije mogla da se učita.
      </div>
    );
  }

  const data = summary.data;
  const groups = groupWorkingHours(data?.rules ?? []);
  const exceptions = data?.exceptions ?? [];
  const extraExceptions = Math.max(0, exceptions.length - MAX_EXCEPTION_ROWS);
  const isManual = data?.mode === "manual_slots";
  const slotCount = data?.derived_slot_count ?? 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-meadow/22 border-sage/30 rounded-card text-coffee border px-[18px] py-[13px] text-[13px]">
        <span className="font-bold">Četiri odvojena sloja:</span> radno vreme →
        slotovi → izuzeci → rezervisani kapacitet. Booking engine ih čita
        zasebno — raspoloživost nije isto što i termin.
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-2">
        {/* 1 — working hours */}
        <AvailabilityCard
          index={1}
          title="Radno vreme"
          editHref={localizedPath("workspace.schedule", {
            locale,
            tab: "radno-vreme",
          })}
          editLabel={groups.length === 0 ? "Unesi radno vreme" : "Uredi"}
        >
          {groups.length === 0 ? (
            <p className="text-ink-55 text-[13.5px] leading-[1.6]">
              Radno vreme još nije uneto — javni booking ne prikazuje termine.
            </p>
          ) : (
            <div className="text-ink-70 text-[14px] leading-[2]">
              {groups.map((group) => (
                <div key={`${group.daysLabel}-${group.timeLabel}`}>
                  {group.daysLabel} ·{" "}
                  <span className="text-forest font-semibold">
                    {group.timeLabel}
                  </span>
                  {group.formatLabel ? (
                    <span className="text-ink-55 ml-1.5 text-[12.5px]">
                      · {group.formatLabel}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </AvailabilityCard>

        {/* 2 — derived slots; no action by design */}
        <AvailabilityCard
          index={2}
          title="Raspoloživi slotovi"
          footerNote="Nastaje iz radnog vremena"
        >
          <p className="text-ink-70 mb-3 text-[14px] leading-[1.6]">
            {isManual
              ? "Termini se ne generišu automatski — nudite ih ručno u tabu Termini."
              : data?.mixed_durations
                ? "Generišu se iz radnog vremena; trajanje i pauza zavise od usluge. Klijent u javnom bookingu vidi samo ovo."
                : `Generišu se iz radnog vremena: ${String(data?.duration_minutes ?? 60)} min + ${String(data?.buffer_after_minutes ?? 0)} min pauze. Klijent u javnom bookingu vidi samo ovo.`}
          </p>
          {slotCount === 0 ? (
            <p className="text-badge-wait text-[13px] font-semibold">
              Nema raspoloživih termina ove nedelje.
            </p>
          ) : (
            <span className="bg-meadow/30 text-forest inline-flex rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold">
              {slotCount} {isManual ? "termina" : "slotova"} ove nedelje
            </span>
          )}
        </AvailabilityCard>

        {/* 3 — exceptions */}
        <AvailabilityCard
          index={3}
          title="Izuzeci"
          editHref={localizedPath("workspace.schedule", {
            locale,
            tab: "izuzeci",
          })}
          editLabel={exceptions.length === 0 ? "Dodaj izuzetak" : "Uredi"}
        >
          {exceptions.length === 0 ? (
            <p className="text-ink-45 text-[13.5px]">Nema unetih izuzetaka.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {exceptions.slice(0, MAX_EXCEPTION_ROWS).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2.5"
                >
                  <span className="text-coffee text-[14px] font-semibold">
                    {item.kind === "extra_available" ? "Dodatno: " : ""}
                    {reasonLabel(item.reason_code)}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                  <span className="text-ink-55 shrink-0 text-[13px]">
                    {formatDateSr(item.starts_at.slice(0, 10))}
                  </span>
                </div>
              ))}
              {extraExceptions > 0 ? (
                <span className="text-ink-45 text-[13px]">
                  + još {extraExceptions}
                </span>
              ) : null}
            </div>
          )}
        </AvailabilityCard>

        {/* 4 — company reserved capacity: read-only seam until R4 (D-073) */}
        <AvailabilityCard
          index={4}
          title="Rezervisani kapacitet"
          badge={<StatusBadge tone="amber">Planirano za R4</StatusBadge>}
        >
          <p className="text-ink-45 text-[13.5px] leading-[1.6]">
            Nema rezervisanog kapaciteta.
          </p>
          <p className="text-ink-55 mt-2 text-[13px] leading-[1.55]">
            Kapacitet rezervisan za kompanijski program troši vaše vreme, ali se
            ne prikazuje u javnom zakazivanju. Uređuje se na profilu kompanije.
          </p>
        </AvailabilityCard>
      </div>
    </div>
  );
}
