import { SpeedInsights } from '@vercel/speed-insights/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SpeedInsights />
    </>
  );
}
