import { Suspense } from "react";
import ClientPage from "./client-page";
import { Loader2 } from "lucide-react";

export default async function Page(props: {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.params;
  await props.searchParams;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}
