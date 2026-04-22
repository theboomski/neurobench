import { notFound } from "next/navigation";
import ResultShareLanding from "@/components/ResultShareLanding";
import { ALL_GAMES } from "@/lib/games";
import { buildResultShareMetadataGamesRoute } from "@/lib/resultMetadata";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ z?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return buildResultShareMetadataGamesRoute(sp.z, id);
}

export default async function GamesResultPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const g = ALL_GAMES.find(x => x.id === id);
  if (!g) notFound();
  return <ResultShareLanding category={g.category} id={g.id} zParam={sp.z ?? ""} />;
}
