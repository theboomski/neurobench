import { Suspense } from "react";
import SendPageClient from "./SendPageClient";
import { loadFunSendCategoryTemplatesFromDisk } from "@/lib/loadFunSendCategoryTemplates";
import { FUN_SEND_TABS, type FunSendCategory, type FunSendTemplate } from "@/lib/funSendTemplates";

export const dynamic = "force-dynamic";

type SendPageProps = { searchParams: Promise<{ resume?: string }> };

export default async function SendPage({ searchParams }: SendPageProps) {
  const sp = await searchParams;
  const resumeDraft = sp.resume === "1";
  const templatesByCategory = FUN_SEND_TABS.reduce(
    (acc, { id }) => {
      acc[id] = loadFunSendCategoryTemplatesFromDisk(id);
      return acc;
    },
    {} as Record<FunSendCategory, FunSendTemplate[]>,
  );
  return (
    <Suspense fallback={null}>
      <SendPageClient templatesByCategory={templatesByCategory} resumeDraft={resumeDraft} />
    </Suspense>
  );
}
