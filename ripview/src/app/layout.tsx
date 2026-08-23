import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
    display: 'swap',
});

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    /*
     * Pinch-zoom is deliberately left enabled. Blocking it (`userScalable:
     * false`, `maximumScale: 1`) removes the browser's own accessibility
     * zoom — for people who need to magnify text, that is the difference
     * between usable and unusable. Inputs use a 16px minimum font size, which
     * is what actually stops iOS Safari zooming on focus.
     */
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0c0e11' },
    ],
};

export const metadata: Metadata = {
    title: {
        default: 'RipView',
        template: '%s · RipView',
    },
    description:
        'Live Sydney public transport times — trip planning, departure boards and real-time delays, from the Transport for NSW Open Data APIs.',
    applicationName: 'RipView',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        title: 'RipView',
        // Lets the page paint behind the iOS status bar, paired with
        // `viewport-fit: cover` and the safe-area padding in AppHeader.
        statusBarStyle: 'black-translucent',
    },
    icons: {
        icon: [
            { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        ],
        apple: '/favicon/apple-touch-icon.png',
    },
    formatDetection: {
        // Station names and times should not become tappable phone numbers.
        telephone: false,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang='en-AU' className={geistSans.variable}>
            <body>{children}</body>
        </html>
    );
}
