import Link from "next/link";
export default function Landing() {
  return (
    <>
      <h1>Your purchases deserve a second look.</h1>
      <p>
        Keep the original receipt, see when a promise comes due, and build a
        claim from the evidence. You review the letter and choose what to share.
      </p>
      <Link href="/journal" prefetch={false}>
        Open private demo →
      </Link>
      <Link href="/vault">My purchase vault</Link>
      <section
        className="landing-benefits"
        aria-label="How Aftercare protects purchases"
      >
        <article>
          <h2>Keep the original</h2>
          <p>
            Store receipts privately and review each item before it enters your
            vault.
          </p>
        </article>
        <article>
          <h2>Check the window</h2>
          <p>
            Track a return or warranty deadline alongside the policy source that
            supports it.
          </p>
        </article>
        <article>
          <h2>Follow the refund</h2>
          <p>
            Record what the shop promised and approve the exact follow-up you
            want to download.
          </p>
        </article>
      </section>
    </>
  );
}
