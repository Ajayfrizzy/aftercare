import "@aftercare/ui";
import Workspace from "./workspace";
import type { ReactNode } from "react";
export const metadata = { title: "Aftercare · Personal purchase protection" };
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Workspace>{children}</Workspace>
      </body>
    </html>
  );
}
