import React from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter

// Danie type (ensure consistency or import from a central place)
interface Danie {
    id_dania: number;
    nazwa: string;
    kategoria: string;
    cena: number | string;
    opis: string;
    dostepnosc: boolean;
}

interface DishManagementSectionProps {
    dishes: Danie[];
    categoryMapping: { [key: string]: string };
    isLoading: boolean;
    toggleDishAvailability: (dish: Danie) => Promise<void>;
    // Removed props related to inline form: newDish, editingDish, handleNewOrEditingDishChange, handleAddOrUpdateDish, startEditDish, setEditingDish
}

const DishManagementSection: React.FC<DishManagementSectionProps> = ({
    dishes,
    categoryMapping,
    isLoading,
    toggleDishAvailability,
}) => {
    const router = useRouter(); // Initialize router

    return (
        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Zarządzaj Daniami</h2>
                <button
                    onClick={() => router.push('/manager/dish-form')} // Navigate to the new form page for adding
                    disabled={isLoading}
                    className="bg-blue-600 text-white py-2.5 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-blue-400 transition-colors"
                >
                    Dodaj Danie
                </button>
            </div>

            {isLoading && dishes.length === 0 && <p className="text-center text-gray-500 py-4">Ładowanie dań...</p>}
            {!isLoading && dishes.length === 0 && <p className="text-center text-gray-500 py-4">Brak dań do wyświetlenia. Kliknij &quot;Dodaj Danie&quot;, aby dodać nowe.</p>}

            <div className="space-y-4">
                {dishes.map(dish => (
                    <div key={dish.id_dania} className="p-4 bg-white shadow-lg rounded-lg border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                            <div className="flex-grow">
                                <h4 className="font-semibold text-lg text-gray-800">{dish.nazwa}</h4>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Kategoria:</span> {categoryMapping[dish.kategoria] || 'Nieznana'}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Cena:</span> {Number(dish.cena).toFixed(2)} zł
                                </p>
                                {dish.opis && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        <span className="font-medium">Opis:</span> {dish.opis}
                                    </p>
                                )}
                                <p className={`mt-2 text-sm font-semibold ${dish.dostepnosc ? 'text-green-600' : 'text-red-600'}`}>
                                    Status: {dish.dostepnosc ? 'Dostępne' : 'Niedostępne (Zablokowane)'}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0 w-full sm:w-auto">
                                <button
                                    onClick={() => router.push(`/manager/dish-form?id=${dish.id_dania}`)} // Navigate to form page for editing
                                    disabled={isLoading}
                                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50 transition-colors"
                                >
                                    Edytuj
                                </button>
                                <button
                                    onClick={() => toggleDishAvailability(dish)}
                                    disabled={isLoading}
                                    className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md text-white disabled:opacity-50 transition-colors ${dish.dostepnosc ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                        }`}
                                >
                                    {dish.dostepnosc ? 'Zablokuj' : 'Odblokuj'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default DishManagementSection;