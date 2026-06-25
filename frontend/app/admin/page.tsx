"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

import {toAppHref} from "@/lib/app-href";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(toAppHref("/dashboard"));
  }, [router]);

  return null;
}
