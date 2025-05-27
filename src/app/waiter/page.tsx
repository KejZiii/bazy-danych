'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import React from 'react'
import AuthGuard from '@/components/AuthGuard'

export default function WaiterPage() {
    const supabase = createClient()
    const [tables, setTables] = useState<any[]>([])
    const [orders, setOrders] = useState<any[]>([])
    const [dishes, setDishes] = useState<any[]>([])
    const [newOrder, setNewOrder] = useState({
        tableId: '',
        dishIds: [] as string[],
        notes: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: tablesData } = await supabase.from('stolik').select('*')
        const { data: ordersData } = await supabase.from('zamowienie').select('*')
        const { data: dishesData } = await supabase.from('danie').select('*').eq('dostepnosc', true)

        if (tablesData) setTables(tablesData)
        if (ordersData) setOrders(ordersData)
        if (dishesData) setDishes(dishesData)
    }

    const handleCreateOrder = async () => {
        const { data, error } = await supabase
            .from('zamowienie')
            .insert([{
                typ_zamowienia: newOrder.tableId ? 'na miejscu' : 'na wynos',
                id_stolika: newOrder.tableId || null,
                uwagi: newOrder.notes,
                status_zamowienia: 'nowe'
            }])
            .select()

        if (data && data[0]) {
            const orderId = data[0].id_zamowienia
            const dishOrders = newOrder.dishIds.map(dishId => ({
                id_zamowienia: orderId,
                id_dania: dishId
            }))

            await supabase.from('danie_zamowienie').insert(dishOrders)
            fetchData()
            setNewOrder({ tableId: '', dishIds: [], notes: '' })
        }
    }

    const handleServeOrder = async (orderId: string) => {
        await supabase
            .from('zamowienie')
            .update({ status_zamowienia: 'wydane' })
            .eq('id_zamowienia', orderId)
        fetchData()
    }

    return (
        <AuthGuard requiredRole="kelner">
            <div className="p-4 bg-white">
                <h1 className="text-2xl font-bold mb-6 text-black">Panel Kelnera</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sekcja nowego zamówienia */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-black">Nowe zamówienie</h2>

                        <div className="mb-4">
                            <label className="block mb-2 text-black">Stolik</label>
                            <select
                                className="w-full p-2 border rounded text-black bg-white"
                                value={newOrder.tableId}
                                onChange={(e) => setNewOrder({ ...newOrder, tableId: e.target.value })}
                            >
                                <option value="" className="text-black">Na wynos</option>
                                {tables.filter(t => t.status_stolika === 'wolny').map(table => (
                                    <option key={table.id_stolika} value={table.id_stolika} className="text-black">
                                        Stolik {table.numer_stolika}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-black">Dania</label>
                            <div className="grid grid-cols-2 gap-2">
                                {dishes.map(dish => (
                                    <div key={dish.id_dania} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`dish-${dish.id_dania}`}
                                            checked={newOrder.dishIds.includes(dish.id_dania)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setNewOrder({ ...newOrder, dishIds: [...newOrder.dishIds, dish.id_dania] })
                                                } else {
                                                    setNewOrder({ ...newOrder, dishIds: newOrder.dishIds.filter(id => id !== dish.id_dania) })
                                                }
                                            }}
                                        />
                                        <label htmlFor={`dish-${dish.id_dania}`} className="ml-2 text-black">
                                            {dish.nazwa} - {dish.cena} zł
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-black">Uwagi</label>
                            <textarea
                                className="w-full p-2 border rounded text-black bg-white"
                                value={newOrder.notes}
                                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={handleCreateOrder}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Złóż zamówienie
                        </button>
                    </div>

                    {/* Lista zamówień */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-black">Aktualne zamówienia</h2>

                        <div className="space-y-4">
                            {orders.filter(o => o.status_zamowienia !== 'wydane').map(order => (
                                <div key={order.id_zamowienia} className="border p-3 rounded">
                                    <div className="flex justify-between">
                                        <h3 className="font-medium text-black">
                                            {order.id_stolika ? `Stolik ${tables.find(t => t.id_stolika === order.id_stolika)?.numer_stolika}` : 'Na wynos'}
                                        </h3>
                                        <span className={`px-2 py-1 text-xs rounded ${order.status_zamowienia === 'gotowe' ? 'bg-green-100 text-green-800' :
                                            order.status_zamowienia === 'w przygotowaniu' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                            {order.status_zamowienia}
                                        </span>
                                    </div>

                                    <div className="mt-2">
                                        {order.uwagi && <p className="text-sm text-black">Uwagi: {order.uwagi}</p>}
                                    </div>

                                    {order.status_zamowienia === 'gotowe' && (
                                        <button
                                            onClick={() => handleServeOrder(order.id_zamowienia)}
                                            className="mt-2 bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                                        >
                                            Wydaj zamówienie
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    )
}