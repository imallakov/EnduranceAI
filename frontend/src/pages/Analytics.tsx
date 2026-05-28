import React from 'react';
import ComingSoon from '../components/ComingSoon';

const Analytics: React.FC = () => (
  <ComingSoon
    title="Analytics"
    tagline="Deep dive into your training trends over weeks, months, and years."
    bullets={[
      'VDOT progression — 26-week rolling history with predicted-vs-actual deltas',
      'HR efficiency — weekly pace per beat, the canonical aerobic-economy metric',
      'Weekly volume + zone distribution (E / M / T / I / R) across any window',
      'Long-run consistency and cutback-week adherence vs your plan',
      'Compare current block to your best historical block',
    ]}
    cta={{ label: "View today's metrics on Dashboard", to: '/' }}
  />
);

export default Analytics;
