import {redirect} from "next/navigation";

export default function LegacyAuthCodePath() {
  redirect("/auth/code");
}
