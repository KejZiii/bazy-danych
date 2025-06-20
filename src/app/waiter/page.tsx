'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { getCookie } from '@/utils/cookies'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'

const roleMapping: { [key: string]: string } = {
    '0': 'Manager',
    '1': 'Kelner',
    '2': 'Kucharz',
    'admin': 'Admin',
};

export default function WaiterPage() {
    const supabase = createClient()
    const [tables, setTables] = useState<any[]>([])
    const [userName, setUserName] = useState<string>('')
    const [userRole, setUserRole] = useState<string>('') // Nowa zmienna stanu dla roli użytkownika
    const router = useRouter()

    useEffect(() => {
        fetchData()
        getUserName()
    })

    const fetchData = async () => {
        // Pobierz wszystkie stoliki
        const { data: tablesData } = await supabase
            .from('stolik')
            .select('*')
            .order('numer_stolika', { ascending: true })
        if (!tablesData) return

        // Pobierz najnowsze zamówienie dla każdego stolika wraz z daniami
        const tablesWithStatus = await Promise.all(
            tablesData.map(async (table: any) => {
                const { data: order } = await supabase
                    .from('zamowienie')
                    .select(`
                        id_zamowienia,
                        status_zamowienia,
                        danie_zamowienie (
                            status_dania_kucharza
                        )
                    `)
                    .eq('id_stolika', table.id_stolika)
                    .order('id_zamowienia', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                return {
                    ...table,
                    status_zamowienia: order?.status_zamowienia ?? null,
                    dania_statusy: order?.danie_zamowienie?.map((dz: any) => dz.status_dania_kucharza) ?? []
                }
            })
        )
        setTables(tablesWithStatus)
    }

    const getUserName = async () => {
        try {
            // Najpierw pobierz zalogowanego użytkownika
            const userData = getCookie('user')
            if (userData) {
                const user = JSON.parse(userData)
                if (user.nazwa_uzytkownika) {
                    setUserName(user.nazwa_uzytkownika)
                }
                // Ustawienie roli użytkownika
                if (user.rola) {
                    setUserRole(user.rola)
                }
            }
        } catch (error) {
            console.error('Wystąpił błąd:', error)
        }
    }

    const getTableColor = (status: number | string | null | undefined, dania_statusy: any[]) => {
        if (dania_statusy && dania_statusy.some(s => Number(s) === 1)) {
            return 'bg-red-400'; // Czerwony, jeśli jest danie gotowe do wydania
        }
        if (
            status === 0 ||
            status === '0' ||
            status === 'przyjęte'
        ) return 'bg-yellow-200'; // Zmieniono na żółty dla statusu "przyjęte"
        if (
            status === 1 ||
            status === '1' ||
            status === 'w przygotowaniu' ||
            status === 'w realizacji'
        ) return 'bg-yellow-200'; // Pozostaje żółty dla statusu "w przygotowaniu"
        // Zmienione: puste stoliki też na zielono
        if (
            status === 2 ||
            status === '2' ||
            status === 'zrealizowane' ||
            status == null ||
            status === undefined
        ) return 'bg-green-200'; // Pozostaje zielony dla wolnych/zrealizowanych
        return 'bg-gray-200'; // Domyślny kolor
    };

    const getTableStatusText = (status: number | string | null | undefined) => {
        if (status === 0 || status === '0') return 'Przyjęte'
        if (status === 1 || status === '1') return 'W przygotowaniu'
        if (status === 2 || status === '2') return 'Zrealizowane'
        return 'Brak zamówienia'
    }

    const handleLogout = () => {
        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push('/login');
    }

    return (
        <AuthGuard requiredRole="kelner">
            <div className="flex h-screen">
                {/* Main content */}
                <div className="flex-1 p-8 bg-gray-100">
                    <h1 className="text-2xl font-bold mb-6 text-black">Stoliki</h1>
                    {/* Stolik 7 wyśrodkowany na górze */}
                    <div className="mb-8 flex justify-center">
                        {tables
                            .filter((table) => table.numer_stolika === 7)
                            .map((table) => (
                                <Link
                                    href={`/waiter/table/${table.numer_stolika}`}
                                    key={table.id_stolika}
                                    className={`${getTableColor(table.status_zamowienia, table.dania_statusy)} p-6 rounded-lg shadow-md flex flex-col items-center justify-center min-w-[260px] hover:shadow-lg transition-shadow duration-200`}
                                >
                                    <div className="flex items-center justify-center">
                                        <span className="text-2xl font-bold text-black">Zamówienia na wynos</span>
                                    </div>
                                    <p className="text-center text-sm text-gray-600 mt-2">
                                        {getTableStatusText(table.status_zamowienia)}
                                    </p>
                                </Link>
                            ))}
                    </div>
                    {/* Pozostałe stoliki */}
                    <div className="grid grid-cols-3 gap-12 px-8">
                        {tables
                            .filter((table) => table.numer_stolika !== 7)
                            .map((table) => (
                                <Link
                                    href={`/waiter/table/${table.numer_stolika}`}
                                    key={table.id_stolika}
                                    className={`${getTableColor(table.status_zamowienia, table.dania_statusy)} p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200`}
                                >
                                    <div className="flex items-center justify-center">
                                        <span className="text-2xl font-bold text-black">Stolik {table.numer_stolika}</span>
                                    </div>
                                    <p className="text-center text-sm text-gray-600 mt-2">
                                        {getTableStatusText(table.status_zamowienia)}
                                    </p>
                                </Link>
                            ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-32 bg-white shadow-lg flex flex-col">
                    <div className="flex justify-center p-4">  {/* zmiana z justify-end na justify-center */}
                        <button
                            aria-label="Zamówienia w przygotowaniu"
                            onClick={() => router.push('/waiter/orders')}
                            className="focus:outline-none"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <rect y="4" width="24" height="4" rx="2" fill="black" />
                                <rect y="10" width="24" height="4" rx="2" fill="black" />
                                <rect y="16" width="24" height="4" rx="2" fill="black" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 p-4">
                    </div>
                    <div className="p-4 border-t">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-2 ring-1 ring-gray-300">
                                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <span className="font-medium text-gray-800">{userName}</span>
                            <span className="text-sm text-gray-500">
                                {roleMapping[userRole] || 'Nieznana rola'}
                            </span>
                            <button onClick={handleLogout} className="mt-2 text-red-500 underline">Wyloguj</button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    )
}