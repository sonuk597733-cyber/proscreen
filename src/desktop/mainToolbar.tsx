import { createRoot } from 'react-dom/client';
import { DesktopToolbarApp } from './DesktopToolbarApp';
import { DesktopDropdownApp } from './DesktopDropdownApp';
import { DesktopRecordingBarApp } from './DesktopRecordingBarApp';
import '../index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const isDropdown = typeof window !== 'undefined' && window.location.search.includes('mode=dropdown');
  const isRecordingBar = typeof window !== 'undefined' && window.location.search.includes('mode=recording-bar');

  if (isDropdown) {
    createRoot(rootEl).render(<DesktopDropdownApp />);
  } else if (isRecordingBar) {
    createRoot(rootEl).render(<DesktopRecordingBarApp />);
  } else {
    createRoot(rootEl).render(<DesktopToolbarApp />);
  }
}
