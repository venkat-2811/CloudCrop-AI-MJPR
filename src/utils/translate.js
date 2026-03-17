import { groqChat } from './groqApi';

const BRAND = 'CloudCrop AI';
const PLACEHOLDER = '__CLOUDCROP_AI__';
const translationCache = {};

export async function batchTranslateText(texts, targetLang, apiKey) {
  // Handle both array of strings and array of objects with text property
  const textStrings = texts.map(text => {
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text.text) return text.text;
    return '';
  }).filter(text => text !== '');

  if (!textStrings.length || targetLang === 'en') {
    if (texts.length > 0 && typeof texts[0] === 'object') {
      return texts.map(t => ({ ...t, text: typeof t === 'string' ? t : t.text }));
    }
    return textStrings;
  }

  const cacheKey = (text) => `${text}__${targetLang}`;

  // Replace brand name with placeholder
  const textsWithPlaceholder = textStrings.map(text => {
    const regex = new RegExp(BRAND, 'gi');
    return text.replace(regex, PLACEHOLDER);
  });

  // Check cache
  const results = [];
  const toTranslate = [];
  const toTranslateIndices = [];

  textsWithPlaceholder.forEach((text, idx) => {
    const origText = textStrings[idx];
    if (origText.trim().toLowerCase() === BRAND.toLowerCase()) {
      results[idx] = BRAND;
    } else if (translationCache[cacheKey(origText)]) {
      results[idx] = translationCache[cacheKey(origText)];
    } else {
      toTranslate.push(text);
      toTranslateIndices.push(idx);
    }
  });

  if (toTranslate.length > 0) {
    const langNames = {
      hi: 'Hindi', te: 'Telugu', ta: 'Tamil', mr: 'Marathi',
      bn: 'Bengali', pa: 'Punjabi', gu: 'Gujarati', kn: 'Kannada',
      ml: 'Malayalam', ur: 'Urdu', or: 'Odia', as: 'Assamese', sa: 'Sanskrit',
    };
    const langName = langNames[targetLang] || targetLang;

    try {
      const numbered = toTranslate.map((t, i) => `[${i}] ${t}`).join('\n');

      const response = await groqChat(
        [
          {
            role: 'system',
            content: `You are a translator. Translate each numbered line to ${langName}. Return ONLY the translated lines in the same numbered format [0], [1], etc. Keep "${PLACEHOLDER}" unchanged.`,
          },
          { role: 'user', content: numbered },
        ],
        { temperature: 0.2, maxTokens: 2000 }
      );

      const lines = response.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const match = line.match(/^\[(\d+)\]\s*(.+)/);
        if (match) {
          const i = parseInt(match[1]);
          if (i >= 0 && i < toTranslate.length) {
            const finalText = match[2].trim().replace(new RegExp(PLACEHOLDER, 'g'), BRAND);
            const origIdx = toTranslateIndices[i];
            results[origIdx] = finalText;
            translationCache[cacheKey(textStrings[origIdx])] = finalText;
          }
        }
      });

      // Fill any missing results with originals
      toTranslateIndices.forEach(idx => {
        if (!results[idx]) results[idx] = textStrings[idx];
      });
    } catch (error) {
      console.error('Translation error:', error);
      toTranslateIndices.forEach(idx => {
        results[idx] = textStrings[idx];
      });
    }
  }

  // Return in same format as input
  if (texts.length > 0 && typeof texts[0] === 'object') {
    return results.map((translatedText, index) => ({
      ...texts[index],
      text: translatedText
    }));
  }

  return results;
}

export async function translateText(text, targetLang, apiKey) {
  const textToTranslate = typeof text === 'string' ? text : (text.text || '');

  if (!textToTranslate.trim() || targetLang === 'en') {
    return text;
  }

  // If the whole text is just the brand, return as is
  if (textToTranslate.trim().toLowerCase() === BRAND.toLowerCase()) {
    return typeof text === 'string' ? BRAND : { ...text, text: BRAND };
  }

  const langNames = {
    hi: 'Hindi', te: 'Telugu', ta: 'Tamil', mr: 'Marathi',
    bn: 'Bengali', pa: 'Punjabi', gu: 'Gujarati', kn: 'Kannada',
    ml: 'Malayalam', ur: 'Urdu', or: 'Odia', as: 'Assamese', sa: 'Sanskrit',
  };
  const langName = langNames[targetLang] || targetLang;

  const regex = new RegExp(BRAND, 'gi');
  const textWithPlaceholder = textToTranslate.replace(regex, PLACEHOLDER);

  try {
    const translated = await groqChat(
      [
        {
          role: 'system',
          content: `You are a translator. Translate the given text to ${langName}. Return ONLY the translated text, nothing else. Keep "${PLACEHOLDER}" unchanged.`,
        },
        { role: 'user', content: textWithPlaceholder },
      ],
      { temperature: 0.2, maxTokens: 500 }
    );

    const finalText = translated.trim().replace(new RegExp(PLACEHOLDER, 'g'), BRAND);
    return typeof text === 'string' ? finalText : { ...text, text: finalText };
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}