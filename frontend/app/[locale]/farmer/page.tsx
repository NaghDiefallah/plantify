import {redirect} from "next/navigation";

export default async function FarmerPage({
  params: _params
}: {
  params: Promise<{locale: string}>;
}) {
  await _params;
  redirect("/dashboard");
}
