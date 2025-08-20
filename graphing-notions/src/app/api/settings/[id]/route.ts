import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// PUTリクエスト（特定の設定を更新）
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const settingId = params.id;
  const body = await request.json();

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  // 更新するデータを準備
  const settingData: { [key: string]: any } = {
    setting_name: body.setting_name,
    database_id: body.database_id,
    property_name: body.property_name,
  };

  // APIキーが入力されている場合のみ、notion_api_keyを更新対象に含める
  if (body.notion_api_key) {
    settingData.notion_api_key = body.notion_api_key;
  }

  // .match()で、settingIdとuserIdの両方が一致する行のみを対象とする
  const { data, error } = await supabase
    .from('settings')
    .update(settingData)
    .match({ id: settingId, user_id: userId })
    .select('id, setting_name, database_id, property_name') // 更新後の安全なデータを返す
    .single();

  if (error) {
    console.error('Supabase PUT Error:', error);
    // 一致するデータがなかった場合のエラーハンドリング
    if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'No setting found to update.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}


// DELETEリクエスト（特定の設定を削除）
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const settingId = params.id;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  // .match()で、settingIdとuserIdの両方が一致する行のみを対象とする
  const { error } = await supabase
    .from('settings')
    .delete()
    .match({ id: settingId, user_id: userId });

  if (error) {
    console.error('Supabase DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 正常に削除された場合、204 No Contentを返すのが一般的
  return new NextResponse(null, { status: 204 });
}