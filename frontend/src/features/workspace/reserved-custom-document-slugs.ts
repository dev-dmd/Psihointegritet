export const RESERVED_CUSTOM_DOCUMENT_SLUGS = [
  "booking-widget",
  "cene",
  "kolacici",
  "kompas",
  "kontakt",
  "o-nama",
  "podrska-roditeljima",
  "pravila-zakazivanja",
  "privatnost",
  "pronadji-podrsku",
  "rad-sa-kompanijama",
  "radionice",
  "tim",
  "uslovi",
  "usluge",
  "zakazi",
  "znanje",
] as const;

export const reservedCustomDocumentSlugs = new Set<string>(
  RESERVED_CUSTOM_DOCUMENT_SLUGS,
);
