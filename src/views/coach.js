/**
 * NatureGuard — AI Carbon Coach View
 * Contextual chat interface using Gemini streaming.
 */

import { $, $$ } from '../utils/dom.js';
import { sendChatMessage } from '../ai/coach.js';
import { getProfile } from '../modules/db.js';
import { toastError } from '../utils/toast.js';
import { geminiService } from '../ai/geminiService.js';

let chatHistory = [];
const SUGGESTIONS = [
  "What's my biggest emission source?",
  "How do I improve my score?",
  "Am I better than last week?",
  "What's one thing I should change today?"
];

export async function render(container) {
  // Check if API key is configured
  const isReady = geminiService.isReady();

  container.innerHTML = `
    <div class="view" id="coach-view" style="display:flex; flex-direction:column; padding-bottom:calc(var(--nav-height, 64px) + 16px + env(safe-area-inset-bottom, 0px)); height: 100dvh;">
      <header class="view-header" style="flex-shrink:0;">
        <h1 class="view-title">AI Carbon Coach</h1>
        <p style="font-size:13px; color:var(--text-muted);">Personalized insights based on your logged data</p>
      </header>

      ${!isReady ? `
        <div class="card card-warning" style="margin-top:20px;">
          <h3 style="font-size:15px; font-weight:600; margin-bottom:8px;">⚠️ API Key Required</h3>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            The AI Coach needs a Gemini API key to function.
          </p>
          <a href="#settings" class="btn btn-primary btn-sm">Go to Settings</a>
        </div>
      ` : `
        <div class="chat-container" style="flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative;">
          
          <div id="chat-messages" class="chat-messages" aria-live="polite" style="flex:1; overflow-y:auto; padding-bottom:20px;">
            <div class="chat-bubble ai">
              Hello! 👋 I'm your AI Carbon Coach. I've reviewed your recent footprint data. How can I help you today?
            </div>
            ${chatHistory.map(msg => renderBubble(msg.role, msg.parts[0].text)).join('')}
          </div>

          <div class="chat-input-area" style="flex-shrink:0; background:var(--bg-base); padding-top:12px;">
            
            <div id="suggestion-container" class="suggestion-chips scroll-hide" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:12px;" ${chatHistory.length > 0 ? 'hidden' : ''}>
              ${(chatHistory.length === 0 ? SUGGESTIONS : []).map(s => `<button class="chip suggestion-chip" type="button" style="white-space:nowrap;">${s}</button>`).join('')}
            </div>

            <form id="chat-form" style="display:flex; gap:8px; width:100%;">
              <input type="text" id="chat-input" class="input" placeholder="Ask your coach..." autocomplete="off" style="flex:1;" />
              <button type="submit" id="chat-submit" class="btn btn-teal" aria-label="Send message" style="padding:0 16px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <div style="display:flex; justify-content:space-between; margin-top:8px;">
              <button id="clear-chat-btn" class="text-link" style="font-size:11px; color:var(--text-muted); background:none; border:none; padding:0; cursor:pointer;">Clear chat</button>
              <span style="font-size:10px; color:var(--text-muted);">AI can make mistakes.</span>
            </div>
          </div>
        </div>
      `}
    </div>
  `;

  if (isReady) {
    setupChatLogic(container);
  }
}

function setupChatLogic(container) {
  const form = container.querySelector('#chat-form');
  const input = container.querySelector('#chat-input');
  const submitBtn = container.querySelector('#chat-submit');
  const messagesEl = container.querySelector('#chat-messages');

  // Auto-scroll to bottom initially
  scrollToBottom(messagesEl);

  // Suggestion chips
  container.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent;
      form.dispatchEvent(new Event('submit'));
    });
  });

  // Clear chat
  container.querySelector('#clear-chat-btn')?.addEventListener('click', () => {
    chatHistory = [];
    container.querySelector('.chat-container').innerHTML = `
      <div id="chat-messages" class="chat-messages" aria-live="polite" style="flex:1; overflow-y:auto; padding-bottom:20px;">
        <div class="chat-bubble ai animate-fadeInUp">Cleared history. How can I help you now?</div>
      </div>
      <div class="chat-input-area" style="flex-shrink:0; background:var(--bg-base); padding-top:12px;">
        <div id="suggestion-container" class="suggestion-chips scroll-hide" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:12px;">
          ${SUGGESTIONS.map(s => `<button class="chip suggestion-chip" type="button" style="white-space:nowrap;">${s}</button>`).join('')}
        </div>
        <form id="chat-form" style="display:flex; gap:8px; width:100%;">
          <input type="text" id="chat-input" class="input" placeholder="Ask your coach..." autocomplete="off" style="flex:1;" />
          <button type="submit" id="chat-submit" class="btn btn-teal" aria-label="Send message" style="padding:0 16px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    `;
    setupChatLogic(container);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    submitBtn.disabled = true;
    const chipsContainer = container.querySelector('#suggestion-container');
    if (chipsContainer) chipsContainer.hidden = true;

    // Add user message to UI
    messagesEl.insertAdjacentHTML('beforeend', renderBubble('user', text));
    scrollToBottom(messagesEl);

    // Create empty AI bubble for streaming
    messagesEl.insertAdjacentHTML('beforeend', `
      <div class="chat-bubble ai streaming" id="current-stream">
        <span class="stream-content"></span><span class="typing-cursor"></span>
      </div>
    `);
    
    const streamBubble = messagesEl.querySelector('#current-stream');
    const streamContent = streamBubble.querySelector('.stream-content');
    let fullResponse = '';

    try {
      await sendChatMessage(text, chatHistory, (chunk) => {
        fullResponse += chunk;
        // Basic markdown formatting on the fly
        streamContent.innerHTML = formatMarkdown(fullResponse);
        scrollToBottom(messagesEl);
      });

      // Streaming finished
      streamBubble.classList.remove('streaming');
      streamBubble.querySelector('.typing-cursor')?.remove();
      streamBubble.removeAttribute('id');

      let finalResponse = fullResponse;
      const suggestionsMatch = fullResponse.match(/---SUGGESTIONS---[\s\S]*/);
      if (suggestionsMatch) {
        finalResponse = fullResponse.slice(0, suggestionsMatch.index).trim();
        streamContent.innerHTML = formatMarkdown(finalResponse);
        
        const suggestionsLines = suggestionsMatch[0].replace('---SUGGESTIONS---', '').split('\n');
        const suggestions = suggestionsLines.map(s => s.trim().replace(/^[-\*]\s*/, '').replace(/^\d+\.\s*/, '')).filter(s => s.length > 0);
        
        if (suggestions.length > 0 && chipsContainer) {
          chipsContainer.innerHTML = suggestions.map(s => `<button class="chip suggestion-chip" type="button" style="white-space:nowrap;">${s}</button>`).join('');
          chipsContainer.hidden = false;
          chipsContainer.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              input.value = chip.textContent;
              form.dispatchEvent(new Event('submit'));
            });
          });
        }
      }

      // Update history state
      chatHistory.push({ role: 'user', parts: [{ text }] });
      chatHistory.push({ role: 'model', parts: [{ text: finalResponse }] });

    } catch (err) {
      console.error(err);
      toastError(err.message || 'Coach failed to respond');
      streamBubble.innerHTML = `<span style="color:var(--accent-red)">⚠️ Error connecting to coach.</span>`;
      streamBubble.classList.remove('streaming');
      streamBubble.removeAttribute('id');
    } finally {
      submitBtn.disabled = false;
      input.focus();
    }
  });
}

function renderBubble(role, text) {
  return `<div class="chat-bubble ${role} animate-fadeInUp">${formatMarkdown(text)}</div>`;
}

function scrollToBottom(el) {
  el.scrollTop = el.scrollHeight;
}

/** Basic Markdown formatter for chat bubbles (handles bold and newlines) */
function formatMarkdown(text) {
  // Escape HTML
  let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Bullet points
  html = html.replace(/^\s*[-*]\s+(.*)/gm, '<li>$1</li>');
  // Wrap adjacent LIs in UL
  html = html.replace(/(<li>.*<\/li>(\n?))+/g, '<ul style="margin-left:20px;margin-top:8px;margin-bottom:8px;">$&</ul>');
  
  // Newlines to BR
  html = html.replace(/\n/g, '<br/>');
  
  return html;
}
