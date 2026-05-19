export const metadata = {
  title: '@webteamuxco/glitchtip-sdk — Next.js demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 720 }}>
        {children}
      </body>
    </html>
  );
}
