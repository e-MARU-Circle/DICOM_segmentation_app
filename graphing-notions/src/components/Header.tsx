'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import React from 'react';

export default function Header() {
  const { data: session, status } = useSession();

  // スタイル定義
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid #eee',
    backgroundColor: 'white',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 'bold',
    fontSize: '1.5rem',
    textDecoration: 'none',
    color: '#000',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#333',
    textDecoration: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s, color 0.2s',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#0070f3',
    borderColor: '#0070f3',
    color: 'white',
  };

  if (status === 'loading') {
    return <header style={headerStyle}><div style={titleStyle}>Loading...</div></header>;
  }

  return (
    <header style={headerStyle}>
      <Link href="/" style={titleStyle}>
        Graphing Notion App
      </Link>
      <nav style={navStyle}>
        {status === 'authenticated' ? (
          // ログインしている時の表示
          <>
            <span style={{ fontSize: '0.9rem' }}>{session.user.email}</span>

            <Link href="/admin" style={buttonStyle}>
              管理画面へ
            </Link>

            <a href={process.env.NEXT_PUBLIC_VITE_APP_URL || 'http://localhost:5173'} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
              グラフを表示
            </a>

            <button onClick={() => signOut()} style={buttonStyle}>サインアウト</button>
          </>
        ) : (
          // ログインしていない時の表示
          <button onClick={() => signIn()} style={primaryButtonStyle}>サインイン</button>
        )}
      </nav>
    </header>
  );
}
