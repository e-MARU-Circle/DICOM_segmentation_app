# 2025年8月16日: 管理者ページの認証機能修正

## 課題

以前の `src/app/admin/page.tsx` は、ユーザーがログインしているかどうかを確認する仕組みが不十分でした。そのため、認証されていないユーザーが管理者ページにアクセスできてしまう可能性がありました。

## 解決策

この問題を解決するため、`src/app/admin/page.tsx` の内容を全面的に刷新しました。新しいコードは、Next.jsの標準的な認証ライブラリである `next-auth` を活用し、堅牢な認証チェック機能と自動リダイレクト機能を実装しています。

### 変更後のコード (`src/app/admin/page.tsx`)

```typescript
'use client'; // ページをクライアントコンポーネントとして動作させるために必要

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // App Routerでは 'next/navigation' を使います
import { useEffect } from 'react';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // --- ログイン状態をチェックするロジック ---

  useEffect(() => {
    // statusが'loading'の場合は、まだ認証状態を確認中なので何もしない
    if (status === 'loading') {
      return; 
    }

    // statusが'unauthenticated'（未認証）の場合は、ログインページにリダイレクト
    if (status === 'unauthenticated') {
      // '/auth/signin' は実際のログインページのパス
      router.push('/auth/signin');
    }
  }, [status, router]); // statusかrouterが変わった時にこの処理を実行


  // --- 認証状態に応じた表示の切り替え ---

  // 認証確認中、またはリダイレクト中の表示
  if (status !== 'authenticated') {
    return <div>Loading or Redirecting...</div>;
  }

  // ↓↓ 認証されたユーザーにのみ表示されるコンテンツ ↓↓
  return (
    <div>
      <h1>管理画面</h1>
      <p>ようこそ, {session.user?.email} さん！</p>
      
      {/* ここに、APIキーなどを入力するフォームや、
        過去のデータを確認するコンポーネントなどを配置します。
      */}

    </div>
  );
}
```

## コードのポイント解説

1.  **`'use client'`**: この宣言により、ページがサーバー側ではなく、ユーザーのブラウザ（クライアント）で動作するようになります。ブラウザ上でのユーザーの状態（ログインしているかなど）に応じて動的に表示を変えるために不可欠です。

2.  **`useSession()` フック**: `next-auth/react` が提供する非常に便利な機能です。このフックを呼び出すだけで、現在のユーザーの認証状態を簡単に取得できます。
    *   `data: session`: ログインしている場合、ユーザー情報（メールアドレスなど）が `session` オブジェクトに格納されます。
    *   `status`: 認証の状態を示す文字列で、`'loading'` (確認中)、`'authenticated'` (認証済み)、`'unauthenticated'` (未認証) のいずれかの値を取ります。

3.  **`useRouter()` フック**: Next.jsのApp Routerでページ遷移を制御するためのフックです。今回は、未認証ユーザーをログインページへ強制的に移動（リダイレクト）させるために使用します。

4.  **`useEffect()` フック**: このフックの中に記述された処理は、指定されたタイミングで実行されます。
    *   `useEffect(() => { ... }, [status, router]);` のように、第二引数に `[status]` を指定することで、「`status` の値が変化した時だけ、中の処理を実行する」という設定にしています。
    *   これにより、認証状態が `loading` から `unauthenticated` に変わった瞬間にリダイレクト処理が実行される、という効率的な作りになっています。

5.  **表示の切り替え**:
    *   `status` が `'authenticated'` でない間（つまり、確認中か未認証の場合）は、「Loading or Redirecting...」という一時的なメッセージを表示します。
    *   `status` が `'authenticated'` になった場合にのみ、本来の管理画面のコンテンツが表示されるようになっています。

この修正により、管理者ページが保護され、許可されたユーザーだけがアクセスできる、安全な状態になりました。
