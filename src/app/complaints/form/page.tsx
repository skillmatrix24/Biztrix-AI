import ClientPage from "./client-page";

export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.searchParams;
  return <ClientPage />;
}
