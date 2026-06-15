export async function render(container) {
  container.innerHTML = `
    <div class="view" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;">
      <h1 style="font-size:48px;font-family:var(--font-display);color:var(--accent-lime);margin-bottom:16px;">404</h1>
      <p style="font-size:16px;color:var(--text-secondary);margin-bottom:24px;">The page you are looking for does not exist.</p>
      <a href="#dashboard" class="btn btn-primary">Go to Dashboard</a>
    </div>
  `;
}
