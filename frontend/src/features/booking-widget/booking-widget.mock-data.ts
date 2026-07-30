import type {
  BookingService,
  BookingSlot,
  BookingTherapist,
  BookingWidgetBrand,
} from "./booking-widget.types";

function dateAfterToday(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const mockBrand: BookingWidgetBrand = {
  name: "Psihointegritet",
  subtitle: "Digitalni centar za mentalno zdravlje",
  logoUrl: "/logo/psihointegritet-logo.png",
};

export const mockService: BookingService = {
  id: "service-1",
  slug: "bracno-savetovanje",
  name: "Bračno savetovanje",
  durationMinutes: 90,
  price: 5500,
  currency: "RSD",
  formats: ["online", "uzivo"],
};

export const mockTherapist: BookingTherapist = {
  id: "therapist-1",
  slug: "anja-stamenkovic",
  name: "Anja Stamenković",
  avatarUrl: "/images/therapists/anja.jpeg",
};

const slotHours = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

export const mockSlots: BookingSlot[] = [
  ...slotHours.map((startTime) => {
    const date = dateAfterToday(2);
    const endHour = Number(startTime.slice(0, 2)) + 1;

    return {
      id: `slot-${date}-${startTime}`,
      date,
      startTime,
      endTime: `${String(endHour).padStart(2, "0")}:00`,
      available: true,
    };
  }),
  ...["09:00", "10:00", "11:00", "12:00"].map((startTime, index) => {
    const date = dateAfterToday(5);
    const endHour = Number(startTime.slice(0, 2)) + 1;

    return {
      id: `slot-${date}-${startTime}`,
      date,
      startTime,
      endTime: `${String(endHour).padStart(2, "0")}:00`,
      available: index > 1,
    };
  }),
];

export const mockServices: BookingService[] = [mockService];
export const mockTherapists: BookingTherapist[] = [mockTherapist];
