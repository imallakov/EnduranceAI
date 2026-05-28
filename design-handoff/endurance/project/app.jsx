// Wire the three directions into the design canvas.

function App() {
  return (
    <DesignCanvas>
      <DCSection id="primary" title="Primary — Desktop dashboard">
        <DCArtboard id="desktop" label="Dashboard · 1440 × 920" width={1440} height={920}>
          <Dashboard />
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Mobile responsive — Hero + metrics">
        <DCArtboard id="iphone" label="iPhone 14 · 390 × 844" width={390} height={844}>
          <MobileVariant />
        </DCArtboard>
      </DCSection>

      <DCSection id="alt" title="Alternative direction — Mission control layout">
        <DCArtboard id="mission" label="Same data, different priorities · 1440 × 1080" width={1440} height={1080}>
          <AlternativeDashboard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
