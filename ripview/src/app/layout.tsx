import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ReactNode } from 'react';

import type { Viewport } from 'next';

export const viewport: Viewport = {
    width: 'device-width',
    userScalable: false,
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover'
};

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'RipView',
    description: 'Transcend the TripView Experience',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang='en' className={geistSans.variable}>
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
                    integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                />
                <link rel='manifest' href='/site.webmanifest'/>
                <meta
                    name = 'apple-mobile-web-app-status-bar-style'
                    content = 'black-translucent'
                />
                <link
                    rel='apple-touch-icon'
                    href='/favicon/apple-touch-icon.png'
                />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
