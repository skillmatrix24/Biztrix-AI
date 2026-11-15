import ClientPage from "./client-page";

export default async function Page(props: {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  await props.searchParams;
  return <ClientPage params={params} />;
}
