import type {Metadata} from 'next';
import './globals.css';
import { Inter, Lora } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const lora = Lora({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'OBOB Scorekeeper',
  description: 'Oregon Battle of the Books Scorekeeper App',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans antialiased", inter.variable, lora.variable)}>
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
