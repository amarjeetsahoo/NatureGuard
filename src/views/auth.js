/**
 * NatureGuard — Auth View
 * Sign In / Sign Up / Magic Link
 */

import { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithMagicLink } from '../auth/authService.js';
import { toastSuccess, toastError } from '../utils/toast.js';

export async function render(container) {
  const defaultTab = sessionStorage.getItem('auth_tab') || 'signin';
  sessionStorage.removeItem('auth_tab');

  container.innerHTML = `
    <div id="auth-view">
      <div class="auth-card card card-elevated animate-fadeInScale">

        <!-- Logo -->
        <div class="auth-logo">
          <span style="font-size:40px;">🌿</span>
          <div style="font-size:22px;font-weight:700;margin-top:8px;">NatureGuard</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Your AI carbon coach</div>
        </div>

        <!-- Tab Switcher -->
        <div style="display:flex;gap:4px;background:var(--bg-base);padding:4px;border-radius:var(--radius-full);margin-bottom:24px;" role="tablist">
          <button
            id="tab-signin"
            class="period-btn ${defaultTab === 'signin' ? 'active' : ''}"
            style="flex:1;padding:8px;"
            role="tab"
            aria-selected="${defaultTab === 'signin'}"
            aria-controls="panel-signin"
          >Sign In</button>
          <button
            id="tab-signup"
            class="period-btn ${defaultTab === 'signup' ? 'active' : ''}"
            style="flex:1;padding:8px;"
            role="tab"
            aria-selected="${defaultTab === 'signup'}"
            aria-controls="panel-signup"
          >Sign Up</button>
        </div>

        <!-- Sign In Panel -->
        <div id="panel-signin" role="tabpanel" aria-labelledby="tab-signin" ${defaultTab !== 'signin' ? 'hidden' : ''}>
          <button id="google-btn" class="google-btn" type="button" aria-label="Continue with Google">
            <svg class="google-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div class="divider-text" style="margin:20px 0;"><span>or</span></div>

          <form id="signin-form" class="auth-form" novalidate>
            <div class="input-group">
              <label class="input-label" for="signin-email">Email</label>
              <input
                id="signin-email"
                class="input"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
            </div>
            <div class="input-group">
              <label class="input-label" for="signin-password">Password</label>
              <input
                id="signin-password"
                class="input"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                required
                minlength="6"
              />
            </div>
            <button id="signin-submit" class="btn btn-primary btn-full" type="submit">
              <span class="btn-text">Sign In</span>
            </button>
          </form>

          <div class="divider-text" style="margin:16px 0;"><span>or</span></div>

          <button id="magic-link-btn" class="btn btn-secondary btn-full" type="button">
            ✉️ Send Magic Link
          </button>
        </div>

        <!-- Sign Up Panel -->
        <div id="panel-signup" role="tabpanel" aria-labelledby="tab-signup" ${defaultTab !== 'signup' ? 'hidden' : ''}>
          <button id="google-btn-signup" class="google-btn" type="button" aria-label="Sign up with Google">
            <svg class="google-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign Up with Google
          </button>

          <div class="divider-text" style="margin:20px 0;"><span>or</span></div>

          <form id="signup-form" class="auth-form" novalidate>
            <div class="input-group">
              <label class="input-label" for="signup-name">Display Name</label>
              <input
                id="signup-name"
                class="input"
                type="text"
                placeholder="Alex Green"
                autocomplete="name"
                required
              />
            </div>
            <div class="input-group">
              <label class="input-label" for="signup-email">Email</label>
              <input
                id="signup-email"
                class="input"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
            </div>
            <div class="input-group">
              <label class="input-label" for="signup-password">Password</label>
              <input
                id="signup-password"
                class="input"
                type="password"
                placeholder="Min 6 characters"
                autocomplete="new-password"
                required
                minlength="6"
              />
            </div>
            <button id="signup-submit" class="btn btn-primary btn-full" type="submit">
              <span class="btn-text">Create Account</span>
            </button>
          </form>
        </div>

        <!-- Footer note -->
        <p style="text-align:center;margin-top:20px;font-size:12px;color:var(--text-muted);">
          By continuing, you agree to our privacy policy.<br/>
          Your data is stored securely and never sold.
        </p>

      </div>
    </div>
  `;

  setupTabSwitcher(container);
  setupSignIn(container);
  setupSignUp(container);
  setupGoogleAuth(container);
  setupMagicLink(container);
}

function setupTabSwitcher(container) {
  const tabSignin = container.querySelector('#tab-signin');
  const tabSignup = container.querySelector('#tab-signup');
  const panelSignin = container.querySelector('#panel-signin');
  const panelSignup = container.querySelector('#panel-signup');

  tabSignin.addEventListener('click', () => {
    tabSignin.classList.add('active'); tabSignin.ariaSelected = 'true';
    tabSignup.classList.remove('active'); tabSignup.ariaSelected = 'false';
    panelSignin.hidden = false;
    panelSignup.hidden = true;
  });

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active'); tabSignup.ariaSelected = 'true';
    tabSignin.classList.remove('active'); tabSignin.ariaSelected = 'false';
    panelSignup.hidden = false;
    panelSignin.hidden = true;
  });
}

function setupSignIn(container) {
  const form = container.querySelector('#signin-form');
  const btn = container.querySelector('#signin-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#signin-email').value.trim();
    const password = container.querySelector('#signin-password').value;

    btn.classList.add('loading');
    const { error } = await signInWithEmail(email, password);
    btn.classList.remove('loading');

    if (error) toastError(error.message);
    else toastSuccess('Welcome back! 👋');
  });
}

function setupSignUp(container) {
  const form = container.querySelector('#signup-form');
  const btn = container.querySelector('#signup-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = container.querySelector('#signup-name').value.trim();
    const email = container.querySelector('#signup-email').value.trim();
    const password = container.querySelector('#signup-password').value;

    if (!name) { toastError('Please enter your name'); return; }

    btn.classList.add('loading');
    const { error } = await signUpWithEmail(email, password, name);
    btn.classList.remove('loading');

    if (error) toastError(error.message);
    else toastSuccess('Account created! Check your email to verify. 🌱');
  });
}

function setupGoogleAuth(container) {
  [container.querySelector('#google-btn'), container.querySelector('#google-btn-signup')].forEach(btn => {
    btn?.addEventListener('click', async () => {
      btn.classList.add('loading');
      const { error } = await signInWithGoogle();
      if (error) { btn.classList.remove('loading'); toastError(error.message); }
    });
  });
}

function setupMagicLink(container) {
  const btn = container.querySelector('#magic-link-btn');
  btn.addEventListener('click', async () => {
    const email = container.querySelector('#signin-email').value.trim();
    if (!email) { toastError('Enter your email first'); return; }

    btn.classList.add('loading');
    const { error } = await signInWithMagicLink(email);
    btn.classList.remove('loading');

    if (error) toastError(error.message);
    else toastSuccess('Magic link sent! Check your inbox ✨');
  });
}
