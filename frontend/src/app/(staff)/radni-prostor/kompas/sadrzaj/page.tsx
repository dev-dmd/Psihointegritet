import { redirect } from "next/navigation";

/**
 * Kompas content is a tab inside Kompas, not a separate destination. The path
 * stays valid so links and the editor's back button keep working.
 */
export default function KompasContentIndexPage() {
  redirect("/radni-prostor/kompas?tab=content");
}
