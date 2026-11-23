import { headers } from "next/headers";
import { overview } from "@aftercare/contracts";
import Link from "next/link";

export default async function Journal() {
  const authorization = (await headers()).get("authorization") ?? "";
  const response = await fetch("http://127.0.0.1:3101/api/v1/overview", {
    headers: { authorization },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok)
    return (
      <>
        <h1>Journal unavailable</h1>
        <p>The private workspace could not be opened.</p>
        <Link href="/">Return home</Link>
      </>
    );
  const data = overview.parse(await response.json());
  return (
    <>
      <h1>{data.title}</h1>
      <section>
        <h2>Agent activity</h2>
        <p>No checks recorded. Monitoring is awaiting service verification.</p>
      </section>
    </>
  );
}
