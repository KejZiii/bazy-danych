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
                    opis
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
                <div className="flex gap-4 w-full px-8 justify-start">
                    {ordersByTable.length === 0 ? (
                        <div className="w-full flex justify-center items-center mt-10">
                            <p className="text-xl text-gray-500">Brak aktualnych zamówień.</p>
                        </div>
                    ) : (
                        ordersByTable.slice(startIdx, startIdx + COLUMNS_ON_SCREEN).map((table) => (
                            <div
                                key={table.numer_stolika}
                                className={`rounded-lg shadow p-4 flex flex-col min-w-[220px] max-w-xs ${table.bg_color_class}`}
                                style={{ height: '80vh' }}
                            >
                                <div className="mb-2">
                                    <span className="text-xs font-semibold text-black">Stolik {table.numer_stolika}</span>
                                </div>
                                <div className="flex-1 flex flex-col gap-3 overflow-y-auto"> {/* Dodano overflow-y-auto dla przewijania wewnątrz karty */}
                                    {table.orders.flatMap((order: any) => order.dania).length === 0 && (
                                        <span className="text-gray-500 text-sm">Brak pozycji</span>
                                    )}
                                    {table.orders.flatMap((order: any) => order.dania).map((item: any) => (
                                        <div key={item.id_danie_zamowienie} className="flex items-start justify-between">
                                            <div>
                                                <div className="font-semibold text-black text-sm">{item.danie?.nazwa}</div>
                                                {item.danie?.opis && (
                                                    <div className="text-xs text-gray-700">{item.danie.opis}</div>
                                                )}
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
                                <div className="mt-auto flex justify-center pt-2"> {/* Dodano pt-2 dla odstępu */}
                                    <DownArrowIcon />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AuthGuard>
    )
}