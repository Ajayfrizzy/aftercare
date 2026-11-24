"use client";
import Find from "./find";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
const links = [
  ["/overview", "Overview"],
  ["/vault", "Purchases"],
  ["/protection", "Protection"],
  ["/cases", "Cases"],
  ["/approvals", "Approvals"],
  ["/activity", "Activity"],
  ["/settings", "Privacy"],
];
export default function Workspace({ children }: { children: ReactNode }) {
  const path = usePathname(),
    publicPage = path === "/" || path === "/journal";
  return (
    <div className={publicPage ? "public-layout" : "workspace"}>
      {!publicPage && (
        <a className="skip" href="#content">
          Skip to content
        </a>
      )}
      <header>
        <i aria-hidden="true" />
        aftercare
      </header>
      {!publicPage && (
        <nav aria-label="Workspace" className="primary-nav">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <main id="content" tabIndex={-1}>
        {!publicPage && <Find key={path} />}
        {children}
      </main>
    </div>
  );
}
