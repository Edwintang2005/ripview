import '../globals.css';
import { ReactNode } from 'react';
import type { Viewport } from 'next';

export const viewport: Viewport = {
    userScalable: true,
    initialScale: 1,
    viewportFit: "contain"
};

export default function TripPlanningLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return children;
}
