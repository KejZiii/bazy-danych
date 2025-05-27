'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import React from 'react'
import AuthGuard from '@/components/AuthGuard'

export default function KitchenPage() {
    return (
        <AuthGuard requiredRole="kucharz">
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Panel Kucharza</h1>
                <p>Witaj w panelu kucharza!</p>
            </div>
        </AuthGuard>
    )
}