// src/components/UserStatus.tsx
'use client';

import { useSession } from 'next-auth/react';

export default function UserStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <p>セッションを読み込み中...</p>;
  }

  if (session) {
    return (
      <div className="p-4 bg-blue-100 rounded-md shadow-sm">
        <p className="text-blue-800">
          {session.user?.email} としてログイン中です。
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-100 rounded-md shadow-sm">
      <p className="text-red-800">ログインしていません。</p>
    </div>
  );
}
