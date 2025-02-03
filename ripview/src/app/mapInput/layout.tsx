import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import '../globals.css';
import { ReactNode } from 'react';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
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
