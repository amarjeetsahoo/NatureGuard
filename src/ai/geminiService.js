/**
 * NatureGuard — Gemini AI Service
 * Singleton service for all interactions with the Gemini API.
 * Handles rate limiting, retries, structured JSON generation, and streaming.
 */

import { getProfile, incrementAiUsage } from '../modules/db.js';

export class DefaultKeyLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DefaultKeyLimitError';
  }
}

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.model = 'gemini-2.5-flash-lite';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    
    // Rate Limiting (Free tier: 15 RPM. We cap at 14 to be safe)
    this.requestLog = [];
    this.maxRPM = 14;
  }

  /**
   * Set the API key (usually loaded from user profile at boot)
   * @param {string} key 
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  /** Check if user has personal key or default key configured */
  isReady() {
    return !!this.apiKey || !!import.meta.env.VITE_DEFAULT_GEMINI_KEY;
  }

  /**
   * Helper to resolve which API key to use and whether to track usage.
   * Throws DefaultKeyLimitError if the user exceeded default key limit.
   */
  async _resolveKeyAndUsage() {
    if (this.apiKey) return { key: this.apiKey, isDefault: false };

    const defaultKey = import.meta.env.VITE_DEFAULT_GEMINI_KEY;
    if (!defaultKey) {
      throw new Error('Gemini API key is missing. Please configure it in Settings.');
    }

    const { data: profile } = await getProfile();
    if (!profile) throw new Error('User profile not loaded.');

    if (profile.ai_usage_count >= 10) {
      throw new DefaultKeyLimitError('You have reached the 10 free AI requests limit. Please configure your own Gemini API key in Settings.');
    }

    return { key: defaultKey, isDefault: true };
  }

  /** Enforce local rate limit */
  async _checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old logs
    this.requestLog = this.requestLog.filter(t => t > oneMinuteAgo);
    
    if (this.requestLog.length >= this.maxRPM) {
      const oldest = this.requestLog[0];
      const waitTime = (oldest + 60000) - now;
      console.warn(`[Gemini] Local rate limit reached (${this.maxRPM} RPM). Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this._checkRateLimit(); // Recursive check after waiting
    }
    
    this.requestLog.push(Date.now());
  }

  /**
   * Core request wrapper with exponential backoff for 429s.
   */
  async _fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    const { key, isDefault } = await this._resolveKeyAndUsage();
    
    await this._checkRateLimit();

    try {
      const response = await fetch(`${url}?key=${key}`, options);
      
      if (response.status === 429 && retries > 0) {
        console.warn(`[Gemini] API rate limit (429). Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this._fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
      }
      if (isDefault && response.ok && !url.includes('maxOutputTokens=1')) {
        await incrementAiUsage(); // Don't track usage for validateKey calls
      }
      return response;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Network error. Check your connection.');
      }
      throw error;
    }
  }

  /**
   * Validate if a key works by making a tiny request.
   */
  async validateKey(keyToTest) {
    const tempKey = this.apiKey;
    this.apiKey = keyToTest;
    try {
      const response = await this._fetchWithRetry(
        `${this.baseUrl}/${this.model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Test' }] }],
            generationConfig: { maxOutputTokens: 1 }
          })
        }
      );
      this.apiKey = tempKey; // restore
      return response.ok;
    } catch (err) {
      this.apiKey = tempKey; // restore
      return false;
    }
  }

  /**
   * Generate standard text response.
   */
  async generate(promptOrHistory, systemInstruction = null, temperature = 0.7) {
    const contents = Array.isArray(promptOrHistory) 
      ? promptOrHistory 
      : [{ role: 'user', parts: [{ text: promptOrHistory }] }];

    const body = {
      contents,
      generationConfig: { temperature }
    };

    if (systemInstruction) {
      body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await this._fetchWithRetry(
      `${this.baseUrl}/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Generate structured JSON output.
   */
  async generateJSON(prompt, systemInstruction = null) {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temp for deterministic JSON
        responseMimeType: 'application/json'
      }
    };

    if (systemInstruction) {
      body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await this._fetchWithRetry(
      `${this.baseUrl}/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'null';
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error('AI returned invalid JSON');
    }
  }

  /**
   * Stream a response for chat interfaces.
   * Calls onChunk with each new piece of text.
   */
  async generateStream(prompt, systemInstruction = null, history = [], onChunk) {
    const { key, isDefault } = await this._resolveKeyAndUsage();
    await this._checkRateLimit();

    const contents = [...history];
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const body = {
      contents,
      generationConfig: { temperature: 0.7 }
    };

    if (systemInstruction) {
      body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.model}:streamGenerateContent?alt=sse&key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Streaming failed: ${response.status} - ${errText}`);
      }
      
      if (isDefault) await incrementAiUsage();

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              const chunkText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunkText) {
                onChunk(chunkText);
              }
            } catch (e) {
              console.warn('[Gemini] Failed to parse stream chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
