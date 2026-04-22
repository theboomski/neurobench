import ResultShareLanding from "@/components/ResultShareLanding";
import { buildResultShareMetadata } from "@/lib/resultMetadata";

type Props = { searchParams: Promise<{ z?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const sp = await searchParams;
  return buildResultShareMetadata(sp.z, "korean-tv", "red-light-green-light");
}

export default async function RlglResultPage({ searchParams }: Props) {
  const sp = await searchParams;
  return <ResultShareLanding category="korean-tv" id="red-light-green-light" zParam={sp.z ?? ""} />;
}
