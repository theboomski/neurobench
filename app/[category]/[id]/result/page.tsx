import { notFound } from "next/navigation";
import ResultShareLanding from "@/components/ResultShareLanding";
import { ALL_GAMES } from "@/lib/games";
import { buildResultShareMetadata } from "@/lib/resultMetadata";

type Props = {
  params: Promise<{ category: string; id: string }>;
  searchParams: Promise<{ z?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const [{ category, id }, sp] = await Promise.all([params, searchParams]);
  return buildResultShareMetadata(sp.z, category, id);
}

export default async function ResultPage({ params, searchParams }: Props) {
  const [{ category, id }, sp] = await Promise.all([params, searchParams]);
  const g = ALL_GAMES.find(x => x.id === id && x.category === category);
  if (!g) notFound();
  return <ResultShareLanding category={category} id={id} zParam={sp.z ?? ""} />;
}
