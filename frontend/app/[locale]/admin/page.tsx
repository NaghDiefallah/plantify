import {redirect} from "next/navigation";

export default async function AdminPage({
  params: _params
}: {
  params: Promise<{locale: string}>;
}) {
  await _params;
  redirect("/dashboard");
}
