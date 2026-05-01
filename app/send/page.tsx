import type { Metadata } from "next";
import { Suspense } from "react";
import SendPageClient from "./SendPageClient";
import { loadFunSendCategoryTemplatesFromDisk } from "@/lib/loadFunSendCategoryTemplates";
import { FUN_SEND_TABS, type FunSendCategory, type FunSendTemplate } from "@/lib/funSendTemplates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fun Sends – Send AI Cards to Friends & Loved Ones | ZAZAZA",
  description:
    "Send a free personalized card with your pictures. I love you, Happy Birthday, Thank you, I'm Sorry and more. Free, instant, no signup needed.",
  openGraph: {
    title: "Fun Sends – Send AI Cards to Friends & Loved Ones | ZAZAZA",
    description:
      "Send a free personalized card with your pictures. I love you, Happy Birthday, Thank you, I'm Sorry and more. Free, instant, no signup needed.",
    url: "https://zazaza.app/send",
  },
};

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
