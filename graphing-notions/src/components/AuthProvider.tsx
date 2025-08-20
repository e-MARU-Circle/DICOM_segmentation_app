'use client';

import { SessionProvider } from "next-auth/react";
import React from "react";

// SessionProviderをラップするコンポーネント
// これにより、サーバーコンポーネントであるRootLayout内で
// クライアントコンポーネントであるSessionProviderを使えるようにする
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
