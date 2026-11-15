import ClientPage from "./client-page";

export default async function FunnelsPage(props: {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.params;
  await props.searchParams;
  return <ClientPage />;
}
