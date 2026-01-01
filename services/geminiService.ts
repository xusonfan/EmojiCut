import { GoogleGenAI, Type } from "@google/genai";

const getApiConfig = (type: 'image' | 'text' = 'image') => {
  // 优先级：专用 Key > 通用 Key
  let apiKey = process.env.API_KEY;
  if (type === 'image' && process.env.API_KEY_IMAGE) {
    apiKey = process.env.API_KEY_IMAGE;
  } else if (type === 'text' && process.env.API_KEY_TEXT) {
    apiKey = process.env.API_KEY_TEXT;
  }

  // 优先级：专用 BaseUrl > 通用 BaseUrl > 默认 Google 地址
  let baseUrl = process.env.API_BASE_URL || "https://generativelanguage.googleapis.com";
  
  if (type === 'image' && process.env.API_BASE_URL_IMAGE) {
    baseUrl = process.env.API_BASE_URL_IMAGE;
  } else if (type === 'text' && process.env.API_BASE_URL_TEXT) {
    baseUrl = process.env.API_BASE_URL_TEXT;
  }

  // 移除末尾的斜杠
  baseUrl = baseUrl.replace(/\/$/, "");

  if (!apiKey) {
    console.warn(`API_KEY for ${type} is not set. Skipping AI features.`);
    return null;
  }

  return { apiKey, baseUrl };
};

// 通用 Fetch 请求函数
const callGeminiApi = async (model: string, contents: any, config?: any, type: 'image' | 'text' = 'image') => {
  const apiConfig = getApiConfig(type);
  if (!apiConfig) throw new Error(`API_KEY for ${type} is not set`);

  const url = `${apiConfig.baseUrl}/v1beta/models/${model}:generateContent?key=${apiConfig.apiKey}`;
  
  // 确保 contents 始终是数组格式
  const requestBody = {
    contents: Array.isArray(contents.contents) ? contents.contents : 
              (Array.isArray(contents) ? contents : [contents]),
    generationConfig: config
  };

  // 某些中转服务（如 OneAPI）严格校验 contents 结构
  // 如果之前传递的是 { parts: [...] }，这里需要包一层 { role: "user", parts: [...] }
  if (requestBody.contents.length > 0 && !requestBody.contents[0].role) {
    requestBody.contents = requestBody.contents.map((item: any) => ({
      role: "user",
      parts: item.parts || item
    }));
  }

  // Debug Log
  console.log(`🚀 Calling Gemini API (${type}):`, url);
  console.log("📦 Request Body:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
};


// ==================== Sticker Style Presets ====================

export interface StickerStyle {
  id: string;
  name: string;        // 中文显示名
  description: string; // 风格描述
}

export const STICKER_STYLES: StickerStyle[] = [
  {
    id: 'line_cute',
    name: '可爱LINE贴纸',
    description: '可爱的卡通二头身角色，适合日常聊天'
  },
  {
    id: 'chibi_expressive',
    name: 'Q版表情包',
    description: '夸张表情的Q版角色，情绪丰富'
  },
  {
    id: 'kawaii_pastel',
    name: '粉彩少女风',
    description: '柔和粉彩配色，梦幻少女感'
  },
  {
    id: 'dynamic_action',
    name: '动感活力风',
    description: '活泼动作姿势，充满活力'
  }
];

/**
 * Build the generation prompt with base template + user-defined style
 * If user provides a custom style, it takes priority over the preset style
 */
const buildStickerPrompt = (style: StickerStyle, customStyle?: string): string => {
  const basePrompt = `为图中角色设计一个可爱的卡通角色，生成 16种 LINE 贴纸。姿势和文字排版要富有创意，变化丰富，设计独特。对话应为简体中文，可以是角色在不同场景，不同情绪的，角色比例二头身。

重要要求：背景必须是纯白色(#FFFFFF)，不要有任何其他颜色或图案。每个贴纸之间要有足够间距。`;

  // 如果用户提供了自定义风格，优先使用用户的风格描述
  const styleDescription = customStyle && customStyle.trim()
    ? customStyle.trim()
    : style.description;

  const styleHint = `画面风格：${styleDescription}`;

  return `${basePrompt}
${styleHint}`;
};

/**
 * Generate a sticker sheet using Gemini 3 Pro Image model
 */
export const generateStickerSheet = async (
  referenceImage: string,
  style: StickerStyle,
  customStyle?: string
): Promise<string> => {
  try {
    // Remove data:image/xxx;base64, prefix if present
    const cleanBase64 = referenceImage.includes(',')
      ? referenceImage.split(',')[1]
      : referenceImage;

    const prompt = buildStickerPrompt(style, customStyle);
    const model = process.env.MODEL_IMAGE || 'gemini-3-pro-image-preview';

    const response = await callGeminiApi(model, [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      }
    ], undefined, 'image');

    // Extract the generated image from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image returned from generation: " + JSON.stringify(response));

  } catch (error) {
    console.error("Sticker Generation Error:", error);
    throw error;
  }
};

// ==================== Sticker Naming ====================

export const generateStickerName = async (base64Image: string): Promise<string> => {
  try {
    // Remove data:image/png;base64, prefix
    const cleanBase64 = base64Image.split(',')[1];
    const model = process.env.MODEL_TEXT || 'gemini-2.5-flash';

    const response = await callGeminiApi(model, [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          {
            text: "Analyze this sticker. Return a JSON object with a 'filename' property containing a short, descriptive name (max 3 words) in English using snake_case. If there is text, try to capture the meaning or emotion. Example: 'sad_crying', 'thumbs_up', 'working_hard'."
          }
        ]
      }
    ], {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          filename: { type: Type.STRING }
        }
      }
    }, 'text');

    if (response.candidates && response.candidates[0]?.content?.parts && response.candidates[0].content.parts[0].text) {
      const data = JSON.parse(response.candidates[0].content.parts[0].text);
      return data.filename || "sticker";
    }
    return "sticker";

  } catch (error) {
    console.error("Gemini Naming Error:", error);
    return "sticker"; // Fallback
  }
};
