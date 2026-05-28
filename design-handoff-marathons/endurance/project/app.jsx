// Wire all directions into the design canvas.

function App() {
  return (
    <DesignCanvas>
      <DCSection id="marathons" title="Marathons — the catalog of possibility">
        <DCArtboard id="marathons-full" label="Full page · 1440 × 1820" width={1440} height={1820}>
          <MarathonsPage />
        </DCArtboard>
        <DCArtboard id="marathons-mag" label="Magazine direction · 1440 × 1700" width={1440} height={1700}>
          <MarathonsPageMagazine />
        </DCArtboard>
        <DCArtboard id="marathons-empty" label="No results · 1440 × 900" width={1440} height={900}>
          <MarathonsEmptyPage />
        </DCArtboard>
        <DCArtboard id="gpx-step1" label="GPX upload · drop zone · 1440 × 800" width={1440} height={800}>
          <MarathonsModalView step={1} />
        </DCArtboard>
        <DCArtboard id="gpx-step2" label="GPX upload · preview filled · 1440 × 920" width={1440} height={920}>
          <MarathonsModalView step={2} />
        </DCArtboard>
      </DCSection>

      <DCSection id="activity" title="Activity Detail — photograph then dissect">
        <DCArtboard id="activity-full" label="Full page · 1440 × ~1730" width={1440} height={1730}>
          <ActivityDetail />
        </DCArtboard>
        <DCArtboard id="activity-share" label="Share modal open · 1440 × 1000" width={1440} height={1000}>
          <ActivityDetailModalView />
        </DCArtboard>
        <DCArtboard id="activity-manual" label="Manual entry (no GPS) · 1440 × ~1100" width={1440} height={1100}>
          <ActivityDetail noGps={true} />
        </DCArtboard>
      </DCSection>

      <DCSection id="stories" title="Share-to-story templates · 9:16">
        <DCArtboard id="story-a" label="A · Minimalist · 375 × 667" width={375} height={667}>
          <TemplateA />
        </DCArtboard>
        <DCArtboard id="story-b" label="B · Cinematic · 375 × 667" width={375} height={667}>
          <TemplateB />
        </DCArtboard>
        <DCArtboard id="story-c" label="C · Splits · 375 × 667" width={375} height={667}>
          <TemplateC />
        </DCArtboard>
      </DCSection>

      <DCSection id="primary" title="Dashboard reference (previous direction)">
        <DCArtboard id="desktop" label="Dashboard · 1440 × 920" width={1440} height={920}>
          <Dashboard />
        </DCArtboard>
        <DCArtboard id="iphone" label="iPhone 14 · 390 × 844" width={390} height={844}>
          <MobileVariant />
        </DCArtboard>
        <DCArtboard id="mission" label="Alt direction · 1440 × 1080" width={1440} height={1080}>
          <AlternativeDashboard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// Crop view: show top of the page with the modal centered in the visible 1000h area
function ActivityDetailModalView() {
  return (
    <div style={{
      position: 'relative', width: 1440, height: 1000, overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)',
      background: 'var(--bg)', display: 'flex',
    }}>
      {/* Visible page top */}
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <Sidebar defaultActive="Activities" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ActivityTopBar />
          <div style={{ padding: '24px 32px 0' }}>
            <ActivityPageHeader />
            <CinematicHero noGps={false} />
          </div>
        </div>
      </div>
      {/* Modal centered to the visible artboard */}
      <ShareModal onClose={() => {}} />
    </div>
  );
}

// Crop view for the GPX upload modal — shows top of Marathons page with modal centered
function MarathonsModalView({ step = 1 }) {
  const height = step === 1 ? 800 : 920;
  return (
    <div style={{
      position: 'relative', width: 1440, height, overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)', background: 'var(--bg)', display: 'flex',
    }}>
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <Sidebar defaultActive="Marathons" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <MarathonsTopBar />
          <div style={{ padding: '24px 32px 0' }}>
            <MarathonsPageHeader />
            <FeaturedHero race={RACES[0]} />
          </div>
        </div>
      </div>
      <GpxModalShade>
        {step === 1 ? <GpxModalStep1 /> : <GpxModalStep2 />}
      </GpxModalShade>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
