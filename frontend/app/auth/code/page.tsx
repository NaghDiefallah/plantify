import {redirect} from "next/navigation";

export default function LegacyAuthCodePage() {
  redirect("/auth/code");
}
