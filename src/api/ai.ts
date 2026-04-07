const KIMI_BASE = 'https://api.moonshot.cn/v1';
const VISION_MODEL = 'moonshot-v1-vision-preview';
const TEXT_MODEL = 'moonshot-v1-32k';

// ─── Types ───

export interface ExtractedEvent {
  title: string;
  eventDate: string;
  eventTime: string;
  location: string;
  category: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  events?: ExtractedEvent[]; // AI 识别到的活动（如有）
}

/** 文件上下文：一次性处理上传的文件，供后续多轮对话使用 */
export interface DocumentContext {
  /** 图片文件的 base64（用于视觉模型第一条消息） */
  imageItems: Array<{ type: 'image_url'; image_url: { url: string } }>;
  /** PDF / 文字内容（放在 system 消息里） */
  pdfText: string;
  ready: boolean;
}

// ─── Helpers ───

function getApiKey(): string {
  const key = import.meta.env.VITE_KIMI_API_KEY;
  if (!key) throw new Error('未配置 VITE_KIMI_API_KEY，请在 .env 文件中填入 Kimi API Key');
  return key;
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function parseJsonResponse(text: string): Promise<ExtractedEvent[]> {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

/** 从 AI 回复中提取事件 JSON（标记为 [EVENTS]...[/EVENTS]） */
function parseEventsFromReply(text: string): { displayText: string; events: ExtractedEvent[] } {
  const match = text.match(/\[EVENTS\]([\s\S]*?)\[\/EVENTS\]/);
  if (!match) return { displayText: text.trim(), events: [] };

  const displayText = text.replace(/\[EVENTS\][\s\S]*?\[\/EVENTS\]/g, '').trim();
  try {
    const raw = JSON.parse(match[1].trim());
    const events: ExtractedEvent[] = Array.isArray(raw) ? raw : [];
    return { displayText, events };
  } catch {
    return { displayText, events: [] };
  }
}

// ─── Document Context ───

/** 一次性处理文件，为多轮对话准备上下文 */
export async function buildDocumentContext(files: File[]): Promise<DocumentContext> {
  const apiKey = getApiKey();
  const imageFiles = files.filter(f => !isPdfFile(f));
  const pdfFiles = files.filter(f => isPdfFile(f));

  // 图片转 base64
  const imageItems: DocumentContext['imageItems'] = await Promise.all(
    imageFiles.map(async f => ({
      type: 'image_url' as const,
      image_url: { url: `data:${f.type || 'image/jpeg'};base64,${await fileToBase64(f)}` },
    }))
  );

  // PDF 上传并提取文字
  let pdfText = '';
  for (const f of pdfFiles) {
    const formData = new FormData();
    formData.append('file', f, f.name);
    formData.append('purpose', 'file-extract');

    const uploadResp = await fetch(`${KIMI_BASE}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });
    if (!uploadResp.ok) throw new Error(`PDF 上传失败: ${f.name}`);

    const { id: fileId } = await uploadResp.json() as { id: string };

    const contentResp = await fetch(`${KIMI_BASE}/files/${fileId}/content`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (contentResp.ok) {
      const { content } = await contentResp.json() as { content: string };
      pdfText += `\n\n=== ${f.name} ===\n${content}`;
    }

    // 异步清理
    fetch(`${KIMI_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    }).catch(() => undefined);
  }

  return { imageItems, pdfText: pdfText.trim(), ready: true };
}

// ─── Multi-turn Chat ───

const CHAT_SYSTEM_PROMPT = `你是一个学校家长助手，帮助家长从学校通知中找出需要关注的活动和时间安排。

当家长描述需求后（比如"我孩子叫张三"），请：
1. 用简洁的中文回答
2. 如果识别到需要记录的活动，在回复末尾附上如下格式（不要省略）：
[EVENTS]
[{"title":"活动名称","eventDate":"YYYY-MM-DD","eventTime":"HH:MM","location":"地点","category":"学校活动","description":"备注"}]
[/EVENTS]

category 只能是：学校活动、假期、考试、缴费、其他
eventTime 如无具体时间填 ""
如果没有识别到活动，不要加 [EVENTS] 标记，直接回复即可。`;

/** 发送一条聊天消息，返回 AI 回复文本和识别到的活动 */
export async function sendChatMessage(
  context: DocumentContext,
  history: ChatMessage[],
  userMessage: string,
): Promise<{ text: string; events: ExtractedEvent[] }> {
  const apiKey = getApiKey();

  const useVision = context.imageItems.length > 0;
  const model = useVision ? VISION_MODEL : TEXT_MODEL;

  // system 消息
  const systemContent = CHAT_SYSTEM_PROMPT +
    (context.pdfText ? `\n\n以下是文件内容：\n${context.pdfText}` : '');

  // 构建消息历史
  const messages: unknown[] = [{ role: 'system', content: systemContent }];

  // 历史对话
  history.forEach((msg, idx) => {
    if (msg.role === 'user' && idx === 0 && context.imageItems.length > 0) {
      // 第一条 user 消息带图片
      messages.push({
        role: 'user',
        content: [
          ...context.imageItems,
          { type: 'text', text: msg.content },
        ],
      });
    } else {
      messages.push({ role: msg.role, content: msg.content });
    }
  });

  // 当前用户消息
  if (history.length === 0 && context.imageItems.length > 0) {
    // 第一条带图片
    messages.push({
      role: 'user',
      content: [
        ...context.imageItems,
        { type: 'text', text: userMessage },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const resp = await fetch(`${KIMI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Kimi API 错误: ${resp.status}`);
  }

  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  const raw = data.choices[0]?.message?.content ?? '';
  const { displayText, events } = parseEventsFromReply(raw);
  return { text: displayText, events };
}

// ─── One-shot Extraction (保留原有功能) ───

const EXTRACT_PROMPT = `你是一个学校家长助手，请从这份学校通知/截图中提取所有活动和事项安排。

请以 JSON 格式返回，结构如下：
{
  "events": [
    {
      "title": "活动名称",
      "eventDate": "YYYY-MM-DD",
      "eventTime": "HH:MM",
      "location": "地点",
      "category": "学校活动",
      "description": "简要描述"
    }
  ]
}

注意：
- eventDate 必须是 YYYY-MM-DD 格式，如不确定年份请根据当前年份推断
- eventTime 如果通知中没有具体时间，留空字符串 ""
- category 只能是以下之一：学校活动、假期、考试、缴费、其他
- 如果没有找到任何活动，返回 {"events": []}
- 只返回 JSON，不要其他文字`;

async function extractFromImage(file: File): Promise<ExtractedEvent[]> {
  const apiKey = getApiKey();
  const base64 = await fileToBase64(file);

  const resp = await fetch(`${KIMI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } },
          { type: 'text', text: EXTRACT_PROMPT },
        ],
      }],
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Kimi API 错误: ${resp.status}`);
  }

  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  return parseJsonResponse(data.choices[0]?.message?.content ?? '');
}

async function extractFromPdf(file: File): Promise<ExtractedEvent[]> {
  const apiKey = getApiKey();
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('purpose', 'file-extract');

  const uploadResp = await fetch(`${KIMI_BASE}/files`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });
  if (!uploadResp.ok) throw new Error(`文件上传失败: ${uploadResp.status}`);

  const { id: fileId } = await uploadResp.json() as { id: string };

  const contentResp = await fetch(`${KIMI_BASE}/files/${fileId}/content`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!contentResp.ok) throw new Error(`获取文件内容失败: ${contentResp.status}`);

  const { content: pdfText } = await contentResp.json() as { content: string };

  const chatResp = await fetch(`${KIMI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: '你是一个学校家长助手，专门从学校通知中提取活动和时间安排。' },
        { role: 'user', content: `${EXTRACT_PROMPT}\n\n以下是文件内容：\n\n${pdfText}` },
      ],
      temperature: 0.1,
    }),
  });
  if (!chatResp.ok) throw new Error(`Kimi API 错误: ${chatResp.status}`);

  const chatData = await chatResp.json() as { choices: Array<{ message: { content: string } }> };

  fetch(`${KIMI_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  }).catch(() => undefined);

  return parseJsonResponse(chatData.choices[0]?.message?.content ?? '');
}

export async function extractEventsFromFiles(files: File[]): Promise<ExtractedEvent[]> {
  const results: ExtractedEvent[] = [];
  for (const file of files) {
    const events = isPdfFile(file)
      ? await extractFromPdf(file)
      : await extractFromImage(file);
    results.push(...events);
  }
  return results;
}
