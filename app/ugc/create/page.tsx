import type { Metadata } from "next";
import UgcCreateClient from "@/components/ugc/UgcCreateClient";

export const metadata: Metadata = {
  title: "Create Game | ZAZAZA",
  description: "Create a community brackets or balance game and publish it on ZAZAZA.",
};

export default function UgcCreatePage() {
  return <UgcCreateClient />;
}
