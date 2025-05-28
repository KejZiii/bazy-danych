'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/navigation'

const COLUMNS_ON_SCREEN = 4

export default function OrdersInProgressPage() {
    const supabase = createClient()
    const [ordersByTable, setOrdersByTable] = useState<any[]>([])
    const [startIdx, setStartIdx] = useState(0)
    const [userName, setUserName] = useState<string>('')
    const router = useRouter()

    useEffect(() => {
        fetchOrders()
        getUserName()
    }, [])

    const fetchOrders = async () => {
        // 1. Pobierz zamówienia w przygotowaniu
        const { data: orders, error } = await supabase
            .from('zamowienie')
            .select('id_zamowienia, id_stolika, status_zamowienia, stolik(numer_stolika)')
            .eq('status_zamowienia', 1)
            .order('id_stolika', { ascending: true })

        if (error) {
            console.error('Supabase error:', error)
            return
        }
        if (!orders || orders.length === 0) {
            setOrdersByTable([])
            return
        }

        // 2. Pobierz wszystkie danie_zamowienie dla tych zamówień
        const zamowienieIds = orders.map((z: any) => z.id_zamowienia)
        const { data: daniaZamowienia, error: errorDania } = await supabase
            .from('danie_zamowienie')
            .select(`
            id_danie_zamowienie, 
            id_zamowienia, 
            id_dania, 
            danie(
            id_dania, 
            nazwa,
            kategoria
            )
            `)
            .in('id_zamowienia', zamowienieIds)

        if (errorDania) {
            console.error('Supabase error:', errorDania)
            return
        }

        // 3. Połącz dania z zamówieniami
        const ordersWithDishes = orders.map((order: any) => ({
            ...order,
            dania: daniaZamowienia
                ? daniaZamowienia.filter((dz: any) => dz.id_zamowienia === order.id_zamowienia)
                : []
        }))

        // 4. Grupuj po numerze stolika
        const grouped = ordersWithDishes.reduce((acc: any, order: any) => {
            const tableNum = order.stolik?.numer_stolika || 'Brak'
            if (!acc[tableNum]) acc[tableNum] = []
            acc[tableNum].push(order)
            return acc
        }, {})

        const groupedArr = Object.entries(grouped).map(([numer_stolika, orders]) => ({
            numer_stolika,
            orders
        }))

        setOrdersByTable(groupedArr)
    }

    const getUserName = async () => {
        try {
            const userData = document.cookie
                .split('; ')
                .find(row => row.startsWith('user='))
            if (userData) {
                const user = JSON.parse(decodeURIComponent(userData.split('=')[1]))
                if (user.nazwa_uzytkownika) {
                    setUserName(user.nazwa_uzytkownika)
                }
            }
        } catch (error) {
            setUserName('')
        }
    }

    const handlePrev = () => {
        setStartIdx((prev) => Math.max(prev - 1, 0))
    }

    const handleNext = () => {
        setStartIdx((prev) => Math.min(prev + 1, Math.max(ordersByTable.length - COLUMNS_ON_SCREEN, 0)))
    }

    return (
        <AuthGuard requiredRole="kelner">
            <div className="flex h-screen text-black">
                {/* Main content */}
                <div className="flex-1 bg-pink-50 flex flex-col relative">
                    {/* Przycisk cofania */}
                    <div className="absolute top-4 left-4 z-20">
                        <button
                            aria-label="Cofnij"
                            onClick={() => router.back()}
                            className="bg-white rounded-full shadow p-2 hover:bg-gray-100"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M15 19l-7-7 7-7" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                    {/* Strzałki przewijania */}
                    {ordersByTable.length > COLUMNS_ON_SCREEN && (
                        <>
                            <button
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 hover:bg-gray-100 z-10"
                                onClick={handlePrev}
                                disabled={startIdx === 0}
                                aria-label="Poprzednie stoliki"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M15 19l-7-7 7-7" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 hover:bg-gray-100 z-10"
                                onClick={handleNext}
                                disabled={startIdx >= ordersByTable.length - COLUMNS_ON_SCREEN}
                                aria-label="Następne stoliki"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 5l7 7-7 7" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </>
                    )}
                    {/* Lista zamówień */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 px-8 mt-16 ml-8">
                        {ordersByTable.map((table, idx) => (
                            <div
                                key={table.numer_stolika}
                                className={`w-full rounded-lg shadow-md px-4 py-3 ${table.orders.some((order: any) => order.status_zamowienia === 0)
                                    ? 'bg-red-200'
                                    : 'bg-yellow-100'
                                    }`}
                            >
                                <div className="font-bold mb-2">Stolik {table.numer_stolika}</div>
                                {table.orders.map((order: any) => (
                                    <div key={order.id_zamowienia} className="mb-2">
                                        {order.dania?.map((item: any, i: number) => (
                                            <div key={`${item.id_danie_zamowienie}_${i}`} className="mb-1">
                                                <span className="font-semibold">{item.danie?.nazwa}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                <div className="flex justify-center mt-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M7 10l5 5 5-5"
                                            stroke="#333"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                            </div>
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
                    <div className="flex-1 p-4"></div>
                    <div className="p-4 border-t">
                        <div className="flex flex-col items-center">
                            <span className="text-sm text-gray-700 mb-2">{userName}</span>
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    )
}