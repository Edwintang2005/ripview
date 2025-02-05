import type { Metadata } from 'next';
import '../globals.css';
import { ReactNode } from 'react';
import type { Viewport } from 'next';

export const viewport: Viewport = {
    width: 'device-width',
    userScalable: true,
    initialScale: 1,
    viewportFit: "contain"
};

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
