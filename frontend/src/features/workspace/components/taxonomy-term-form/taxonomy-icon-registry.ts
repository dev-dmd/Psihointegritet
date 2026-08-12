/**
 * The visual marks a therapist may pick, as a curated catalogue.
 *
 * `iconKey` was a free-text input over a value **nothing renders** — no
 * consumer turns the stored key into a picture anywhere in the app. That made
 * it a field the author could only get wrong. The catalogue below defines the
 * allowed keys, so it can be safely introduced now, and a key can later be
 * repointed from a Lucide glyph to a custom illustration without touching a
 * single stored revision.
 *
 * `lucide-react` was already a dependency and unused; this is its first
 * consumer. Labels and search terms are Serbian because the picker is searched
 * in Serbian.
 */

import {
  Activity,
  Anchor,
  Baby,
  BedDouble,
  Brain,
  Briefcase,
  CloudRain,
  Compass,
  Flame,
  Flower2,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  LifeBuoy,
  type LucideIcon,
  MessageCircle,
  Moon,
  Scale,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Timer,
  Users,
  UserRound,
  Wind,
} from "lucide-react";

export interface TaxonomyIconEntry {
  /** Stored in `iconKey`; never changes once a term uses it. */
  key: string;
  label: string;
  searchTerms: readonly string[];
  icon: LucideIcon;
}

export const TAXONOMY_ICONS: readonly TaxonomyIconEntry[] = [
  {
    key: "person",
    label: "Osoba",
    searchTerms: ["osoba", "covek", "ja"],
    icon: UserRound,
  },
  {
    key: "conversation",
    label: "Razgovor",
    searchTerms: ["razgovor", "prica"],
    icon: MessageCircle,
  },
  {
    key: "thoughts",
    label: "Misli",
    searchTerms: ["misli", "um", "razmisljanje"],
    icon: Brain,
  },
  {
    key: "heart",
    label: "Srce",
    searchTerms: ["srce", "osecanja"],
    icon: Heart,
  },
  {
    key: "family",
    label: "Porodica",
    searchTerms: ["porodica", "dom"],
    icon: Users,
  },
  {
    key: "relationships",
    label: "Odnosi",
    searchTerms: ["odnosi", "veza", "bliskost"],
    icon: HeartHandshake,
  },
  {
    key: "support",
    label: "Podrška",
    searchTerms: ["podrska", "pomoc"],
    icon: LifeBuoy,
  },
  { key: "time", label: "Vreme", searchTerms: ["vreme", "tempo"], icon: Timer },
  {
    key: "rest",
    label: "Odmor",
    searchTerms: ["odmor", "pauza", "opustanje"],
    icon: Sun,
  },
  {
    key: "growth",
    label: "Rast",
    searchTerms: ["rast", "razvoj", "napredak"],
    icon: Sprout,
  },
  {
    key: "balance",
    label: "Ravnoteža",
    searchTerms: ["ravnoteza", "balans"],
    icon: Scale,
  },
  {
    key: "protection",
    label: "Zaštita",
    searchTerms: ["zastita", "sigurnost"],
    icon: Shield,
  },
  { key: "home", label: "Dom", searchTerms: ["dom", "kuca"], icon: Home },
  {
    key: "work",
    label: "Posao",
    searchTerms: ["posao", "karijera", "radno mesto"],
    icon: Briefcase,
  },
  {
    key: "sadness",
    label: "Tuga",
    searchTerms: ["tuga", "zalost", "placem"],
    icon: CloudRain,
  },
  {
    key: "energy",
    label: "Energija",
    searchTerms: ["energija", "snaga", "umor"],
    icon: Activity,
  },
  {
    key: "sleep",
    label: "San",
    searchTerms: ["san", "spavanje", "nesanica"],
    icon: Moon,
  },
  {
    key: "body",
    label: "Telo",
    searchTerms: ["telo", "telesno", "senzacije"],
    icon: Flower2,
  },
  {
    key: "breathing",
    label: "Disanje",
    searchTerms: ["disanje", "dah", "smirivanje"],
    icon: Wind,
  },
  {
    key: "boundaries",
    label: "Granice",
    searchTerms: ["granice", "ne", "odbijanje"],
    icon: Anchor,
  },
  {
    key: "change",
    label: "Promena",
    searchTerms: ["promena", "prelaz", "novo"],
    icon: Compass,
  },
  {
    key: "learning",
    label: "Učenje",
    searchTerms: ["ucenje", "skola", "studije"],
    icon: Sparkles,
  },
  {
    key: "group",
    label: "Grupa",
    searchTerms: ["grupa", "zajednica", "tim"],
    icon: Users,
  },
  { key: "child", label: "Dete", searchTerms: ["dete", "deca"], icon: Baby },
  {
    key: "parenting",
    label: "Roditeljstvo",
    searchTerms: ["roditeljstvo", "roditelj"],
    icon: Home,
  },
  {
    key: "couple",
    label: "Par",
    searchTerms: ["par", "partner", "brak"],
    icon: Handshake,
  },
  {
    key: "loneliness",
    label: "Usamljenost",
    searchTerms: ["usamljenost", "sam"],
    icon: BedDouble,
  },
  {
    key: "anger",
    label: "Ljutnja",
    searchTerms: ["ljutnja", "bes", "gnev"],
    icon: Flame,
  },
  {
    key: "safety",
    label: "Sigurnost",
    searchTerms: ["sigurnost", "mir", "stabilnost"],
    icon: Shield,
  },
  {
    key: "goal",
    label: "Cilj",
    searchTerms: ["cilj", "namera", "plan"],
    icon: Target,
  },
] as const;

const BY_KEY = new Map(TAXONOMY_ICONS.map((entry) => [entry.key, entry]));

export function findTaxonomyIcon(key: string | null | undefined) {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

/** Matches the visible label and the Serbian search terms, diacritic-tolerant. */
export function searchTaxonomyIcons(
  query: string,
): readonly TaxonomyIconEntry[] {
  const needle = query
    .trim()
    .toLocaleLowerCase("sr-Latn")
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (!needle) return TAXONOMY_ICONS;
  return TAXONOMY_ICONS.filter((entry) => {
    const label = entry.label
      .toLocaleLowerCase("sr-Latn")
      .replaceAll("đ", "dj")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    return (
      label.includes(needle) ||
      entry.searchTerms.some((term) => term.includes(needle))
    );
  });
}
