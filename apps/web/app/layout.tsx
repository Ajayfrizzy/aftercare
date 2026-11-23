import '@aftercare/ui'
import type { ReactNode } from 'react'
export const metadata = { title: 'Aftercare · Personal purchase protection' }
export default function Layout({children}: {children: ReactNode}) {
  return <html lang="en"><body><header><i aria-hidden="true"/>aftercare</header><main>{children}</main></body></html>
}
