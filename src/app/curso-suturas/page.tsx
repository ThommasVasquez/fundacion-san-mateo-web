import DynamicProgramPage, { generateMetadata as dynamicGenerateMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return dynamicGenerateMetadata({ params: Promise.resolve({ slug: "curso-suturas" }) });
}

export default async function Page() {
  return <DynamicProgramPage params={Promise.resolve({ slug: "curso-suturas" })} />;
}
