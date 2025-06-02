'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import { getCookie } from '@/utils/cookies'
import { useRouter } from 'next/navigation'
import React from 'react'

interface Danie {
    id_dania: number
    nazwa: string
}

interface DanieWZamowieniu {
    id_danie_zamowienie: number
    ilosc: number
    status_dania_kucharza: boolean // false - W przygotowaniu, true - Gotowe do wydania
    danie: Danie
}

interface ZamowienieDlaKucharza {
    id_zamowienia: number
    status_zamowienia: string // '0' - Przyjęte, '1' - W przygotowaniu
    stolik: { numer_stolika: number } | null
    danie_zamowienie: DanieWZamowieniu[]
}

export default function KitchenPage() {
    const supabase = createClient()
    const router = useRouter()
    const [orders, setOrders] = useState<ZamowienieDlaKucharza[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')

    const getOrderStatusText = (dishes: DanieWZamowieniu[]) => {
    if (dishes.length === 0) return 'Brak dań';
    const allReady = dishes.every(d => d.status_dania_kucharza === true);
    const allInProgress = dishes.every(d => d.status_dania_kucharza === false);
    if (allInProgress) return 'Przyjęte';
    if (allReady) return 'Gotowe';
    return 'W przygotowaniu';
};

    // Dodaj funkcję do określania koloru boxa na podstawie statusów dań
const getOrderBoxColor = (dishes: DanieWZamowieniu[]) => {
    if (dishes.length === 0) return 'bg-gray-200'; // Brak dań
    const allReady = dishes.every(d => d.status_dania_kucharza === true);
    const allInProgress = dishes.every(d => d.status_dania_kucharza === false);
    if (allInProgress) return 'bg-red-200'; // Wszystkie w przygotowaniu
    if (allReady) return 'bg-green-200'; // Wszystkie gotowe
    return 'bg-yellow-200'; // Przynajmniej jedno gotowe, ale nie wszystkie
};

const CATEGORY_LABELS: { [key: string]: string } = {
    '0': 'Przystawki',
    '1': 'Dania Główne',
    '2': 'Desery',
    '3': 'Napoje',
};

// Funkcja do grupowania dań po kategorii
const groupDishesByCategory = (dishes: DanieWZamowieniu[]) => {
    const grouped: { [key: string]: DanieWZamowieniu[] } = {
        '0': [],
        '1': [],
        '2': [],
        '3': [],
    };
    dishes.forEach(async dish => {
        // domyślnie '3' jeśli brak kategorii
        const cat = (dish.danie as any).kategoria ?? '3';
        // Jeśli to napój i nie jest gotowy, ustaw na gotowe
        if (cat === '3' && dish.status_dania_kucharza === false) {
            // Wywołaj update tylko jeśli nie jest już gotowe
            await handleAutoSetDrinkReady(dish.id_danie_zamowienie);
            dish.status_dania_kucharza = true; // Optymistycznie ustawiamy na gotowe
        }
        if (grouped[cat]) {
            grouped[cat].push(dish);
        } else {
            grouped['3'].push(dish);
        }
    });
    return grouped;
};

// Funkcja do automatycznego ustawiania napoju na gotowe
const handleAutoSetDrinkReady = async (id_danie_zamowienie: number) => {
    await supabase
        .from('danie_zamowienie')
        .update({ status_dania_kucharza: true })
        .eq('id_danie_zamowienie', id_danie_zamowienie);
};



    const fetchKitchenOrders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
        .from('zamowienie')
        .select(`
            id_zamowienia,
            status_zamowienia,
            stolik (numer_stolika),
            danie_zamowienie (
                id_danie_zamowienie,
                ilosc,
                status_dania_kucharza,
                danie (id_dania, nazwa, kategoria)
            )
        `)
        .in('status_zamowienia', ['0', '1'])
        .order('id_zamowienia', { ascending: true })

        if (fetchError) {
            console.error('Błąd pobierania zamówień dla kuchni:', fetchError)
            setError('Nie udało się pobrać zamówień.')
            setOrders([])
        } else {
            // Map the response to match the expected types
            setOrders(
                (data || []).map((order: any) => ({
                    ...order,
                    stolik: Array.isArray(order.stolik) ? order.stolik[0] ?? null : order.stolik ?? null,
                    danie_zamowienie: (order.danie_zamowienie || []).map((dish: any) => ({
                        ...dish,
                        danie: Array.isArray(dish.danie) ? dish.danie[0] ?? null : dish.danie ?? null,
                    })),
                }))
            )
        }
        setIsLoading(false)
    }, [supabase])

    const getUserName = async () => {
        try {
            const userData = getCookie('user')
            if (userData) {
                const user = JSON.parse(userData)
                if (user.nazwa_uzytkownika) {
                    setUserName(user.nazwa_uzytkownika)
                }
            }
        } catch (error) {
            console.error('Wystąpił błąd:', error)
        }
    }

    useEffect(() => {
        fetchKitchenOrders();
        getUserName();

        // Użyj unikalnej nazwy kanału dla testów, aby uniknąć potencjalnych konfliktów
        const channelName = 'kitchen-realtime-debug-channel';
        const ordersChannel = supabase.channel(channelName);

        ordersChannel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'danie_zamowienie' }, // Zacznij od jednej tabeli dla uproszczenia
                (payload) => {
                    console.log(`KUCHNIA (${channelName}): Zmiana w danie_zamowienie!`, payload);
                    fetchKitchenOrders();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'zamowienie' },
                (payload) => {
                    console.log(`KUCHNIA (${channelName}): Zmiana w zamowienie!`, payload);
                    fetchKitchenOrders();
                }
            )
            // Możesz dodać nasłuchiwanie na 'stolik' później, jak podstawowe zacznie działać
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`KUCHNIA: Pomyślnie zasubskrybowano kanał "${channelName}"!`);
                }
                if (status === 'CHANNEL_ERROR') {
                    // Zmodyfikowany log błędu kanału
                    console.error(`KUCHNIA: Błąd kanału "${channelName}". Status: ${status}`, err);
                    if (err) {
                        console.error('KUCHNIA: Szczegóły błędu kanału:', JSON.stringify(err, null, 2));
                    }
                }
                if (status === 'TIMED_OUT') {
                    console.warn(`KUCHNIA: Subskrypcja kanału "${channelName}" wygasła (timeout). Status: ${status}`);
                }
                if (err && status !== 'CHANNEL_ERROR') { // Logowanie ogólnego błędu, jeśli wystąpił i nie jest to CHANNEL_ERROR
                    console.error(`KUCHNIA: Ogólny błąd subskrypcji dla kanału "${channelName}". Status: ${status}`, err);
                    console.error('KUCHNIA: Szczegóły ogólnego błędu:', JSON.stringify(err, null, 2));
                }
                // Logowanie każdego statusu dla kompletności
                if (status !== 'SUBSCRIBED' && status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') {
                    console.log(`KUCHNIA: Status subskrypcji kanału "${channelName}": ${status}`);
                }
            });

        return () => {
            supabase.removeChannel(ordersChannel);
            console.log(`KUCHNIA: Kanał "${channelName}" został usunięty.`);
        };
    }, [fetchKitchenOrders, supabase]);

    const handleToggleDishStatus = async (
        id_danie_zamowienie: number,
        currentStatus: boolean
    ) => {
        const newStatus = !currentStatus // Toggle boolean value
        const { error: updateError } = await supabase
            .from('danie_zamowienie')
            .update({ status_dania_kucharza: newStatus })
            .eq('id_danie_zamowienie', id_danie_zamowienie)

        if (updateError) {
            console.error('Błąd aktualizacji statusu dania:', updateError)
            alert('Nie udało się zaktualizować statusu dania.')
        } else {
            // Optimistic update
            setOrders(prevOrders =>
                prevOrders.map(order => ({
                    ...order,
                    danie_zamowienie: order.danie_zamowienie.map(dish =>
                        dish.id_danie_zamowienie === id_danie_zamowienie
                            ? { ...dish, status_dania_kucharza: newStatus }
                            : dish
                    ),
                }))
            )
        }
    }

    

    const getDishStatusText = (status: boolean) => {
        return status ? 'Gotowe do wydania' : 'W przygotowaniu'
    }

    const handleLogout = () => {
        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push('/login');
    }

    if (isLoading) {
        return (
            <AuthGuard requiredRole="kucharz">
                <div className="p-8 text-center">Ładowanie zamówień...</div>
            </AuthGuard>
        )
    }

    if (error) {
        return (
            <AuthGuard requiredRole="kucharz">
                <div className="p-8 text-center text-red-500">{error}</div>
            </AuthGuard>
        )
    }

return (
    <AuthGuard requiredRole="kucharz">
        <div className="flex h-screen">
            {/* Main content */}
            <div className="flex-1 p-4 md:p-8 bg-gray-100 overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Panel Kucharza - Aktywne Zamówienia</h1>
                </header>

                {orders.length === 0 ? (
                    <p className="text-center text-gray-500 text-xl">Brak aktywnych zamówień do przygotowania.</p>
                ) : (
                    // Sortujemy zamówienia: najpierw niegotowe, potem gotowe
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...orders]
    .sort((a, b) => {
        const aReady = a.danie_zamowienie.length > 0 && a.danie_zamowienie.every(d => d.status_dania_kucharza === true);
        const bReady = b.danie_zamowienie.length > 0 && b.danie_zamowienie.every(d => d.status_dania_kucharza === true);
        if (aReady === bReady) return 0;
        if (aReady) return 1;
        return -1;
    })
    .map((order) => {
        const grouped = groupDishesByCategory(order.danie_zamowienie);
        return (
            <div
                key={order.id_zamowienia}
                className={`shadow-xl rounded-lg p-6 transition-colors ${getOrderBoxColor(order.danie_zamowienie)} flex flex-col`}
                style={{ height: '600px', minHeight: '340px', maxHeight: '600px' }}
            >
                <div className="mb-4 pb-2 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-purple-700">
                        {order.stolik && (
                            <span className="text-xl text-gray-600">
                                Stolik: {order.stolik.numer_stolika}, Zamówienie #{order.id_zamowienia}
                            </span>
                        )}
                        {!order.stolik && (
                            <span className="text-xl text-gray-600">
                                Zamówienie #{order.id_zamowienia}
                            </span>
                        )}
                    </h2>
                    <p className="text-base text-gray-500">
                        Status zamówienia: {getOrderStatusText(order.danie_zamowienie)}
                    </p>
                </div>
                <ul className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2">
    {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
        grouped[catKey].length === 0 ? null : (
            <React.Fragment key={catKey}>
                <li className="font-semibold text-gray-700 mt-2">{catLabel}:</li>
                {grouped[catKey].map((dish) => (
                    <li
                        key={dish.id_danie_zamowienie}
                        className="flex justify-between items-center p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <div>
                            <p className="font-medium text-gray-800">
                                {dish.danie.nazwa} (x{dish.ilosc})
                            </p>
                            <p
                                className={`text-xs font-semibold ${
                                    dish.status_dania_kucharza ? 'text-green-600' : 'text-orange-500'
                                }`}
                            >
                                {getDishStatusText(dish.status_dania_kucharza)}
                            </p>
                        </div>
                        {/* Ukryj przycisk dla napojów */}
                        {((dish.danie as any).kategoria ?? '3') !== '3' && (
                            <button
                                onClick={() =>
                                    handleToggleDishStatus(
                                        dish.id_danie_zamowienie,
                                        dish.status_dania_kucharza
                                    )
                                }
                                className={`w-32 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                                    ${
                                        !dish.status_dania_kucharza
                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                                    }`}
                            >
                                {!dish.status_dania_kucharza ? 'Oznacz Gotowe' : 'Cofnij'}
                            </button>
                        )}
                    </li>
                ))}
            </React.Fragment>
        )
    ))}
</ul>
            </div>
        );
    })
}
                    </div>
                )}
            </div>

                {/* Sidebar - taki sam jak w panelu kelnera ale bez przycisku hamburger */}
                <div className="w-32 bg-white shadow-lg flex flex-col">
                    <div className="flex-1 p-4">
                        {/* Pusta przestrzeń gdzie w panelu kelnera jest przycisk hamburger */}
                    </div>
                    <div className="p-4 border-t">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <span className="text-sm text-gray-700 text-center break-words w-full mb-4">{userName}</span>
                            <button
                                onClick={handleLogout}
                                className="text-xs text-red-500 hover:text-red-700 underline focus:outline-none"
                            >
                                Wyloguj
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    )
}