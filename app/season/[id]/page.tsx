import { redirect, notFound } from "next/navigation";

export default function LegacySeasonRedirect({
  params,
}: {
  params: { id: string };
}) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();
  redirect(`/round/${id}`);
}
