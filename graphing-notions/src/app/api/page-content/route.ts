import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Maps Notion colors to CSS colors
const NOTION_COLOR_MAP = {
  gray: 'rgb(120, 119, 116)',
  brown: 'rgb(159, 107, 83)',
  orange: 'rgb(217, 115, 13)',
  yellow: 'rgb(203, 145, 47)',
  green: 'rgb(68, 131, 97)',
  blue: 'rgb(51, 126, 169)',
  purple: 'rgb(144, 101, 176)',
  pink: 'rgb(193, 76, 138)',
  red: 'rgb(212, 76, 71)',
  black: 'rgb(55, 53, 47)',
  white: 'rgb(255, 255, 255)',
  gray_background: 'rgba(120, 119, 116, 0.1)',
  brown_background: 'rgba(159, 107, 83, 0.1)',
  orange_background: 'rgba(217, 115, 13, 0.1)',
  yellow_background: 'rgba(203, 145, 47, 0.1)',
  green_background: 'rgba(68, 131, 97, 0.1)',
  blue_background: 'rgba(51, 126, 169, 0.1)',
  purple_background: 'rgba(144, 101, 176, 0.1)',
  pink_background: 'rgba(193, 76, 138, 0.1)',
  red_background: 'rgba(212, 76, 71, 0.1)',
};

// Converts a rich text array to an HTML string
const richTextToHtml = (richTextArray) => {
  if (!richTextArray) return '';
  
  return richTextArray.map(rt => {
    let text = rt.plain_text;
    if (rt.href) {
      text = `<a href="${rt.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    if (rt.annotations.bold) {
      text = `<strong>${text}</strong>`;
    }
    if (rt.annotations.italic) {
      text = `<em>${text}</em>`;
    }
    if (rt.annotations.strikethrough) {
      text = `<s>${text}</s>`;
    }
    if (rt.annotations.underline) {
      text = `<u>${text}</u>`;
    }
    if (rt.annotations.code) {
      text = `<code>${text}</code>`;
    }
    if (rt.annotations.color && rt.annotations.color !== 'default') {
      const colorValue = NOTION_COLOR_MAP[rt.annotations.color];
      if (colorValue) { // Ensure color is mapped
        // Simplified logic, only applying foreground color with !important
        text = `<span style="color: ${colorValue} !important;">${text}</span>`;
      }
    }
    return text;
  }).join('');
};

// Converts Notion blocks to a mixed Markdown/HTML string
async function notionBlocksToHtml(blocks, notion) { // Renamed from notionBlocksToMarkup
  let output = ''; // Renamed from markup
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        output += `<p>${richTextToHtml(block.paragraph.rich_text)}</p>\n`;
        break;
      case 'heading_1':
        output += `<h1>${richTextToHtml(block.heading_1.rich_text)}</h1>\n`;
        break;
      case 'heading_2':
        output += `<h2>${richTextToHtml(block.heading_2.rich_text)}</h2>\n`;
        break;
      case 'heading_3':
        output += `<h3>${richTextToHtml(block.heading_3.rich_text)}</h3>\n`;
        break;
      case 'bulleted_list_item':
        output += `<li>${richTextToHtml(block.bulleted_list_item.rich_text)}</li>\n`;
        break;
      case 'numbered_list_item':
        output += `<li>${richTextToHtml(block.numbered_list_item.rich_text)}</li>\n`;
        break;
      case 'to_do':
        output += `<p><input type="checkbox" ${block.to_do.checked ? 'checked' : ''} disabled /> ${richTextToHtml(block.to_do.rich_text)}</p>\n`;
        break;
      case 'code':
        // Keep as Markdown for ReactMarkdown to handle
        output += '```' + `${block.code.language}\n${richTextToHtml(block.code.rich_text)}\n` + '```\n\n';
        break;
      case 'quote':
        output += `<blockquote>${richTextToHtml(block.quote.rich_text)}</blockquote>\n`;
        break;
      case 'callout':
        output += `<div style="padding: 10px; border-left: 3px solid #ccc; background-color: #f9f9f9; margin-bottom: 10px;">${block.callout.icon.emoji} ${richTextToHtml(block.callout.rich_text)}</div>\n`;
        break;
      case 'divider':
        output += `<hr/>\n`;
        break;
      case 'image':
        const imageUrl = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
        output += `<img src="${imageUrl}" alt="Notion Image" />\n`;
        break;
      case 'table':
        // Keep as Markdown for ReactMarkdown to handle
        if (block.has_children) {
          const tableRows = await notion.blocks.children.list({ block_id: block.id });
          const rows = tableRows.results;
          if (rows.length > 0) {
            const headerRowCells = rows[0].table_row.cells;
            const header = `| ${headerRowCells.map(cell => richTextToHtml(cell)).join(' | ')} |\n`;
            const divider = `| ${headerRowCells.map(() => '---').join(' | ')} |\n`;
            let body = '';
            for (let i = 1; i < rows.length; i++) {
              const rowCells = rows[i].table_row.cells;
              body += `| ${rowCells.map(cell => richTextToHtml(cell)).join(' | ')} |\n`;
            }
            output += header + divider + body + '\n';
          }
        }
        break;
      default:
        output += `[Unsupported block type: ${block.type}]\n\n`;
        break;
    }
  }
  return output;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId');

  if (!pageId) {
    return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
  }

  try {
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('notion_api_key')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings || !settings.notion_api_key) {
      console.error('Settings Error:', settingsError);
      return NextResponse.json(
        { error: 'Notion API key not found in Supabase settings' },
        { status: 500 }
      );
    }

    const notion = new Client({ auth: settings.notion_api_key });

    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });

    const markdownContent = await notionBlocksToHtml(response.results, notion); // Use new function name

    return NextResponse.json({ markdown: markdownContent });

  } catch (error: any) {
    console.error('Error fetching Notion page content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page content', details: error.message },
      { status: 500 }
    );
  }
}