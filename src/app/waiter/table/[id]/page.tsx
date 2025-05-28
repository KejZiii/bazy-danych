'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Dish {
    id_dania: number
    nazwa: string
    kategoria: string
    cena: number
    opis: string
    dostepnosc: boolean
}

interface OrderItem {
    id_dania: number
    nazwa: string
    cena: number
    ilosc: number
}

interface Zamowienie {
    id_zamowienia?: number
    id_stolika: number
    typ_zamowienia: boolean
    data_zamowienia: string
    status_zamowienia: string
    numer_odbioru: number | null
    uwagi: string
}

interface DanieZamowienie {
    id_danie_zamowienie: number
    id_zamowienia: number
    id_dania: number
}

export default function TablePage() {
    const supabase = createClient()
    const params = useParams()
    const tableId = params.id
    const [dishes, setDishes] = useState<Dish[]>([])
    const [selectedCategory, setSelectedCategory] = useState('Wszystkie')
    const [orderItems, setOrderItems] = useState<OrderItem[]>([])
    const [totalAmount, setTotalAmount] = useState(0)
    const [showNotification, setShowNotification] = useState(false)
    const router = useRouter()

    useEffect(() => {
        fetchDishes()
    }, [])

    useEffect(() => {
        const loadExistingOrder = async () => {
            const { data: orderData } = await supabase
                .from('zamowienie')
                .select(`
                *,
                danie_zamowienie (
                    id_dania,
                    danie (*)
                )
            `)
                .eq('id_stolika', tableId)
                .in('status_zamowienia', [0, 1]) // pobierz zamówienie przyjęte lub w przygotowaniu
                .order('id_zamowienia', { ascending: false })
                .limit(1)
                .single()

            if (orderData) {
                const items = orderData.danie_zamowienie.map((item: any) => ({
                    id_dania: item.id_dania,
                    nazwa: item.danie.nazwa,
                    cena: item.danie.cena,
                    ilosc: 1
                }))
                setOrderItems(items)
                setTotalAmount(items.reduce((sum: number, item: OrderItem) => sum + item.cena, 0))
            }
            else {
                setOrderItems([])      // <-- dodaj to!
                setTotalAmount(0)
            }
        }

        loadExistingOrder()
    }, [tableId, supabase])

    // useEffect(() => {
    //     const loadExistingOrder = async () => {
    //         try {
    //             // Pobierz id_stolika na podstawie numeru stolika
    //             const { data: stolikData, error: stolikError } = await supabase
    //                 .from('stolik')
    //                 .select('id_stolika, status_stolika')
    //                 .eq('numer_stolika', Number(tableId))
    //                 .single()

    //             if (stolikError || !stolikData) {
    //                 console.error('Błąd pobierania stolika:', stolikError)
    //                 setOrderItems([])
    //                 setTotalAmount(0)
    //                 return
    //             }

    //             // Pobierz najnowsze niezakończone zamówienie dla stolika
    //             const { data: orderData, error: orderError } = await supabase
    //                 .from('zamowienie')
    //                 .select(`
    //                 *,
    //                 danie_zamowienie (
    //                     id_dania,
    //                     danie (
    //                         id_dania,
    //                         nazwa,
    //                         cena
    //                     )
    //                 )
    //             `)
    //                 .eq('id_stolika', stolikData.id_stolika)
    //                 .in('status_zamowienia', ['0', '1']) // statusy: przyjęte lub w przygotowaniu
    //                 .order('id_zamowienia', { ascending: false })
    //                 .limit(1)
    //                 .single()

    //             if (orderError && orderError.code !== 'PGRST116') { // Ignoruj błąd "No rows found"
    //                 console.error('Błąd pobierania zamówienia:', orderError)
    //             }

    //             if (orderData) {
    //                 const items = orderData.danie_zamowienie.map((item: any) => ({
    //                     id_dania: item.danie.id_dania,
    //                     nazwa: item.danie.nazwa,
    //                     cena: item.danie.cena,
    //                     ilosc: 1
    //                 }))
    //                 setOrderItems(items)
    //                 setTotalAmount(items.reduce((sum: number, item: OrderItem) => sum + item.cena, 0))
    //             } else {
    //                 setOrderItems([])
    //                 setTotalAmount(0)
    //             }
    //         } catch (error) {
    //             console.error('Błąd ładowania zamówienia:', error)
    //             setOrderItems([])
    //             setTotalAmount(0)
    //         }
    //     }

    //     loadExistingOrder()
    // }, [tableId, supabase])

    const fetchDishes = async () => {
        const { data } = await supabase
            .from('danie')
            .select('*')
            .eq('dostepnosc', true)
        if (data) setDishes(data)
    }

    const getCategoryName = (kategoria: string) => {
        switch (kategoria) {
            case '0': return 'Przystawki'
            case '1': return 'Dania Główne'
            case '2': return 'Desery'
            case '3': return 'Napoje'
            default: return 'Inne'
        }
    }

    const categories = ['Wszystkie', 'Przystawki', 'Dania Główne', 'Desery', 'Napoje']
    const categoryMapping = {
        'Przystawki': '0',
        'Dania Główne': '1',
        'Desery': '2',
        'Napoje': '3'
    }

    const filteredDishes = selectedCategory === 'Wszystkie'
        ? [...dishes].sort((a, b) => a.nazwa.localeCompare(b.nazwa))
        : [...dishes]
            .filter(dish => dish.kategoria === categoryMapping[selectedCategory as keyof typeof categoryMapping])
            .sort((a, b) => a.nazwa.localeCompare(b.nazwa))

    const addToOrder = (dish: Dish) => {
        setOrderItems(prevItems => {
            const existingItem = prevItems.find(item => item.id_dania === dish.id_dania)
            if (existingItem) {
                return prevItems.map(item =>
                    item.id_dania === dish.id_dania
                        ? { ...item, ilosc: item.ilosc + 1 }
                        : item
                )
            }
            return [...prevItems, { ...dish, ilosc: 1 }]
        })
        setTotalAmount(prev => prev + dish.cena)
    }

    const removeFromOrder = (dishId: number, price: number) => {
        setOrderItems(prevItems => {
            const existingItem = prevItems.find(item => item.id_dania === dishId)
            if (existingItem && existingItem.ilosc > 1) {
                return prevItems.map(item =>
                    item.id_dania === dishId
                        ? { ...item, ilosc: item.ilosc - 1 }
                        : item
                )
            }
            return prevItems.filter(item => item.id_dania !== dishId)
        })
        setTotalAmount(prev => prev - price)
    }

    const handleSaveOrder = async () => {
        try {
            // Zapisz zamówienie
            if (!tableId) {
                throw new Error('Brak numeru stolika w adresie!')
            }
            const now = new Date()
            const timeString = now.toTimeString().split(' ')[0]

            const { data: stolikData, error: stolikError } = await supabase
                .from('stolik')
                .select('id_stolika')
                .eq('numer_stolika', Number(tableId))
                .single()

            if (stolikError || !stolikData) {
                throw new Error('Nie znaleziono stolika')
            }


            const orderPayload: Omit<Zamowienie, 'id_zamowienia'> = {
                id_stolika: stolikData.id_stolika,
                typ_zamowienia: false,
                data_zamowienia: timeString,
                status_zamowienia: '1',
                numer_odbioru: null,
                uwagi: ''
            }

            const { data: orderData, error: orderError } = await supabase
                .from('zamowienie')
                .insert([orderPayload])
                .select()
                .single()

            if (orderError) {
                console.error('Order creation error:', orderError)
                throw orderError
            }

            if (!orderData) {
                throw new Error('No order data returned')
            }

            const { data: maxIdData, error: maxIdError } = await supabase
                .from('danie_zamowienie')
                .select('id_danie_zamowienie')
                .order('id_danie_zamowienie', { ascending: false })
                .limit(1)
                .single()

            const startId = (maxIdData?.id_danie_zamowienie || 0) + 1
            if (maxIdError && maxIdError.code !== 'PGRST116') {
                console.error('Error fetching max ID:', maxIdError)
                throw maxIdError
            }
            // Zapisz pozycje zamówienia
            const orderPositions = orderItems.map((item) => ({
                id_zamowienia: orderData.id_zamowienia,
                id_dania: item.id_dania,
            }))

            const { error: itemsError } = await supabase
                .from('danie_zamowienie')
                .insert(orderPositions)

            const { error: tableError } = await supabase
                .from('stolik')
                .update({ status_stolika: '1' })
                .eq('numer_stolika', tableId)

            if (itemsError) throw itemsError

            router.push('/waiter')
        } catch (error) {
            console.error('Error saving order:', error)
        }
    }

    const handlePayment = async () => {
        try {
            // Pobierz id_stolika na podstawie numeru stolika
            const { data: stolikData, error: stolikError } = await supabase
                .from('stolik')
                .select('id_stolika')
                .eq('numer_stolika', Number(tableId))
                .single()

            if (stolikError || !stolikData) throw new Error('Nie znaleziono stolika')

            if (stolikError) {
                console.error('Błąd pobierania stolika:', stolikError)
                throw new Error('Nie znaleziono stolika')
            }
            if (!stolikData) {
                console.error('Brak danych stolika dla numeru:', tableId)
                throw new Error('Nie znaleziono stolika')
            }
            // Pobierz najnowsze otwarte zamówienie dla stolika
            const { data: orderData, error: orderFetchError } = await supabase
                .from('zamowienie')
                .select('id_zamowienia')
                .eq('id_stolika', stolikData.id_stolika)
                .in('status_zamowienia', [1, '1'])
                .order('id_zamowienia', { ascending: false })
                .limit(1)
                .single()

            if (orderFetchError || !orderData) throw new Error('Nie znaleziono otwartego zamówienia')
            if (orderFetchError) {
                console.error('Błąd pobierania zamówienia:', orderFetchError)
            }
            if (!orderData) {
                console.error('Brak otwartego zamówienia dla id_stolika:', stolikData.id_stolika)
                throw new Error('Nie znaleziono otwartego zamówienia')
            }
            console.log('Znalezione zamówienie:', orderData)
            // Zaktualizuj status zamówienia na zrealizowane
            const { error: updateError } = await supabase
                .from('zamowienie')
                .update({ status_zamowienia: 2 })
                .eq('id_zamowienia', orderData.id_zamowienia)

            if (updateError) {
                console.error('Błąd aktualizacji zamówienia:', updateError)
                throw updateError
            }

            // Zaktualizuj status stolika
            const { error: tableError } = await supabase
                .from('stolik')
                .update({ status_stolika: false })
                .eq('numer_stolika', Number(tableId))

            if (tableError) {
                console.error('Błąd aktualizacji stolika:', tableError)
                throw tableError
            }

            setOrderItems([])
            setTotalAmount(0)

            setShowNotification(true)
            setTimeout(() => {
                setShowNotification(false)
                router.push('/waiter')
            }, 2000)

        } catch (error) {
            console.error('Error processing payment:', error)
        }
    }

    return (
        <AuthGuard requiredRole="kelner">
            <div className="flex h-screen">
                {/* Order sidebar */}
                <div className="w-1/5 bg-white shadow-lg flex flex-col">
                    <div className="p-4 flex-1 overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-black">Zamówienie</h2>
                        <div className="space-y-4">
                            {orderItems.map((item) => (
                                <div key={item.id_dania} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <div>
                                        <p className="font-medium text-black">{item.nazwa}</p>
                                        <p className="text-sm text-black">{item.ilosc} x {item.cena} zł</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromOrder(item.id_dania, item.cena)}
                                        className="text-red-500 hover:text-red-700 px-3 py-1"
                                    >
                                        -
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 border-t bg-white">
                        <div className="text-xl font-bold text-black mb-4">
                            Suma: {totalAmount.toFixed(2)} zł
                        </div>
                        <button
                            onClick={handleSaveOrder}
                            className="w-full bg-green-600 text-white py-2 rounded mb-2 hover:bg-green-700"
                            disabled={orderItems.length === 0}
                        >
                            Zapisz zamówienie
                        </button>
                        <button
                            onClick={handlePayment}
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            disabled={orderItems.length === 0}
                        >
                            Zapłać
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <Link href="/waiter" className="mr-4 flex items-center text-purple-600 hover:text-purple-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Powrót do stolików
                        </Link>
                        <h1 className="text-2xl font-bold text-black">Stolik {tableId}</h1>
                    </div>

                    <div className="flex space-x-4 mb-6">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-lg ${selectedCategory === category
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white text-black'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {filteredDishes.map((dish) => (
                            <div
                                key={dish.id_dania}
                                className="bg-white p-4 rounded-lg shadow"
                            >
                                <h3 className="font-semibold text-lg mb-2 text-black">{dish.nazwa}</h3>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg text-black">{dish.cena} zł</span>
                                    <button
                                        onClick={() => addToOrder(dish)}
                                        className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                                    >
                                        Dodaj
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {showNotification && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl">
                            <p className="text-xl text-black font-semibold">
                                Paragon został wygenerowany pomyślnie!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    )
}