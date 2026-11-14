import { createRoot } from 'react-dom/client';
import { DesktopToolbarApp } from './DesktopToolbarApp';
import '../index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<DesktopToolbarApp />);
}
