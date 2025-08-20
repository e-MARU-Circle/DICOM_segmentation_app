import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Supabaseクライアントをインポート
import { Client } from '@notionhq/client'; // Notionクライアントをインポート

/**
 * グラフデータを取得するAPIエンドポイント
 * @route GET /api/graph-data
 */
export async function GET() {
  // 1. Supabaseから最新の設定を1件取得
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (settingsError || !settings) {
    return NextResponse.json(
      { error: 'Failed to get settings from Supabase', details: settingsError },
      { status: 500 }
    );
  }

  // 2. 取得した設定でNotionクライアントを初期化
  const notion = new Client({ auth: settings.notion_api_key });
  const databaseId = settings.database_id!;
  const propertyName = settings.property_name!;

  try {
    // Fetch database details to get its title
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const databaseTitle = database.title.map(t => t.plain_text).join(''); // Extract title

    // 3. Notionデータベースから全てのページを取得
    const response = await notion.databases.query({
      database_id: databaseId,
      // 必要に応じてフィルターやソートを追加できます
    });

    // 4. 取得したデータをグラフ形式に加工
    const pages = response.results;
    const nodes: { id: string; group: string; }[] = [];
    const links: { source: string; target: string; }[] = [];
    const keywords = new Map<string, number>();

    // ページからノードとリンクを作成
    pages.forEach((page: any) => {
      // ページタイトルを取得
      const pageTitle = page.properties.タイトル?.title[0]?.plain_text;
      if (!pageTitle) return; // タイトルがないページはスキップ

      // ページノードを追加
      nodes.push({ id: pageTitle, group: 'page', notionPageId: page.id });

      // キーワード（マルチセレクト）を取得
      const pageKeywords = page.properties.キーワード?.multi_select;
      if (pageKeywords) {
        pageKeywords.forEach((keyword: { name: string; }) => {
          // ページとキーワードのリンクを作成
          links.push({ source: pageTitle, target: keyword.name });
          // キーワードの出現回数をカウント
          keywords.set(keyword.name, (keywords.get(keyword.name) || 0) + 1);
        });
      }
    });

    // キーワードからノードを作成
    keywords.forEach((count, keyword) => {
      nodes.push({ id: keyword, group: 'keyword' });
    });

    // 最終的なグラフデータを返す
    
    return NextResponse.json({ nodes, links, databaseTitle });

  } catch (error: any) {
    console.error('Error in /api/graph-data:', error);
    // エラーの詳細をフロントエンドに返す
    return NextResponse.json(
      { 
        error: 'An error occurred on the server.', 
        details: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } 
      },
      { status: 500 }
    );
  }
}
