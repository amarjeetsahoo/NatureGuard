/**
 * NatureGuard — AI Onboarding View
 * Conversational profiler for new users.
 */

import { $, $$ } from '../utils/dom.js';
import { router } from '../router.js';
import { geminiService } from '../ai/geminiService.js';
import { ONBOARDING_PROMPT } from '../ai/prompts.js';
import { finalizeOnboarding } from '../ai/profiler.js';

let conversation = [];
let stepCount = 1;
const MAX_STEPS = 3;

export async function render(container) {
  // Reset state
  conversation = [];
  stepCount = 1;

  container.innerHTML = `
    <div class="view" id="onboarding-view" style="display:flex; flex-direction:column; height:100vh; padding:0; background:var(--bg-base);">
      
      <header style="padding:24px 20px 12px; background:var(--bg-panel); border-bottom:1px solid rgba(255,255,255,0.05); text-align:center;">
        <h1 style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">Welcome to NatureGuard! 🌿</h1>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">Let's customize your experience.</p>
        
        <!-- Progress Bar -->
        <div style="width:100%; height:4px; background:var(--glass-bg); border-radius:2px; overflow:hidden;">
          <div id="ob-progress" style="width:33%; height:100%; background:var(--accent-teal); transition:width 0.4s ease;"></div>
        </div>
      </header>

      <div id="ob-chat-history" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px;">
        <!-- Chat bubbles appear here -->
      </div>

      <div style="padding:16px 20px; background:var(--bg-panel); border-top:1px solid rgba(255,255,255,0.05);">
        <form id="ob-chat-form" style="display:flex; gap:12px;">
          <input type="text" id="ob-chat-input" class="input" placeholder="Type your answer..." style="flex:1;" autocomplete="off" />
          <button type="submit" class="btn btn-primary" id="ob-send-btn">Send</button>
        </form>
        <div style="text-align:center; margin-top:12px;">
          <button type="button" class="btn btn-secondary btn-sm" id="ob-skip-btn">Skip Onboarding</button>
        </div>
      </div>
    </div>
  `;

  const historyEl = container.querySelector('#ob-chat-history');
  const form = container.querySelector('#ob-chat-form');
  const input = container.querySelector('#ob-chat-input');
  const skipBtn = container.querySelector('#ob-skip-btn');

  // Skip logic
  skipBtn.addEventListener('click', async () => {
    skipBtn.textContent = "Skipping...";
    await finalizeOnboarding("");
    router.navigate('#dashboard');
  });

  // Start conversation
  if (!geminiService.isReady()) {
    addMessage(historyEl, "assistant", "Hi there! I notice you haven't configured your Gemini API key yet. We can skip this setup for now, and you can add it in Settings later!");
    input.disabled = true;
  } else {
    // Initial prompt payload to kick off the conversation
    conversation.push({
      role: 'user',
      parts: [{ text: "Hello! I am a new user. Please start the onboarding process by asking me your first question about my lifestyle." }]
    });
    await fetchAIResponse(historyEl, input);
  }

  // Handle user input
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Add user message to UI
    addMessage(historyEl, "user", text);
    input.value = '';
    
    // Add to conversation state
    conversation.push({ role: 'user', parts: [{ text }] });

    // Step progression
    stepCount++;
    const progressEl = container.querySelector('#ob-progress');
    if (progressEl) progressEl.style.width = `${Math.min(100, (stepCount / MAX_STEPS) * 100)}%`;

    if (stepCount > MAX_STEPS) {
      // Finished!
      input.disabled = true;
      addMessage(historyEl, "assistant", "Perfect, thank you! I'm setting up your profile now... ✨");
      
      // Compile transcript
      const transcript = conversation.map(msg => `${msg.role}: ${msg.parts[0].text}`).join('\\n');
      
      // Extract and save
      await finalizeOnboarding(transcript);
      
      // Navigate away
      setTimeout(() => router.navigate('#dashboard'), 1500);
      return;
    }

    // Otherwise, fetch next AI question
    await fetchAIResponse(historyEl, input);
  });
}

async function fetchAIResponse(historyEl, input) {
  input.disabled = true;
  const loadingId = "ob-loading";
  
  // Add loading dots
  historyEl.insertAdjacentHTML('beforeend', `
    <div id="${loadingId}" style="align-self:flex-start; background:rgba(255,255,255,0.05); padding:12px 16px; border-radius:16px 16px 16px 4px;">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>
  `);
  historyEl.scrollTop = historyEl.scrollHeight;

  try {
    const text = await geminiService.generate(conversation, ONBOARDING_PROMPT);
    
    // Remove loading
    const loader = historyEl.querySelector(`#${loadingId}`);
    if (loader) loader.remove();

    // Add AI response to UI
    addMessage(historyEl, "assistant", text);
    
    // Save to conversation
    conversation.push({ role: 'model', parts: [{ text }] });

  } catch (err) {
    const loader = historyEl.querySelector(`#${loadingId}`);
    if (loader) loader.remove();
    addMessage(historyEl, "assistant", "Oops! I had trouble connecting. You can click 'Skip Onboarding' to jump straight in.");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function addMessage(container, role, text) {
  const isUser = role === 'user';
  
  const el = document.createElement('div');
  el.style.maxWidth = '85%';
  el.style.padding = '12px 16px';
  el.style.lineHeight = '1.5';
  el.style.fontSize = '14px';
  el.style.animation = 'fadeInUp 0.3s ease-out forwards';
  
  if (isUser) {
    el.style.alignSelf = 'flex-end';
    el.style.background = 'var(--accent-teal)';
    el.style.color = '#000';
    el.style.borderRadius = '16px 16px 4px 16px';
    el.textContent = text; // Secure from XSS
  } else {
    el.style.alignSelf = 'flex-start';
    el.style.background = 'rgba(255,255,255,0.05)';
    el.style.color = 'var(--text-primary)';
    el.style.borderRadius = '16px 16px 16px 4px';
    el.style.border = '1px solid rgba(255,255,255,0.1)';
    // Simple bold markdown
    el.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}
