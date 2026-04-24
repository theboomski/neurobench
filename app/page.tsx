import HomePageClient from "./HomePageClient";
import { fetchGamePlayCountsFromDb } from "@/lib/serverGamePlayCounts";

/** Home “Popular” uses DB counts; refresh periodically without reorder flash on first paint. */
export const revalidate = 120;

export default async function HomePage() {
  const result = await fetchGamePlayCountsFromDb();
  const initialPlayCounts = result.ok ? result.counts : {};
  return <HomePageClient initialPlayCounts={initialPlayCounts} />;
}
