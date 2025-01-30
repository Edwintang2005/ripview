'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationHandler() {
    const pathname = usePathname();

    useEffect(() => {
        console.log('Navigation to:', pathname);
        sessionStorage.setItem('lastPage', pathname);
    }, [pathname]);

    return null;
}