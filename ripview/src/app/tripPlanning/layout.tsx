import type { Metadata } from 'next';
import { Geist, Geist_Mono as GeistMono } from 'next/font/google';
import '../globals.css';
import { ReactNode } from 'react';

const geistSans = Geist({
    subsets: ['latin'],
    display: 'swap',
    adjustFontFallback: true,
});

const geistMono = GeistMono({
    subsets: ['latin'],
    display: 'swap',
    adjustFontFallback: true,
});

export const metadata: Metadata = {
    title: 'RipView',
    description: 'Transcend the TripView Experience',
};

export default function TripPlanningLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return children;
}