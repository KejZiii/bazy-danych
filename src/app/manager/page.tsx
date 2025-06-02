'use client'
import { useEffect, useState, useCallback, FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'
import React from 'react'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/navigation'
import { getCookie, deleteCookie } from '@/utils/cookies'
import DishManagementSection from '@/components/DishManagmentSection';
import ReportGenerationSection from '@/components/ReportGenerationSection'; // Dodaj import

// --- Typy ---
interface Pracownik {
    id_pracownika: number
    nazwa_uzytkownika: string
    pin?: string
    rola: string
    status_konta: boolean
}

interface Danie {
    id_dania: number
    nazwa: string
    kategoria: string
    cena: number | string // Cena może być stringiem w formularzu
    opis: string
    dostepnosc: boolean
}

interface ReportItem {
    name: string
    count: number
    revenue?: number
}

interface Stolik {
    id_stolika: number
    numer_stolika: number
    status_stolika: boolean
    zamowienie?: Zamowienie[]
    status_aktywnego_zamowienia?: string | null
}

interface Zamowienie {
    id_zamowienia: number
    status_zamowienia: string
}

const ADMIN_USERNAME = 'admin'

// --- Typy Props dla komponentów widoków ---
interface UserManagementSectionProps {
    newUser: { nazwa_uzytkownika: string; pin: string; rola: string };
    users: Pracownik[];
    roleMapping: { [key: string]: string };
    roleOptions: { value: string; label: string }[];
    isLoading: boolean;
    ADMIN_USERNAME_CONST: string;
    handleNewUserChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleAddUser: (e: FormEvent) => Promise<void>;
    handleDeleteUser: (userId: number, username: string) => Promise<void>;
    changeUserRole: (userId: number, newRole: string, currentUsername: string) => Promise<void>;
}

const UserManagementSection: React.FC<UserManagementSectionProps> = ({
    newUser,
    users,
    roleMapping,
    roleOptions,
    isLoading,
    ADMIN_USERNAME_CONST,
    handleNewUserChange,
    handleAddUser,
    handleDeleteUser,
    changeUserRole
}) => (
    <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Dodaj / Zarządzaj Pracownikami</h2>
        <form onSubmit={handleAddUser} className="mb-8 p-6 bg-white shadow-lg rounded-lg max-w-md mx-auto flex flex-col items-center">
            <h3 className="text-lg font-medium mb-6 text-gray-800">Dodaj nowego pracownika</h3>
            <div className="w-full space-y-4">
                <div>
                    <label htmlFor="nazwa_uzytkownika_form" className="block text-sm font-medium text-gray-700 mb-1">Nazwa użytkownika</label>
                    <input
                        id="nazwa_uzytkownika_form"
                        type="text"
                        name="nazwa_uzytkownika"
                        value={newUser.nazwa_uzytkownika}
                        onChange={handleNewUserChange}
                        placeholder="Nazwa użytkownika"
                        className="w-full p-2 border border-gray-300 rounded text-black shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="pin_form" className="block text-sm font-medium text-gray-700 mb-1">PIN (dokładnie 4 cyfry)</label>
                    <input
                        id="pin_form"
                        type="password"
                        name="pin"
                        value={newUser.pin}
                        onChange={handleNewUserChange}
                        placeholder="PIN (4 cyfry)"
                        className="w-full p-2 border border-gray-300 rounded text-black shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                        pattern="\d{4}"
                        title="PIN musi składać się z dokładnie 4 cyfr."
                        maxLength={4}
                        autoComplete="new-password"
                    />
                </div>
                <div>
                    <label htmlFor="rola_form" className="block text-sm font-medium text-gray-700 mb-1">Rola</label>
                    <select
                        id="rola_form"
                        name="rola"
                        value={newUser.rola}
                        onChange={handleNewUserChange}
                        className="w-full p-2 border border-gray-300 rounded text-black shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-blue-400"
            >
                Dodaj pracownika
            </button>
        </form>

        <div className="space-y-3">
            {users.map(user => (
                <div key={user.id_pracownika} className="p-3 bg-white shadow rounded-lg flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-black">{user.nazwa_uzytkownika} ({roleMapping[user.rola]})</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {user.nazwa_uzytkownika !== ADMIN_USERNAME_CONST && (
                            <select
                                value={user.rola}
                                onChange={(e) => changeUserRole(user.id_pracownika, e.target.value, user.nazwa_uzytkownika)}
                                disabled={isLoading}
                                className="p-1 border rounded text-black bg-white text-xs shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        )}
                        <button
                            onClick={() => handleDeleteUser(user.id_pracownika, user.nazwa_uzytkownika)}
                            disabled={isLoading || user.nazwa_uzytkownika === ADMIN_USERNAME_CONST}
                            className={`px-3 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-50`}
                        >
                            Usuń
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </section>
);

interface TablesViewProps {
    tables: Stolik[];
    isLoading: boolean;
    getTableColorForManager: (status: string | null) => string;
    getTableStatusTextForManager: (status: string | null) => string;
}

const TablesView: React.FC<TablesViewProps> = ({ tables, isLoading, getTableColorForManager, getTableStatusTextForManager }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Podgląd Sali</h2>
        {isLoading && tables.length === 0 && <p className="text-center text-gray-500">Ładowanie stolików...</p>}
        {!isLoading && tables.length === 0 && <p className="text-center text-gray-500">Brak stolików do wyświetlenia.</p>}
        <div className="grid grid-cols-3 gap-12">
            {tables.map((table) => (
                <div
                    key={table.id_stolika}
                    className={`${getTableColorForManager(table.status_aktywnego_zamowienia ?? null)} p-6 rounded-lg shadow-md cursor-default
                                hover:shadow-lg transition-shadow duration-200 flex flex-col items-center justify-center`}
                >
                    <div className="flex items-center justify-center">
                        <span className="text-2xl font-bold text-black">Stolik {table.numer_stolika}</span>
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">
                        {getTableStatusTextForManager(table.status_aktywnego_zamowienia ?? null)}
                    </p>
                </div>
            ))}
        </div>
    </div>
);


export default function ManagerPage() {
    const supabase = createClient();
    const router = useRouter();
    const [activeView, setActiveView] = useState<'tables' | 'manageUsers' | 'manageDishes' | 'generateReports'>('tables');
    const [isLoading, setIsLoading] = useState(false);
    const [currentManager, setCurrentManager] = useState<Pracownik | null>(null);

    const [tables, setTables] = useState<Stolik[]>([]);
    const [users, setUsers] = useState<Pracownik[]>([]);
    const [newUser, setNewUser] = useState({ nazwa_uzytkownika: '', pin: '', rola: '1' });
    const [dishes, setDishes] = useState<Danie[]>([]);

    // Stany dla raportów
    const [dishPopularityReport, setDishPopularityReport] = useState<ReportItem[]>([]);
    const [revenueReport, setRevenueReport] = useState<{ totalRevenue: number; orderCount: number } | null>(null);
    const [reportStartDate, setReportStartDate] = useState<string>(''); // format: 'YYYY-MM-DDTHH:mm'
    const [reportEndDate, setReportEndDate] = useState<string>(''); // format: 'YYYY-MM-DDTHH:mm'

    const roleMapping: { [key: string]: string } = { '0': 'Manager', '1': 'Kelner', '2': 'Kucharz' };
    const roleOptions = Object.entries(roleMapping).map(([value, label]) => ({ value, label }));
    const categoryMapping: { [key: string]: string } = { '0': 'Przystawki', '1': 'Dania Główne', '2': 'Desery', '3': 'Napoje' };
    const categoryOptions = Object.entries(categoryMapping).map(([value, label]) => ({ value, label })); // Keep for DishManagementSection list display if needed, or remove if not used by it

    useEffect(() => {
        const userCookie = getCookie('user');
        if (userCookie) {
            try {
                const parsedUser = JSON.parse(userCookie);
                setCurrentManager(parsedUser);
            } catch (e) {
                console.error("Failed to parse user cookie", e);
            }
        }
    }, []);

    const fetchTables = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('stolik')
            .select(`id_stolika, numer_stolika, status_stolika, zamowienie (id_zamowienia, status_zamowienia)`)
            .order('numer_stolika', { ascending: true });
        if (error) console.error('Error fetching tables:', error);
        else {
            const tablesWithActiveOrders = data?.map(table => {
                const activeOrder = table.zamowienie.find(z => z.status_zamowienia === '0' || z.status_zamowienia === '1');
                return { ...table, status_aktywnego_zamowienia: activeOrder ? activeOrder.status_zamowienia : null };
            }) || [];
            setTables(tablesWithActiveOrders);
        }
        setIsLoading(false);
    }, [supabase]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('pracownik').select('*').order('id_pracownika');
        if (error) console.error('Error fetching users:', error);
        else setUsers(data || []);
        setIsLoading(false);
    }, [supabase]);

    const fetchDishes = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('danie').select('*').order('id_dania');
        if (error) console.error('Error fetching dishes:', error);
        else setDishes(data as Danie[] || []); // Cast to Danie[]
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        if (activeView === 'tables') fetchTables();
        if (activeView === 'manageUsers') fetchUsers();
        if (activeView === 'manageDishes') fetchDishes();
        if (activeView === 'generateReports') {
            // Można tu zresetować raporty, jeśli chcemy, aby były generowane na nowo za każdym razem
            // setDishPopularityReport([]);
            // setRevenueReport(null);
        }
    }, [activeView, fetchTables, fetchUsers, fetchDishes]);


    useEffect(() => {
        const tableChannel = supabase
            .channel('manager-tables-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stolik' }, fetchTables)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'zamowienie' }, fetchTables)
            .subscribe();
        const userChannel = supabase
            .channel('manager-users-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pracownik' }, () => {
                if (activeView === 'manageUsers') fetchUsers();
            })
            .subscribe();
        const dishChannel = supabase
            .channel('manager-dishes-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'danie' }, () => {
                if (activeView === 'manageDishes') fetchDishes();
            })
            .subscribe();
        return () => {
            supabase.removeChannel(tableChannel);
            supabase.removeChannel(userChannel);
            supabase.removeChannel(dishChannel);
        };
    }, [supabase, fetchTables, fetchUsers, fetchDishes, activeView]);

    const handleNewUserChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const processedValue = (name === "pin") ? value.slice(0, 4) : value;
        setNewUser(prev => ({ ...prev, [name]: processedValue }));
    }, []);

    const handleAddUser = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        if (!newUser.nazwa_uzytkownika || !newUser.pin || newUser.pin.length !== 4) {
            alert("Nazwa użytkownika i PIN (dokładnie 4 cyfry) są wymagane.");
            return;
        }
        setIsLoading(true);
        const { error } = await supabase.from('pracownik').insert([{
            nazwa_uzytkownika: newUser.nazwa_uzytkownika,
            pin: newUser.pin,
            rola: newUser.rola,
            status_konta: true,
        }]);
        if (error) alert('Błąd dodawania użytkownika: ' + error.message);
        else {
            alert('Użytkownik dodany pomyślnie.');
            setNewUser({ nazwa_uzytkownika: '', pin: '', rola: '1' });
        }
        setIsLoading(false);
    }, [newUser, supabase]);

    const handleDeleteUser = useCallback(async (userId: number, username: string) => {
        if (username === ADMIN_USERNAME) {
            alert('Nie można usunąć konta administratora.');
            return;
        }
        if (window.confirm(`Czy na pewno chcesz usunąć użytkownika ${username}? Tej operacji nie można cofnąć.`)) {
            setIsLoading(true);
            const { error } = await supabase.from('pracownik').delete().eq('id_pracownika', userId);
            if (error) alert('Błąd usuwania użytkownika: ' + error.message);
            else alert('Użytkownik usunięty pomyślnie.');
            setIsLoading(false);
        }
    }, [supabase]);

    const changeUserRole = useCallback(async (userId: number, newRole: string, currentUsername: string) => {
        if (currentUsername === ADMIN_USERNAME && newRole !== '0') {
            alert('Rola administratora nie może zostać zmieniona.');
            return;
        }
        setIsLoading(true);
        const { error } = await supabase.from('pracownik').update({ rola: newRole }).eq('id_pracownika', userId);
        if (error) alert('Błąd zmiany roli użytkownika: ' + error.message);
        setIsLoading(false);
    }, [supabase]);

    const toggleDishAvailability = useCallback(async (dish: Danie) => {
        setIsLoading(true);
        const { error } = await supabase
            .from('danie')
            .update({ dostepnosc: !dish.dostepnosc })
            .eq('id_dania', dish.id_dania);
        if (error) alert('Błąd zmiany dostępności dania: ' + error.message);
        // fetchDishes(); // Re-fetch to update the list, or rely on realtime
        setIsLoading(false);
    }, [supabase]); // Removed fetchDishes from dependencies, realtime should handle it. Add if needed.

    // --- Logowanie Raportu ---
    const logReportGeneration = useCallback(
        async (reportName: string, isFinancialType: boolean) => {
            if (!currentManager) {
                console.error("Manager ID not available to log report.");
                return;
            }
            const reportData = {
                typ_raportu: isFinancialType ? true : false, // 0 - popularność, 1 - przychody
                data_generacji: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                id_pracownika: currentManager.id_pracownika,
                data_start: reportStartDate || null,
                data_koniec: reportEndDate || null,
            };
            const { error } = await supabase.from('raport').insert([reportData]);
            if (error) {
                console.error(`Error logging ${reportName} report:`, error.message);
            } else {
                console.log(`${reportName} report generation logged.`);
            }
        },
        [currentManager, reportStartDate, reportEndDate, supabase]
    );

    // --- Handlery Raportów ---
    const generateDishPopularityReport = useCallback(async () => {
        setIsLoading(true);
        setDishPopularityReport([]);

        let query = supabase
            .from('danie_zamowienie')
            .select(`
                ilosc,
                danie (id_dania, nazwa),
                zamowienie!inner(data_zamowienia)
            `);

        if (reportStartDate && reportEndDate) {
            query = query
                .gte('zamowienie.data_zamowienia', reportStartDate)
                .lte('zamowienie.data_zamowienia', reportEndDate);
        } else if (reportStartDate) {
            query = query.gte('zamowienie.data_zamowienia', reportStartDate);
        } else if (reportEndDate) {
            query = query.lte('zamowienie.data_zamowienia', reportEndDate);
        }

        const { data, error } = await query;
        if (error) {
            alert('Błąd generowania raportu popularności dań: ' + error.message);
            setIsLoading(false); return;
        }
        if (data) {
            type DanieWithNazwa = { nazwa: string };
            const popularity = data.reduce((acc, item: { ilosc: number | null, danie: DanieWithNazwa | DanieWithNazwa[] | null }) => {
                let dishName = 'Nieznane danie';
                if (item.danie) {
                    if (Array.isArray(item.danie)) {
                        dishName = item.danie[0]?.nazwa || 'Nieznane danie';
                    } else {
                        dishName = (item.danie as DanieWithNazwa).nazwa || 'Nieznane danie';
                    }
                }
                acc[dishName] = (acc[dishName] || 0) + (item.ilosc || 0);
                return acc;
            }, {} as { [key: string]: number });
            const report = Object.entries(popularity).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
            setDishPopularityReport(report);
            await logReportGeneration("Popularność Dań", false); // <--- ZAPIS DO BAZY
        }
        setIsLoading(false);
    }, [supabase, logReportGeneration, reportStartDate, reportEndDate]);

    const generateRevenueReport = useCallback(async () => {
        setIsLoading(true);
        setRevenueReport(null);

        let query = supabase
            .from('zamowienie')
            .select('suma_zamowienia')
            .eq('status_zamowienia', '2');

        if (reportStartDate && reportEndDate) {
            query = query
                .gte('data_zamowienia', reportStartDate)
                .lte('data_zamowienia', reportEndDate);
        } else if (reportStartDate) {
            query = query.gte('data_zamowienia', reportStartDate);
        } else if (reportEndDate) {
            query = query.lte('data_zamowienia', reportEndDate);
        }

        const { data, error } = await query;
        if (error) {
            alert('Błąd generowania raportu przychodów: ' + error.message);
            setIsLoading(false); return;
        }
        if (data) {
            const totalRevenue = data.reduce((sum, order) => sum + (order.suma_zamowienia || 0), 0);
            setRevenueReport({ totalRevenue, orderCount: data.length });
            await logReportGeneration("Przychody", true); // <--- ZAPIS DO BAZY
        }
        setIsLoading(false);
    }, [supabase, logReportGeneration, reportStartDate, reportEndDate]);


    const handleLogout = () => {
        deleteCookie('user');
        router.push('/login');
    };

    const getTableColorForManager = useCallback((statusAktywnegoZamowienia: string | null) => {
        if (statusAktywnegoZamowienia === '0' || statusAktywnegoZamowienia === '1') return 'bg-yellow-200';
        return 'bg-green-200';
    }, []);

    const getTableStatusTextForManager = useCallback((statusAktywnegoZamowienia: string | null) => {
        if (statusAktywnegoZamowienia === '0') return 'Przyjęte';
        if (statusAktywnegoZamowienia === '1') return 'W przygotowaniu';
        return 'Wolny';
    }, []);


    return (
        <AuthGuard requiredRole='kierownik'>
            <div className="flex h-screen bg-gray-100">
                <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    {activeView === 'tables' && (
                        <TablesView
                            tables={tables}
                            isLoading={isLoading}
                            getTableColorForManager={getTableColorForManager}
                            getTableStatusTextForManager={getTableStatusTextForManager}
                        />
                    )}
                    {activeView === 'manageUsers' && (
                        <UserManagementSection
                            newUser={newUser}
                            users={users}
                            roleMapping={roleMapping}
                            roleOptions={roleOptions}
                            isLoading={isLoading}
                            ADMIN_USERNAME_CONST={ADMIN_USERNAME}
                            handleNewUserChange={handleNewUserChange}
                            handleAddUser={handleAddUser}
                            handleDeleteUser={handleDeleteUser}
                            changeUserRole={changeUserRole}
                        />
                    )}
                    {activeView === 'manageDishes' && (
                        <DishManagementSection
                            dishes={dishes}
                            categoryMapping={categoryMapping}
                            isLoading={isLoading}
                            toggleDishAvailability={toggleDishAvailability}
                        />
                    )}
                    {activeView === 'generateReports' && (
                        <ReportGenerationSection
                            isLoading={isLoading}
                            reportStartDate={reportStartDate}
                            setReportStartDate={setReportStartDate}
                            reportEndDate={reportEndDate}
                            setReportEndDate={setReportEndDate}
                            generateDishPopularityReport={generateDishPopularityReport}
                            generateRevenueReport={generateRevenueReport}
                            dishPopularityReport={dishPopularityReport}
                            revenueReport={revenueReport}
                        />
                    )}
                </div>

                <div className="w-64 bg-white shadow-xl flex flex-col">
                    <nav className="flex-1 p-3 space-y-1.5">
                        {[
                            { label: 'Podgląd Sali', view: 'tables' },
                            { label: 'Zarządzaj Pracownikami', view: 'manageUsers' },
                            { label: 'Zarządzaj Daniami', view: 'manageDishes' },
                            { label: 'Generuj Raporty', view: 'generateReports' },
                        ].map(item => (
                            <button
                                key={item.view}
                                onClick={() => setActiveView(item.view as any)}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out ${activeView === item.view ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200 hover:text-black focus:bg-gray-200'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-2 ring-1 ring-gray-300">
                                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h2 className="text-sm font-semibold text-black">
                                {currentManager ? roleMapping[currentManager.rola] : 'Kierownik'}
                            </h2>
                            <span className="text-xs text-gray-600 text-center break-words w-full mb-2">
                                {currentManager ? (currentManager.nazwa_uzytkownika) : 'Ładowanie...'}
                            </span>
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
    );
}