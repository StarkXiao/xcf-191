import { getCollection, saveCollection } from './storage.js';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_WORDS = [
  { word: '广告', category: 'spam' },
  { word: '代购', category: 'spam' },
  { word: '加微信', category: 'spam' },
  { word: '兼职', category: 'spam' },
  { word: '刷单', category: 'spam' }
];

export const ensureDefaultWords = () => {
  const words = getCollection('sensitiveWords');
  if (words.length === 0) {
    const defaults = DEFAULT_WORDS.map(w => ({
      id: uuidv4(),
      word: w.word,
      category: w.category,
      enabled: true,
      createdAt: new Date().toISOString()
    }));
    saveCollection('sensitiveWords', defaults);
  }
};

export const checkSensitiveWords = (text) => {
  if (!text || typeof text !== 'string') return { matched: [], hasSensitive: false };

  const words = getCollection('sensitiveWords');
  const enabledWords = words.filter(w => w.enabled !== false);
  const matched = [];

  const lowerText = text.toLowerCase();
  for (const item of enabledWords) {
    if (lowerText.includes(item.word.toLowerCase())) {
      matched.push({ word: item.word, category: item.category || 'other' });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const m of matched) {
    const key = m.word;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(m);
    }
  }

  return { matched: unique, hasSensitive: unique.length > 0 };
};

export const highlightSensitiveWords = (text, matchedWords) => {
  if (!matchedWords || matchedWords.length === 0) return text;
  let result = text;
  for (const m of matchedWords) {
    const regex = new RegExp(m.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, '§§$&§§');
  }
  return result;
};
