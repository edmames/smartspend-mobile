/**
 * How much of the viewport the software keyboard covers, observed from the
 * *visual* viewport (iOS Safari / PWA) instead of assuming a fixed 100vh.
 *
 * Web-only: returns 0 on native (KeyboardAvoidingView handles it there) and
 * while the keyboard is closed. A 48px threshold filters out the jitter caused
 * by Safari collapsing/expanding its browser chrome.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useKeyboardViewportInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(overlap > 48 ? overlap : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}

export default useKeyboardViewportInset;
