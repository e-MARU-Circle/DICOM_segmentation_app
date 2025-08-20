'use client';

import { useSession } from 'next-auth/react';
import { useRouter, AppRouterInstance } from 'next/navigation'; // AppRouterInstanceをインポート
import React, { useEffect, useState, FormEvent } from 'react';

// --- 型定義 ---
interface NotionSetting {
  id: number;
  setting_name: string;
  database_id: string;
  property_name: string;
}

// --- アイコンコンポーネント ---
const IconComponent = ({ path, size = 20 }: { path: string, size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
const TagIcon = () => <IconComponent path="<path d='M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l9.29-9.29L12 2z'/><path d='M7 7h.01'/>" />;
const KeyIcon = () => <IconComponent path="<path d='m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777z'/><path d='m15.5 7.5 3 3L22 7l-3-3m-3.5 3.5L12 11'/>" />;
const DatabaseIcon = () => <IconComponent path="<ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'/><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'/>" />;
const TextIcon = () => <IconComponent path="<path d='M17 6.1H3'/><path d='M21 12.1H3'/><path d='M15.1 18.1H3'/>" />;
const EditIcon = () => <IconComponent path="<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>" />;
const TrashIcon = () => <IconComponent path="<polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><line x1='10' y1='11' x2='10' y2='17'/><line x1='14' y1='11' x2='14' y2='17'/>" />;
const GraphIcon = () => <IconComponent path="<path d='M3 3v18h18'/><path d='m18 9-5 5-4-4-3 3'/>" />;

// --- スタイル定義 ---
const styles: { [key: string]: React.CSSProperties } = {
  title: { backgroundColor: '#000', color: '#fff', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' },
  pageContainer: { padding: '2rem', fontFamily: 'sans-serif', color: '#333', maxWidth: '950px', margin: '0 auto' },
  header: { borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' },
  card: { background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', flex: 1 },
  button: { padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  primaryButton: { background: '#0070f3', color: 'white' },
  secondaryButton: { background: '#eee', color: '#333' },
  successButton: { background: '#28a745', color: 'white' },
  dangerButton: { background: '#f44336', color: 'white' },
  iconColor: { color: '#666' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' },
};

// --- UIコンポーネント ---
const SettingCard = ({ setting, onEdit, onDelete, onShowGraph }: { setting: NotionSetting, onEdit: (s: NotionSetting) => void, onDelete: (id: number) => void, onShowGraph: (id: number) => void }) => (
  <div style={styles.card}>
    <div>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>{setting.setting_name}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
        <div style={styles.inputGroup}><span style={styles.iconColor}><DatabaseIcon /></span><span>{setting.database_id}</span></div>
        <div style={styles.inputGroup}><span style={styles.iconColor}><TextIcon /></span><span>{setting.property_name}</span></div>
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
      <button style={{...styles.button, ...styles.successButton}} onClick={() => onShowGraph(setting.id)}><GraphIcon size={16}/>グラフ表示</button>
      <button style={{...styles.button, ...styles.secondaryButton}} onClick={() => onEdit(setting)}><EditIcon size={16}/>編集</button>
      <button style={{...styles.button, ...styles.dangerButton}} onClick={() => onDelete(setting.id)}><TrashIcon size={16}/>削除</button>
    </div>
  </div>
);

const EditModal = ({ setting, onUpdate, onCancel }: { setting: NotionSetting, onUpdate: (id: number, data: any) => Promise<void>, onCancel: () => void }) => {
  const [formData, setFormData] = useState({ ...setting, notion_api_key: '' });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); onUpdate(setting.id, formData); };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2>設定の編集</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={styles.inputGroup}><span style={styles.iconColor}><TagIcon/></span><input name="setting_name" value={formData.setting_name} onChange={handleChange} required style={styles.input}/></div>
          <div style={styles.inputGroup}><span style={styles.iconColor}><KeyIcon/></span><input name="notion_api_key" type="password" onChange={handleChange} placeholder="APIキー（変更する場合のみ入力）" style={styles.input}/></div>
          <div style={styles.inputGroup}><span style={styles.iconColor}><DatabaseIcon/></span><input name="database_id" value={formData.database_id} onChange={handleChange} required style={styles.input}/></div>
          <div style={styles.inputGroup}><span style={styles.iconColor}><TextIcon/></span><input name="property_name" value={formData.property_name} onChange={handleChange} required style={styles.input}/></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onCancel} style={{...styles.button, ...styles.secondaryButton}}>キャンセル</button>
            <button type="submit" style={{...styles.button, ...styles.primaryButton}}>更新</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- メインページコンポーネント ---
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [settingName, setSettingName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [savedSettings, setSavedSettings] = useState<NotionSetting[]>([]);
  const [message, setMessage] = useState('');
  const [editingSetting, setEditingSetting] = useState<NotionSetting | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth/signin');
    else if (status === 'authenticated') {
      fetch('/api/settings').then(res => res.json()).then(data => Array.isArray(data) && setSavedSettings(data));
    }
  }, [status, router]);

  const handleAddNew = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('保存中...');
    const response = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setting_name: settingName, notion_api_key: apiKey, database_id: databaseId, property_name: propertyName }),
    });
    const result = await response.json();
    if (response.ok) {
      setSavedSettings(prev => [...prev, result]);
      setMessage('新しい設定を保存しました！');
      setSettingName(''); setApiKey(''); setDatabaseId(''); setPropertyName('');
    } else {
      setMessage(`エラー: ${result.error}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('この設定を本当に削除しますか？')) return;
    const response = await fetch(`/api/settings/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setSavedSettings(prev => prev.filter(s => s.id !== id));
      setMessage('設定を削除しました。');
    } else {
      setMessage('削除中にエラーが発生しました。');
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    setMessage('更新中...');
    const response = await fetch(`/api/settings/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.ok) {
      setSavedSettings(prev => prev.map(s => s.id === id ? result : s));
      setMessage('設定を更新しました！');
      setEditingSetting(null);
    } else {
      setMessage(`更新エラー: ${result.error}`);
    }
  };

  const handleShowGraph = (id: number) => {
    // ViteアプリのURL（デフォルトポート5173を想定）を新しいタブで開く
    const viteAppUrl = `http://localhost:5173/?setting_id=${id}`;
    window.open(viteAppUrl, '_blank');
  };

  if (status !== 'authenticated') return <div>Loading...</div>;

  return (
    <div style={styles.pageContainer}>
      {editingSetting && <EditModal setting={editingSetting} onUpdate={handleUpdate} onCancel={() => setEditingSetting(null)} />}

      <header style={styles.header}>
        <h1 style={styles.title}>Graphing Notion App</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#666', textAlign: 'center' }}>ようこそ, {session?.user?.email} さん！</p>
      </header>

      <section>
        <h2>新しい設定を追加</h2>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={styles.card}>
            <form onSubmit={handleAddNew}>
              <div style={styles.inputGroup}><span style={styles.iconColor}><TagIcon/></span><input value={settingName} onChange={e => setSettingName(e.target.value)} required placeholder="設定名 (例: '個人ブログ')" style={styles.input}/></div>
              <div style={styles.inputGroup}><span style={styles.iconColor}><KeyIcon/></span><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} required placeholder="Notion APIキー" style={styles.input}/></div>
              <div style={styles.inputGroup}><span style={styles.iconColor}><DatabaseIcon/></span><input value={databaseId} onChange={e => setDatabaseId(e.target.value)} required placeholder="データベースID" style={styles.input}/></div>
              <div style={styles.inputGroup}><span style={styles.iconColor}><TextIcon/></span><input value={propertyName} onChange={e => setPropertyName(e.target.value)} required placeholder="キーワードのプロパティ名" style={styles.input}/></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{...styles.button, ...styles.primaryButton}} disabled={savedSettings.length >= 10}>追加する</button>
              </div>
              {savedSettings.length >= 10 && <p style={{color: 'red', textAlign: 'right'}}>設定は10個までです。</p>}
            </form>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2>現在の設定 ({savedSettings.length}/10)</h2>
        {savedSettings.length > 0 ? (
          <div style={styles.grid}>
            {savedSettings.map(setting => (
              <SettingCard key={setting.id} setting={setting} onEdit={setEditingSetting} onDelete={handleDelete} onShowGraph={handleShowGraph} />
            ))}
          </div>
        ) : <p>保存されている設定はありません。上のフォームから最初の設定を追加してください。</p>}
      </section>

      {message && <p style={{ textAlign: 'center', marginTop: '2rem', fontWeight: 'bold' }}>{message}</p>}
    </div>
  );
}