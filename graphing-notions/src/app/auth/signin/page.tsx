'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

import SignUpForm from '@/components/SignUpForm'; // Add this import

export default function SignInPage() {
  const [email, setEmail] = useState(''); // usernameをemailに変更
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await signIn('credentials', {
      redirect: false, // リダイレクトしない
      email, // usernameをemailに変更
      password,
    });

    if (result?.error) {
      setError(result.error);
    } else if (result?.ok) {
      // 認証成功、管理画面へリダイレクト
      window.location.href = '/admin';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4"> {/* Changed to flex-col and added padding */}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md mb-8"> {/* Added mb-8 for spacing */}
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">ログイン</h1>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">メールアドレス</label>
            <input
              type="email" // typeをemailに変更
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ログイン
          </button>
        </form>
      </div>

      {/* Sign Up Form Section */}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <SignUpForm />
      </div>
    </div>
  );
}
