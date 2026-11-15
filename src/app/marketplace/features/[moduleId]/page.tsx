import ClientPage from "./client-page";

export default async function Page(props: {
  params: Promise<{ moduleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  await props.searchParams;
  return <ClientPage params={params} />;
}
