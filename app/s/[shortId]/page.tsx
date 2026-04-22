import { notFound } from "next/navigation";
import ResultShareLanding from "@/components/ResultShareLanding";
import { buildShortResultShareMetadata } from "@/lib/resultMetadata";
import { getSharedResultPayload } from "@/lib/sharedResults";

type Props = {
  params: Promise<{ shortId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { shortId } = await params;
  return buildShortResultShareMetadata(shortId);
}

export default async function SharedResultPage({ params }: Props) {
  const { shortId } = await params;
  const payload = await getSharedResultPayload(shortId);
  if (!payload) notFound();
  return <ResultShareLanding payload={payload} />;
}
