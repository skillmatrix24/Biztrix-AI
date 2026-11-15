import ClientPage from "./client-page";

export default async function Page(props: {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.params;
  const searchParams = await props.searchParams;
  const tabParam = typeof searchParams?.tab === "string" ? searchParams.tab : undefined;
  return <ClientPage initialTab={tabParam} />;
}
