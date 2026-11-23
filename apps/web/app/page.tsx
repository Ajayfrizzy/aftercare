import Link from "next/link";
export default function Landing() {
  return (
    <>
      <h1>Your purchases deserve a second look.</h1>
      <p>
        A personal journal for receipts, return windows, and the evidence behind
        a claim.
      </p>
      <Link href="/journal" prefetch={false}>
        Open private demo →
      </Link>
      <Link href="/vault">My purchase vault</Link>
    </>
  );
}
