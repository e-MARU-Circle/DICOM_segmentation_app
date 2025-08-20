import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// GETリクエスト（ユーザーの全設定を取得）
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  
  // ユーザーIDに紐づく全ての設定を、安全なカラムのみ選択して取得
  const { data, error } = await supabase
    .from('settings')
    .select('id, setting_name, database_id, property_name') // APIキーは返さない
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Supabase GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POSTリクエスト（設定を新規作成）
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  // --- 件数チェックロジック ---
  const { count, error: countError } = await supabase
    .from('settings')
    .select('*', { count: 'exact', head: true }) // head:trueでデータ自体は取得せず件数のみ取得
    .eq('user_id', userId);

  if (countError) {
    console.error('Supabase Count Error:', countError);
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if (count !== null && count >= 10) {
    return NextResponse.json({ error: '設定は最大10個までしか保存できません。' }, { status: 403 }); // 403 Forbidden
  }
  // --- ここまで ---

  const body = await request.json();
  
  // 保存するデータを準備
  const settingData = {
    user_id: userId,
    setting_name: body.setting_name,
    database_id: body.database_id,
    property_name: body.property_name,
    notion_api_key: body.notion_api_key, // 新規保存なのでAPIキーは必須
  };

  // notion_api_keyが空の場合はエラー
  if (!settingData.notion_api_key) {
      return NextResponse.json({ error: 'Notion APIキーは必須です。' }, { status: 400 });
  }

  // upsertをinsertに変更
  const { data, error } = await supabase
    .from('settings')
    .insert(settingData)
    .select('id, setting_name, database_id, property_name') // 挿入後、安全なデータを返す
    .single();

  if (error) {
    console.error('Supabase POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}