'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Dish {
    id_dania: number
    nazwa: string
    kategoria: string // '0'-przystawka, '1'-danie glowne, '2'-deser, '3'-napoj
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
    data_zamowienia: string // Format HH:MM:SS
    status_zamowienia: string // '0'-przyjete, '1'-w przygotowaniu, '2'-wydane
    numer_odbioru: number | null
    uwagi: string
    suma_zamowienia?: number | null
    danie_zamowienie?: DanieZamowienie[] // For data fetched from Supabase
}

interface DanieZamowienie {
    id_danie_zamowienie?: number // PK, auto-generated
    id_zamowienia: number
    id_dania: number
    ilosc: number
    status_dania_kucharza?: boolean | string // Added property, type depends on your DB (adjust if needed)
    danie?: Dish // Nested data from Supabase
}

export default function TablePage() {
    const supabase = createClient()
    const params = useParams()
    const tableId = params.id as string // numer_stolika
    const [dishes, setDishes] = useState<Dish[]>([])
    const [selectedCategory, setSelectedCategory] = useState('Wszystkie')
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]) // To jest stan UI dla tworzenia/edycji zamówienia
    const [totalAmount, setTotalAmount] = useState(0)
    const [showNotification, setShowNotification] = useState(false)
    const [notificationMessage, setNotificationMessage] = useState('')
    const router = useRouter()
    const [currentOrder, setCurrentOrder] = useState<Zamowienie | null>(null) // Przechowuje pełne dane załadowanego zamówienia, w tym statusy dań
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchDishes()

        const loadOrderData = async () => {
            if (!tableId) return
            setIsLoading(true)
            try {
                const { data: stolikData, error: stolikError } = await supabase
                    .from('stolik')
                    .select('id_stolika')
                    .eq('numer_stolika', Number(tableId))
                    .single()

                if (stolikError || !stolikData) {
                    console.error('Błąd pobierania stolika lub stolik nie istnieje:', stolikError)
                    setCurrentOrder(null)
                    setOrderItems([])
                    setTotalAmount(0)
                    setIsLoading(false)
                    return
                }
                const actualStolikId = stolikData.id_stolika

                const { data: existingOrderData, error: orderError } = await supabase
                    .from('zamowienie')
                    .select(`
                        id_zamowienia,
                        id_stolika,
                        typ_zamowienia,
                        data_zamowienia,
                        status_zamowienia,
                        numer_odbioru,
                        uwagi,
                        suma_zamowienia,
                        danie_zamowienie (
                            id_danie_zamowienie,
                            id_dania,
                            ilosc,
                            status_dania_kucharza,
                            danie (
                                id_dania,
                                nazwa,
                                cena
                            )
                        )
                    `)
                    .eq('id_stolika', actualStolikId)
                    .in('status_zamowienia', ['0', '1']) // Aktywne zamówienia
                    .order('id_zamowienia', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (orderError) {
                    console.error('Błąd pobierania istniejącego zamówienia:', orderError)
                }

                if (existingOrderData) {
                    const fixedDanieZamowienie = (existingOrderData.danie_zamowienie || []).map((dz: any) => ({
                        id_danie_zamowienie: dz.id_danie_zamowienie,
                        id_zamowienia: existingOrderData.id_zamowienia, // Dodaj id_zamowienia do każdego dania
                        id_dania: dz.id_dania,
                        ilosc: dz.ilosc,
                        status_dania_kucharza: dz.status_dania_kucharza, // Zachowaj status
                        danie: Array.isArray(dz.danie) ? dz.danie[0] : dz.danie,
                    }))
                    setCurrentOrder({
                        ...existingOrderData,
                        danie_zamowienie: fixedDanieZamowienie,
                    } as Zamowienie)

                    // orderItems dla UI są budowane na podstawie załadowanego zamówienia
                    const items: OrderItem[] = fixedDanieZamowienie.map((dz: any) => ({
                        id_dania: dz.danie.id_dania,
                        nazwa: dz.danie.nazwa,
                        cena: dz.danie.cena,
                        ilosc: dz.ilosc,
                        // Możesz dodać status_dania_kucharza do OrderItem, jeśli chcesz go wyświetlać w UI zamówienia
                    }))
                    setOrderItems(items)
                    setTotalAmount(items.reduce((sum, item) => sum + item.cena * item.ilosc, 0))
                } else {
                    setCurrentOrder(null)
                    setOrderItems([])
                    setTotalAmount(0)
                }
            } catch (error) {
                console.error('Błąd ładowania danych zamówienia:', error)
                setCurrentOrder(null)
                setOrderItems([])
                setTotalAmount(0)
            } finally {
                setIsLoading(false)
            }
        }

        loadOrderData()

        // Subskrypcja Realtime do odświeżania danych zamówienia, jeśli kucharz zmieni status
        const channel = supabase
            .channel(`table-${tableId}-order-updates`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'danie_zamowienie',
                    // Możesz dodać filtr, jeśli chcesz nasłuchiwać tylko na zmiany dla konkretnego zamówienia
                    // filter: `id_zamowienia=eq.${currentOrder?.id_zamowienia}` (ale currentOrder może być null na początku)
                },
                (payload) => {
                    console.log('Zmiana w danie_zamowienie (status od kucharza):', payload);
                    // Jeśli zmiana dotyczy aktualnie otwartego zamówienia, załaduj dane ponownie
                    // Sprawdź, czy payload.new.id_zamowienia pasuje do currentOrder.id_zamowienia
                    if (currentOrder && payload.new && (payload.new as any).id_zamowienia === currentOrder.id_zamowienia) {
                        loadOrderData(); // Odśwież dane, aby pobrać nowy status dań
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [tableId, supabase, currentOrder?.id_zamowienia]); // Dodaj currentOrder.id_zamowienia do zależności, aby kanał mógł się zaktualizować

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
    const categoryMapping: { [key: string]: string } = {
        'Przystawki': '0',
        'Dania Główne': '1',
        'Desery': '2',
        'Napoje': '3'
    }

    const filteredDishes = selectedCategory === 'Wszystkie'
        ? [...dishes].sort((a, b) => a.nazwa.localeCompare(b.nazwa))
        : [...dishes]
            .filter(dish => dish.kategoria === categoryMapping[selectedCategory])
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
        let itemRemovedOrDecremented = false;
        setOrderItems(prevItems => {
            const existingItem = prevItems.find(item => item.id_dania === dishId);
            if (existingItem) {
                itemRemovedOrDecremented = true;
                if (existingItem.ilosc > 1) {
                    return prevItems.map(item =>
                        item.id_dania === dishId
                            ? { ...item, ilosc: item.ilosc - 1 }
                            : item
                    );
                }
                return prevItems.filter(item => item.id_dania !== dishId);
            }
            return prevItems; // Should not happen if button is only on existing items
        });

        if (itemRemovedOrDecremented) {
            setTotalAmount(prev => Math.max(0, prev - price));
        }
    }

    const handleSaveOrder = async () => {
        if (!tableId) {
            alert('Brak numeru stolika.')
            return
        }
        if (orderItems.length === 0 && !currentOrder) {
            alert("Nie można zapisać pustego nowego zamówienia.")
            return
        }

        setIsLoading(true)
        try {
            const { data: stolikData, error: stolikError } = await supabase
                .from('stolik')
                .select('id_stolika')
                .eq('numer_stolika', Number(tableId))
                .single()

            if (stolikError || !stolikData) {
                throw new Error('Nie znaleziono stolika o podanym numerze.')
            }
            const actualStolikId = stolikData.id_stolika
            const now = new Date()
const timestampString = now.toISOString() // <-- pełny timestamp

            const calculatedTotalAmount = orderItems.reduce((sum, item) => sum + item.cena * item.ilosc, 0)

            let orderIdToUse: number

            if (currentOrder && currentOrder.id_zamowienia) {
    orderIdToUse = currentOrder.id_zamowienia
    const { error: updateOrderError } = await supabase
        .from('zamowienie')
        .update({
            suma_zamowienia: calculatedTotalAmount,
            data_zamowienia: timestampString, // <-- aktualizuj timestamp
            // uwagi: currentOrder.uwagi
        })
        .eq('id_zamowienia', orderIdToUse)

    if (updateOrderError) throw updateOrderError

    const { error: deleteItemsError } = await supabase
        .from('danie_zamowienie')
        .delete()
        .eq('id_zamowienia', orderIdToUse)
    if (deleteItemsError) throw deleteItemsError
} else {
    const newOrderPayload = {
        id_stolika: actualStolikId,
        typ_zamowienia: false,
        data_zamowienia: timestampString, // <-- pełny timestamp
        status_zamowienia: '0', // Przyjęte
        numer_odbioru: null,
        uwagi: '', // Można dodać pole w UI
        suma_zamowienia: calculatedTotalAmount,
    }
    const { data: newOrderData, error: newOrderError } = await supabase
        .from('zamowienie')
        .insert([newOrderPayload])
        .select('id_zamowienia')
        .single()

    if (newOrderError || !newOrderData) throw newOrderError || new Error("Nie udało się utworzyć zamówienia")
    orderIdToUse = newOrderData.id_zamowienia
    setCurrentOrder({ ...newOrderPayload, id_zamowienia: orderIdToUse })
}

            if (orderItems.length > 0) {
                const orderPositionsToInsert = orderItems.map(item => ({
                    id_zamowienia: orderIdToUse,
                    id_dania: item.id_dania,
                    ilosc: item.ilosc,
                    status_dania_kucharza: '0',
                }))
                const { error: insertItemsError } = await supabase
                    .from('danie_zamowienie')
                    .insert(orderPositionsToInsert)
                if (insertItemsError) throw insertItemsError
            }

            const newTableStatus = orderItems.length > 0
            await supabase
                .from('stolik')
                .update({ status_stolika: newTableStatus }) // true = zajęty, false = wolny
                .eq('id_stolika', actualStolikId)

            setNotificationMessage(currentOrder && currentOrder.id_zamowienia ? 'Zamówienie zaktualizowane!' : 'Zamówienie zapisane!')
            setShowNotification(true)
            setTimeout(() => {
                setShowNotification(false)
                router.push('/waiter')
            }, 1500)

        } catch (error) {
            console.error('Error saving order:', error)
            alert(`Wystąpił błąd podczas zapisywania zamówienia: ${(error as Error).message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePayment = async () => {
        if (!currentOrder || !currentOrder.id_zamowienia) {
            alert("Brak aktywnego zamówienia do opłacenia.");
            return;
        }

        // Sprawdź, czy wszystkie dania w zamówieniu są gotowe
        if (currentOrder.danie_zamowienie && currentOrder.danie_zamowienie.length > 0) {
            const allDishesReady = currentOrder.danie_zamowienie.every(
                (dish) => dish.status_dania_kucharza === true
            );

            if (!allDishesReady) {
                alert("Nie wszystkie dania zostały oznaczone jako gotowe przez kucharza. Nie można zamknąć rachunku.");
                return;
            }
        } else if (orderItems.length > 0 && (!currentOrder.danie_zamowienie || currentOrder.danie_zamowienie.length === 0)) {
            // Ten przypadek może wystąpić, jeśli zamówienie jest tworzone i od razu opłacane,
            // a dania nie zostały jeszcze zapisane w bazie z ich statusami.
            // W typowym przepływie, najpierw zapisujesz zamówienie (handleSaveOrder),
            // a potem dopiero je opłacasz. Jeśli chcesz pozwolić na opłacenie nowo tworzonego zamówienia
            // bez jawnego zapisu, musisz zdecydować, jak traktować statusy dań.
            // Dla bezpieczeństwa, można założyć, że nowo dodane dania nie są jeszcze gotowe.
            // LUB, jeśli przepływ zawsze wymaga zapisu przed płatnością, ten warunek może nie być potrzebny.
            alert("Zamówienie nie zostało jeszcze przetworzone przez kuchnię. Zapisz zamówienie, aby kuchnia mogła przygotować dania.");
            return;
        }


        setIsLoading(true);
        try {
            const finalTotalAmount = orderItems.reduce((sum, item) => sum + item.cena * item.ilosc, 0);

            const { error: updateOrderError } = await supabase
                .from('zamowienie')
                .update({ status_zamowienia: '2', suma_zamowienia: finalTotalAmount }) // '2' - wydane/zrealizowane
                .eq('id_zamowienia', currentOrder.id_zamowienia);
            if (updateOrderError) throw updateOrderError;

            await supabase
                .from('stolik')
                .update({ status_stolika: false }) // false = wolny
                .eq('id_stolika', currentOrder.id_stolika);


            setOrderItems([]);
            setTotalAmount(0);
            setCurrentOrder(null);

            setNotificationMessage('Paragon został wygenerowany pomyślnie!');
            setShowNotification(true);
            setTimeout(() => {
                setShowNotification(false);
                router.push('/waiter');
            }, 2000);

        } catch (error) {
            console.error('Error processing payment:', error);
            alert(`Wystąpił błąd podczas przetwarzania płatności: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading && !dishes.length) { // Pokaż ładowanie tylko przy pierwszym ładowaniu danych
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <p className="text-xl text-black">Ładowanie danych stolika...</p>
            </div>
        );
    }

    return (
        <AuthGuard requiredRole="kelner">
            <div className="flex h-screen">
                {/* Order sidebar */}
                <div className="w-1/5 bg-white shadow-lg flex flex-col">
                    <div className="p-4 flex-1 overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-black">Zamówienie</h2>
                        <div className="space-y-2">
                            {orderItems.length === 0 && <p className="text-gray-500">Brak pozycji w zamówieniu.</p>}
                            {orderItems.map((item) => (
                                <div key={item.id_dania} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <div>
                                        <p className="font-medium text-black text-sm">{item.nazwa}</p>
                                        <p className="text-xs text-black">{item.ilosc} x {item.cena.toFixed(2)} zł</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromOrder(item.id_dania, item.cena)}
                                        className="text-red-500 hover:text-red-700 px-2 py-1 text-lg"
                                        aria-label={`Usuń ${item.nazwa}`}
                                    >
                                        &ndash;
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
                            className="w-full bg-green-600 text-white py-2 rounded mb-2 hover:bg-green-700 disabled:opacity-50"
                            disabled={isLoading || (orderItems.length === 0 && !currentOrder)}
                        >
                            {currentOrder ? 'Zaktualizuj ' : 'Zapisz '}
                        </button>
                        <button
                            onClick={handlePayment}
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                            disabled={isLoading || !currentOrder || orderItems.length === 0} // Podstawowe warunki pozostają
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

                    <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${selectedCategory === category
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white text-black hover:bg-gray-200'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {isLoading && dishes.length > 0 && <p className="text-center text-gray-600">Aktualizowanie...</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredDishes.map((dish) => (
                            <div
                                key={dish.id_dania}
                                className="bg-white p-3 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => addToOrder(dish)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Dodaj ${dish.nazwa} do zamówienia`}
                            >
                                <h3 className="font-semibold text-md mb-1 text-black">{dish.nazwa}</h3>
                                {selectedCategory === 'Wszystkie' && (
                                    <p className="text-xs text-gray-600 mb-2">{getCategoryName(dish.kategoria)}</p>
                                )}
                                <div className="flex justify-between items-center mt-2"> {/* Dodano mt-2 dla lepszego odstępu, jeśli kategoria jest ukryta */}
                                    <span className="font-bold text-md text-black">{dish.cena.toFixed(2)} zł</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {showNotification && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl">
                            <p className="text-xl text-black font-semibold">
                                {notificationMessage}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    )
}