'use client'
import { Suspense } from 'react'
import React, { useState, useEffect, FormEvent, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import AuthGuard from '@/components/AuthGuard'

// Define Danie type (ensure this is consistent with other definitions)
interface Danie {
    id_dania?: number // Optional for new dishes
    nazwa: string
    kategoria: string
    cena: number | string // string for form input, number for DB
    opis: string
    dostepnosc: boolean
    obraz?: string // Dodaj pole na URL obrazka
}

// Define category options locally or import from a shared utility
const categoryOptionsArray = [
    { value: '0', label: 'Przystawki' },
    { value: '1', label: 'Dania Główne' },
    { value: '2', label: 'Desery' },
    { value: '3', label: 'Napoje' },
];

function DishFormPageContent() {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dishId = searchParams.get('id');

    const [dishData, setDishData] = useState<Danie>({
        nazwa: '',
        kategoria: categoryOptionsArray[0].value, // Default to first category
        cena: '',
        opis: '',
        dostepnosc: true,
        obraz: '', // Domyślnie pusty string
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [pageTitle, setPageTitle] = useState('Dodaj Nowe Danie');

    useEffect(() => {
        if (dishId) {
            setIsEditMode(true);
            setPageTitle('Edytuj Danie');
            setIsLoading(true);
            const fetchDish = async () => {
                const { data, error } = await supabase
                    .from('danie')
                    .select('*')
                    .eq('id_dania', dishId)
                    .single();

                if (error) {
                    console.error('Error fetching dish for edit:', error);
                    alert('Nie udało się załadować danych dania.');
                    router.push('/manager'); // Redirect if error
                } else if (data) {
                    setDishData({
                        ...data,
                        cena: String(data.cena), // Ensure cena is string for form
                        obraz: data.obraz || '', // Ustaw pole obraz, jeśli istnieje
                    });
                }
                setIsLoading(false);
            };
            fetchDish();
        }
    }, [dishId, supabase, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

        setDishData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const cenaValue = parseFloat(String(dishData.cena));

        if (!dishData.nazwa || isNaN(cenaValue) || cenaValue <= 0) {
            alert("Nazwa dania i poprawna, dodatnia cena są wymagane.");
            return;
        }
        setIsLoading(true);

        const dataToSubmit = {
            ...dishData,
            cena: cenaValue,
            kategoria: String(dishData.kategoria),
            obraz: dishData.obraz || null, // Dodaj pole obraz do zapisu
        };

        let error;
        if (isEditMode && dishId) {
            const { error: updateError } = await supabase
                .from('danie')
                .update(dataToSubmit)
                .eq('id_dania', dishId);
            error = updateError;
        } else {
            // Remove id_dania before insert to avoid PK conflict
            const { id_dania, ...insertData } = dataToSubmit;
            const { error: insertError } = await supabase
                .from('danie')
                .insert([insertData]);
            error = insertError;
        }

        if (error) {
            alert('Błąd zapisu dania: ' + error.message);
        } else {
            alert(isEditMode ? 'Danie zaktualizowane!' : 'Danie dodane!');
            // Navigate back to manager page, ideally to the dishes view
            // For simplicity, just navigating to /manager. Active view can be handled by ManagerPage itself.
            router.push('/manager');
        }
        setIsLoading(false);
    };

    if (isLoading && isEditMode && !dishData.nazwa) { // Show loading only when fetching for edit
        return <div className="p-8 text-center">Ładowanie danych dania...</div>;
    }

    return (
        <AuthGuard requiredRole="kierownik">
            <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
                <button
                    onClick={() => router.push('/manager')} // Consider navigating to activeView='manageDishes'
                    className="mb-6 text-blue-600 hover:text-blue-800 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Powrót do panelu managera
                </button>
                <h1 className="text-2xl font-bold mb-6 text-gray-800">{pageTitle}</h1>
                <form onSubmit={handleSubmit} className="p-6 bg-white shadow-xl rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label htmlFor="nazwa" className="block text-sm font-medium text-gray-700 mb-1">Nazwa dania</label>
                            <input id="nazwa" type="text" name="nazwa" value={dishData.nazwa} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md text-black shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="kategoria" className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
                            <select id="kategoria" name="kategoria" value={dishData.kategoria} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-md text-black shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                {categoryOptionsArray.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="cena" className="block text-sm font-medium text-gray-700 mb-1">Cena (zł)</label>
                            <input id="cena" type="number" name="cena" value={dishData.cena} onChange={handleChange} required step="0.01" min="0" className="w-full p-3 border border-gray-300 rounded-md text-black shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="obraz" className="block text-sm font-medium text-gray-700 mb-1">URL obrazka (opcjonalnie)</label>
                            <input id="obraz" type="text" name="obraz" value={dishData.obraz} onChange={handleChange} placeholder="https://..." className="w-full p-3 border border-gray-300 rounded-md text-black shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="opis" className="block text-sm font-medium text-gray-700 mb-1">Opis (opcjonalnie)</label>
                            <textarea id="opis" name="opis" value={dishData.opis} onChange={handleChange} rows={3} className="w-full p-3 border border-gray-300 rounded-md text-black shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div className="md:col-span-2 flex items-center">
                            <input id="dostepnosc" type="checkbox" name="dostepnosc" checked={dishData.dostepnosc} onChange={handleChange} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <label htmlFor="dostepnosc" className="ml-2 block text-sm text-gray-900">Dostępne w menu</label>
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
                        <button type="submit" disabled={isLoading} className="w-full sm:w-auto flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-blue-400 transition-colors">
                            {isEditMode ? 'Zaktualizuj Danie' : 'Dodaj Danie'}
                        </button>
                        <button type="button" onClick={() => router.push('/manager')} disabled={isLoading} className="w-full sm:w-auto flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors">
                            Anuluj
                        </button>
                    </div>
                </form>
            </div>
        </AuthGuard>
    );
}

export default function DishFormPage() {
    return (
        <Suspense fallback={<div>Ładowanie...</div>}>
            <DishFormPageContent />
        </Suspense>
    )
}