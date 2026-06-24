import SignupPageClient from "./components/SignupPageClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;

  return <SignupPageClient tab={params.tab} />;
}