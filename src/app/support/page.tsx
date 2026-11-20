import ClientPage from "./client-page";

export const metadata = {
  title: "Customer Care & Support Operations Hub (Internal) | Biztrix AI",
  description: "Internal Customer Care & Support Operations Hub for authorized support staff only.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page(props: {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.params;
  await props.searchParams;
  return <ClientPage />;
}
