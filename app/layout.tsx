import "./globals.css";

export const metadata = { title: "GBP", description: "Personal cloud client" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
