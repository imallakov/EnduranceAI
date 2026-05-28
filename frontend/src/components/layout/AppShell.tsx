import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Footer from './Footer';

const AppShell: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: 'var(--text)',
    }}>
      {/* Backdrop — visible on mobile when drawer open */}
      <div
        className={mobileOpen ? 'sidebar-drawer-backdrop mob-open' : 'sidebar-drawer-backdrop'}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar onBurgerClick={() => setMobileOpen(v => !v)} />
        <div className="nice-scroll" style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default AppShell;
