// src/components/SignUpForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Adjust path as necessary

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        setMessage('サインアップに成功しました！確認メールを送信しましたので、メールを確認してください。');
        // Optionally, you can redirect or automatically sign in here
        // For now, we'll just show a message and let the user sign in manually
      } else {
        setMessage('サインアップリクエストを送信しました。メールを確認してください。');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800">新規登録</h2>
      <form onSubmit={handleSignUp}>
        {message && <p className="text-green-500 text-center mb-4">{message}</p>}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="mb-4">
          <label htmlFor="signup-email" className="block text-gray-700 font-semibold mb-2">メールアドレス</label>
          <input
            type="email"
            id="signup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="signup-password" className="block text-gray-700 font-semibold mb-2">パスワード</label>
          <input
            type="password"
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          新規登録
        </button>
      </form>
    </div>
  );
}
