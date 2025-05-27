'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import React from 'react'
import AuthGuard from '@/components/AuthGuard'

export default function ManagerPage() {
    return (
        <AuthGuard requiredRole='kierownik'>
            <div className="p-4 bg-white">
                <h1 className="text-2xl font-bold mb-4 text-black">Panel Kierownika</h1>
                <p className="text-black">Witaj w panelu kierownika!</p>
            </div>
        </AuthGuard>
    )
}