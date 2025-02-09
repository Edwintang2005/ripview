import '../globals.css';
import { ReactNode } from 'react';
import type { Viewport } from 'next';

export const viewport: Viewport = {
    width: 'device-width',
    userScalable: true,
    initialScale: 1,
    viewportFit: 'cover'
};

export default function TripPlanningLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return children;
}
