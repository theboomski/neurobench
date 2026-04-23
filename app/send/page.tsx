import { Suspense } from "react";
import SendPageClient from "./SendPageClient";
import { loadFunSendCategoryTemplatesFromDisk } from "@/lib/loadFunSendCategoryTemplates";
import { FUN_SEND_TABS, type FunSendCategory, type FunSendTemplate } from "@/lib/funSendTemplates";

export default function SendPage() {
  const templatesByCategory = FUN_SEND_TABS.reduce(
    (acc, { id }) => {
      acc[id] = loadFunSendCategoryTemplatesFromDisk(id);
      return acc;
    },
    {} as Record<FunSendCategory, FunSendTemplate[]>,
  );
  return (
    <Suspense fallback={null}>
      <SendPageClient templatesByCategory={templatesByCategory} />
    </Suspense>
  );
}
