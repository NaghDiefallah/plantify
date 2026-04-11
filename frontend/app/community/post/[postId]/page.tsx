import {CommunityThreadPageClient} from "./thread-page-client";

export function generateStaticParams(): Array<{postId: string}> {
  if (process.env.PLATFORM_TARGET === "static") {
    // Static export requires at least one concrete path for dynamic segments.
    return [{postId: "demo-thread"}];
  }

  return [];
}

export const dynamicParams = false;

type ThreadPageParams = {
  params: Promise<{postId: string}>;
};

export default async function CommunityThreadPage({params}: ThreadPageParams) {
  const {postId} = await params;
  return <CommunityThreadPageClient postId={postId} />;
}
