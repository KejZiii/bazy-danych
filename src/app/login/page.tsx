'use client'
import { useState } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { setCookie } from '@/utils/cookies'

export default function LoginPage() {
    const supabase = createClient()
    const [username, setUsername] = useState('')
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data, error: supabaseError } = await supabase
                .from('pracownik')
                .select('*')
                .eq('nazwa_uzytkownika', username)
                .eq('pin', parseInt(pin))
                .eq('status_konta', true)
                .single();

            if (supabaseError) {
                throw new Error('Nieprawidłowa nazwa użytkownika lub PIN')
            }

            if (data) {
                // Store user data in cookie instead of localStorage
                setCookie('user', JSON.stringify(data))

                switch (data.rola) {
                    case '0':
                        router.push('/manager')
                        break
                    case '1':
                        router.push('/waiter')
                        break
                    case '2':
                        router.push('/kitchen')
                        break
                    default:
                        router.push('/dashboard')
                }
            } else {
                throw new Error('Nie znaleziono użytkownika')
            }
        } catch (err: any) {
            console.error('Login error:', err)
            setError(err.message || 'Wystąpił błąd podczas logowania')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6 text-black">Logowanie</h1>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                            Nazwa użytkownika
                        </label>
                        <input
                            id="username"
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
                            PIN (4 cyfry)
                        </label>
                        <input
                            id="pin"
                            type="password"
                            pattern="\d{4}"
                            maxLength={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            value={pin}
                            onChange={(e) => {
                                if (/^\d*$/.test(e.target.value)) {
                                    setPin(e.target.value)
                                }
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 px-4 rounded-md text-white font-medium ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>
                </form>
            </div>
        </div>
    )
}