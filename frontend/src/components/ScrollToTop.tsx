import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Restore scroll to top on every route change.
 *
 * React Router does NOT do this by default — it preserves the previous
 * scroll position, which is fine when staying on the same page but feels
 * broken on navigation (e.g. clicking a Privacy Policy link from deep in
 * Settings would open the policy scrolled to wherever Settings was).
 *
 * Mount once at the top of <App /> so it covers every <Route>. Skips the
 * effect when only the hash changed (anchor links should keep working).
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
};

export default ScrollToTop;
