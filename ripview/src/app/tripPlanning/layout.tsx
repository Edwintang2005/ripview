import { ReactNode } from 'react';
import '../globals.css';
import type { Viewport } from 'next';

export const viewport: Viewport = {
    width: 'device-width',
    userScalable: false,
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover'
};

export default function TripPlanningLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return children;
}
