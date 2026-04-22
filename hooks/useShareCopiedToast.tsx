"use client";

import ShareCopiedToast from "@/components/ShareCopiedToast";
import { useCallback, useState } from "react";

export function useShareCopiedToast() {
  const [show, setShow] = useState(false);
  const onCopied = useCallback(() => {
    setShow(true);
    window.setTimeout(() => setShow(false), 2200);
  }, []);
  const node = <ShareCopiedToast show={show} />;
  return { node, onCopied };
}
