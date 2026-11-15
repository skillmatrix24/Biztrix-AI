import { PageEditorClient } from "./editor-client";

export default async function WebsiteEditorPage(props: {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { pageId } = await props.params;
  await props.searchParams;
  return <PageEditorClient pageId={pageId} />;
}
