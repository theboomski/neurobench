import ResultShareLanding from "@/components/ResultShareLanding";
import { buildResultShareMetadata } from "@/lib/resultMetadata";

type Props = { searchParams: Promise<{ z?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const sp = await searchParams;
  return buildResultShareMetadata(sp.z, "brain-age", "sudoku");
}

export default async function SudokuResultPage({ searchParams }: Props) {
  const sp = await searchParams;
  return <ResultShareLanding category="brain-age" id="sudoku" zParam={sp.z ?? ""} />;
}
