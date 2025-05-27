'use client'
import React from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthGuard({
    children,
    requiredRole
}: {
    children: React.ReactNode
    requiredRole?: 'kierownik' | 'kucharz' | 'kelner'
}) {
    const router = useRouter()

    useEffect(() => {
        const userData = localStorage.getItem('user')

        if (!userData) {
            router.push('/login')
            return
        }

        const user = JSON.parse(userData)

        if (requiredRole) {
            const roleMapping = {
                'kierownik': '0',
                'kucharz': '1',
                'kelner': '2'
            }

            if (user.rola !== roleMapping[requiredRole]) {
                router.push('/unauthorized')
            }
        }
    }, [router, requiredRole])

    return <>{children}</>
}