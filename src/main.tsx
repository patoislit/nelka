import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './i18n/index'
import App from './App.tsx'

// Electron — vlastný frameless titlebar; trieda na <html> spustí layout offset v CSS
const electronAPI = (window as unknown as { electronAPI?: { isElectron?: boolean; platform?: string } }).electronAPI;
if (electronAPI?.isElectron) {
  document.documentElement.classList.add('is-electron');
  document.documentElement.classList.add(electronAPI.platform === 'darwin' ? 'is-mac' : 'is-win');
}

// PWA aktualizácie — pri novej verzii zobrazí lištu s tlačidlom namiesto
// tichého čakania (predtým sa updaty nikdy nedoručili bez vymazania cache)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (document.getElementById('nelka-update-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'nelka-update-bar';
    bar.style.cssText = [
      'position:fixed', 'bottom:18px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:99999', 'background:#0c0c0e', 'color:#fff', 'padding:12px 16px 12px 18px',
      'border-radius:14px', 'display:flex', 'gap:14px', 'align-items:center',
      "font-family:'Inter',system-ui,sans-serif", 'font-size:13px',
      'box-shadow:0 12px 40px rgba(0,0,0,0.4)', 'border:1px solid rgba(255,255,255,0.12)',
      'max-width:calc(100vw - 32px)',
    ].join(';');
    const label = document.createElement('span');
    label.textContent = 'Nová verzia aplikácie je k dispozícii';
    const btn = document.createElement('button');
    btn.textContent = 'Aktualizovať';
    btn.style.cssText = 'background:#f97316;color:#fff;border:none;border-radius:9px;padding:7px 14px;font-weight:600;font-size:12.5px;cursor:pointer;font-family:inherit;flex-shrink:0';
    btn.onclick = () => { void updateSW(true); };
    bar.append(label, btn);
    document.body.appendChild(bar);
  },
});

// Prevent iOS Safari pinch-zoom (user-scalable=no is ignored since iOS 10)
document.addEventListener('touchmove', (e: TouchEvent) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Prevent double-tap zoom on iOS
let lastTap = 0;
document.addEventListener('touchend', (e: TouchEvent) => {
  const now = Date.now();
  if (now - lastTap < 300) e.preventDefault();
  lastTap = now;
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
