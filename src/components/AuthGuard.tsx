'use client'
import React from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCookie } from '@/utils/cookies'

export default function AuthGuard({
    children,
    requiredRole
}: {
    children: React.ReactNode
    requiredRole?: 'kierownik' | 'kelner' | 'kucharz'
}) {
    const router = useRouter()

    useEffect(() => {
        const userData = getCookie('user')

        if (!userData) {
            router.push('/login')
            return
        }

        const user = JSON.parse(userData)

        if (requiredRole) {
            const roleMapping = {
                'kierownik': '0',
                'kelner': '1',
                'kucharz': '2'
            }

            if (user.rola !== roleMapping[requiredRole]) {
                router.push('/unauthorized')
            }
        }
    }, [router, requiredRole])

    return <>{children}</>
}