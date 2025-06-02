'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import Link from 'next/link'

const COLUMNS_ON_SCREEN = 4

interface OrderByTable {
    numer_stolika: string
    orders: any[]
    bg_color_class: string
}


const ArrowLeftIcon = () => (
    <svg className="w-8 h-8 text-gray-500 hover:text-purple-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
)
const ArrowRightIcon = () => (
    <svg className="w-8 h-8 text-gray-500 hover:text-purple-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
)

const ClockIcon = () => (
    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)
const CheckIcon = () => (
    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
)
const DownArrowIcon = () => (
    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
)

// Dodaj mapowanie kategorii
const CATEGORY_LABELS: { [key: string]: string } = {
    '0': 'Przystawki',
    '1': 'Dania Główne',
    '2': 'Desery',
    '3': 'Napoje',
};

// Funkcja do grupowania dań po kategorii
const groupDishesByCategory = (dishes: any[]) => {
    const grouped: { [key: string]: any[] } = {
        '0': [],
        '1': [],
        '2': [],
        '3': [],
    };
    dishes.forEach(dish => {
        // Wymuś string!
        const cat = String(dish.danie?.kategoria ?? '3');
        if (grouped[cat]) {
            grouped[cat].push(dish);
        } else {
            grouped['3'].push(dish);
        }
    });
    return grouped;
};

export default function OrdersInProgressPage() {
    const supabase = createClient()
    const [ordersByTable, setOrdersByTable] = useState<OrderByTable[]>([])
    const [startIdx, setStartIdx] = useState(0)

    useEffect(() => {
        fetchOrders()
        const channel = supabase
            .channel('custom-all-channel-orders-page')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'zamowienie' },
                () => fetchOrders()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'danie_zamowienie' },
                () => fetchOrders()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stolik' },
                () => fetchOrders()
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line
    }, [])

    const fetchOrders = async () => {
        const { data: ordersData, error } = await supabase
            .from('zamowienie')
            .select(`
                id_zamowienia, 
                id_stolika, 
                status_zamowienia,
                stolik (
                    numer_stolika,
                    status_stolika 
                )
            `)
            .in('status_zamowienia', ['0', '1'])
            .order('id_stolika', { ascending: true })

        if (error || !ordersData || ordersData.length === 0) {
            setOrdersByTable([])
            return
        }

        const zamowienieIds = ordersData.map((z: any) => z.id_zamowienia)
        const { data: daniaZamowienia } = await supabase
            .from('danie_zamowienie')
            .select(`
                id_danie_zamowienie, 
                id_zamowienia, 
                ilosc,
                status_dania_kucharza,
                danie (
                    nazwa,
                    opis,
                    kategoria
                )
            `)
            .in('id_zamowienia', zamowienieIds)

        const ordersWithDishes = ordersData.map((order: any) => ({
            ...order,
            dania: daniaZamowienia
                ? daniaZamowienia.filter((dz: any) => dz.id_zamowienia === order.id_zamowienia)
                : [],
        }))

        const grouped = ordersWithDishes.reduce((acc: any, order: any) => {
            const tableNum = order.stolik?.numer_stolika || 'Brak numeru'
            if (!acc[tableNum]) {
                acc[tableNum] = {
                    numer_stolika: tableNum,
                    orders: [],
                    bg_color_class: 'bg-yellow-50' // pastelowy żółty
                }
            }
            acc[tableNum].orders.push(order)
            return acc
        }, {})

        setOrdersByTable(
            Object.values(grouped)
                .sort((a: any, b: any) => Number(a.numer_stolika) - Number(b.numer_stolika)) as OrderByTable[]
        )
    }

    return (
    <AuthGuard requiredRole="kelner">
        <div className="min-h-screen bg-gray-50 flex flex-col items-start justify-start">
            {/* Górny pasek z powrotem i tytułem */}
            <div className="flex items-center w-full px-8 pt-6 pb-4">
                <Link href="/waiter" className="mr-4 group">
                    <svg className="w-7 h-7 text-black group-hover:text-purple-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-2xl font-bold text-black">Zamówienia w toku</h1>
            </div>

            {/* Kontener na zamówienia lub komunikat o braku zamówień */}
            <div className="flex gap-4 w-full px-8 justify-start items-center">
                {ordersByTable.length === 0 ? (
                    <div className="w-full flex justify-center items-center mt-10">
                        <p className="text-xl text-gray-500">Brak aktualnych zamówień.</p>
                    </div>
                ) : (
                    <>
                        {/* Lewy przycisk przewijania */}
                        {ordersByTable.length > COLUMNS_ON_SCREEN && (
                            <button
                                className="p-2 rounded-full bg-white shadow hover:bg-gray-100 disabled:opacity-30"
                                onClick={() => setStartIdx((prev) => Math.max(0, prev - COLUMNS_ON_SCREEN))}
                                disabled={startIdx === 0}
                                aria-label="Przewiń w lewo"
                            >
                                <ArrowLeftIcon />
                            </button>
                        )}
                        <div className="flex gap-4 flex-1 overflow-x-auto">
                            {ordersByTable
                                .slice(startIdx, startIdx + COLUMNS_ON_SCREEN)
                                .map((table) => (
                                    <div
                                        key={table.numer_stolika}
                                        className={`rounded-lg shadow p-4 flex flex-col bg-yellow-50 ${table.bg_color_class}
                                            min-w-[180px] sm:min-w-[220px] md:min-w-[260px] lg:min-w-[320px] 
                                            max-w-[90vw] sm:max-w-xs md:max-w-sm lg:max-w-md`}
                                        style={{ height: '80vh' }}
                                    >
                                        <div className="mb-2">
                                            <span className="text-xs font-semibold text-black">Stolik {table.numer_stolika}</span>
                                        </div>
                                        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                                            {(() => {
                                                // Zbierz wszystkie dania z zamówień tego stolika
                                                const allDishes = table.orders.flatMap((order: any) => order.dania);
                                                if (allDishes.length === 0) {
                                                    return <span className="text-gray-500 text-sm">Brak pozycji</span>;
                                                }
                                                const grouped = groupDishesByCategory(allDishes);
                                                return Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) =>
                                                    grouped[catKey].length === 0 ? null : (
                                                        <div key={catKey}>
                                                            <div className="font-semibold text-gray-700 mt-2 mb-1">{catLabel}:</div>
                                                            {[
                                                                // Najpierw dania gotowe
                                                                ...grouped[catKey].filter((item: any) => item.status_dania_kucharza),
                                                                // Potem dania w przygotowaniu
                                                                ...grouped[catKey].filter((item: any) => !item.status_dania_kucharza),
                                                            ].map((item: any) => (
                                                                <div key={item.id_danie_zamowienie} className="flex items-start justify-between mb-2">
                                                                    <div>
                                                                        <div className="font-semibold text-black text-sm">{item.danie?.nazwa}</div>
                                                                        
                                                                        <div className="text-xs font-semibold mt-1">
                                                                            {item.status_dania_kucharza
                                                                                ? <span className="text-green-600">Gotowe</span>
                                                                                : <span className="text-orange-500">W przygotowaniu</span>
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-2 mt-1">
                                                                        {item.status_dania_kucharza
                                                                            ? <CheckIcon />
                                                                            : <ClockIcon />}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                );
                                            })()}
                                        </div>
                                        <div className="mt-auto flex justify-center pt-2">
                                            <DownArrowIcon />
                                        </div>
                                    </div>
                                ))}
                        </div>
                        {/* Prawy przycisk przewijania */}
                        {ordersByTable.length > COLUMNS_ON_SCREEN && (
                            <button
                                className="p-2 rounded-full bg-white shadow hover:bg-gray-100 disabled:opacity-30"
                                onClick={() =>
                                    setStartIdx((prev) =>
                                        Math.min(
                                            prev + COLUMNS_ON_SCREEN,
                                            ordersByTable.length - COLUMNS_ON_SCREEN
                                        )
                                    )
                                }
                                disabled={startIdx + COLUMNS_ON_SCREEN >= ordersByTable.length}
                                aria-label="Przewiń w prawo"
                            >
                                <ArrowRightIcon />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    </AuthGuard>
)
}