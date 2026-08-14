"use client";

import { useTranslations } from "next-intl";

import type { BookingWidgetCopy } from "../booking-widget.types";

/** Single catalogue mapper used by every BookingWidget host, including demos. */
export function useBookingWidgetCopy(): BookingWidgetCopy {
  const t = useTranslations("public.bookingWidget");

  return {
    title: t("title"),
    requestNotice: t("requestNotice"),
    nextAvailableLabel: t("nextAvailable"),
    cancelLabel: t("cancel"),
    notifyLabel: t("notify"),
    bookLabel: t("book"),
    onlineLabel: t("online"),
    inPersonLabel: t("inPerson"),
    offeringsHeadingTemplate: t("offeringsHeading", { name: "{name}" }),
    otherTherapistsLabel: t("otherTherapists"),
    yourSelectionLabel: t("yourSelection"),
    backLabel: t("back"),
    backAriaLabel: t("backToRecommendations"),
    previousOfferingLabel: t("previousOffering"),
    nextOfferingLabel: t("nextOffering"),
    previousTherapistsLabel: t("previousTherapists"),
    nextTherapistsLabel: t("nextTherapists"),
    loadingOfferingsLabel: t("loadingOfferings"),
    noOfferingsMessage: t("noOfferings"),
    availabilityErrorMessage: t("availabilityError"),
  };
}
