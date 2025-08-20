// src/components/UserSettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabaseClient'; // Adjust path as necessary

export default function UserSettings() {
  const { data: session } = useSession();
  const [settingValue, setSettingValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  const fetchSettings = async () => {
    setError(null);
    setMessage(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('data')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }

      if (data) {
        setSettingValue(data.data?.mySetting || '');
      } else {
        setSettingValue('');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!userId) {
      setError('ログインしていません。');
      return;
    }

    try {
      // Check if settings already exist for the user
      const { data: existingSettings, error: fetchError } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('settings')
          .update({ data: { mySetting: settingValue }, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (updateError) throw updateError;
        setMessage('設定を更新しました！');
      } else {
        // Insert new settings
        const { error: insertError } = await supabase
          .from('settings')
          .insert({ user_id: userId, data: { mySetting: settingValue } });

        if (insertError) throw insertError;
        setMessage('設定を保存しました！');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!session) {
    return (
      <div className="p-4 bg-gray-100 rounded-md shadow-sm mt-4">
        <p className="text-gray-800">設定を管理するにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-lg shadow-md w-full max-w-md mt-8">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800">ユーザー設定</h2>
      <form onSubmit={saveSettings}>
        {message && <p className="text-green-500 text-center mb-4">{message}</p>}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="mb-4">
          <label htmlFor="my-setting" className="block text-gray-700 font-semibold mb-2">私の設定</label>
          <input
            type="text"
            id="my-setting"
            value={settingValue}
            onChange={(e) => setSettingValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          設定を保存
        </button>
      </form>
    </div>
  );
}
