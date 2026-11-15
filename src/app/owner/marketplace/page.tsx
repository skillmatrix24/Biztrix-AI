import { redirect } from "next/navigation";

export default async function LegacyOwnerMarketplaceRedirect(props: {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.params;
  const searchParams = await props.searchParams;
  const tab = typeof searchParams?.tab === "string" ? searchParams.tab : "suites";
  redirect(`/owner/limits?tab=${encodeURIComponent(tab)}`);
}
