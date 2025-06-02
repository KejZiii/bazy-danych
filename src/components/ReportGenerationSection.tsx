import React from 'react';

interface ReportItem {
    name: string;
    count: number;
    revenue?: number; // Dla raportów finansowych
}

interface RevenueReportData {
    totalRevenue: number;
    orderCount: number;
}

interface ReportGenerationSectionProps {
    isLoading: boolean;
    reportStartDate: string;
    setReportStartDate: (date: string) => void;
    reportEndDate: string;
    setReportEndDate: (date: string) => void;
    generateDishPopularityReport: () => Promise<void>;
    generateRevenueReport: () => Promise<void>;
    dishPopularityReport: ReportItem[];
    revenueReport: RevenueReportData | null;
}

const ReportGenerationSection: React.FC<ReportGenerationSectionProps> = ({
    isLoading,
    reportStartDate,
    setReportStartDate,
    reportEndDate,
    setReportEndDate,
    generateDishPopularityReport,
    generateRevenueReport,
    dishPopularityReport,
    revenueReport,
}) => {
    return (
        <section>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generuj Raporty</h2>

            <div className="mb-8 p-6 bg-white shadow-xl rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Wybierz Zakres Dat (Opcjonalnie)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="reportStartDate" className="block text-sm font-medium text-gray-700 mb-1">Data początkowa</label>
                        <input
                            type="datetime-local"
                            id="reportStartDate"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-black shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="reportEndDate" className="block text-sm font-medium text-gray-700 mb-1">Data końcowa</label>
                        <input
                            type="datetime-local"
                            id="reportEndDate"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-black shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Wybrane daty są zapisywane w tabeli `Raport` dla celów ewidencyjnych.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Raport Popularności Dań */}
                <div className="p-6 bg-white shadow-xl rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Raport Popularności Dań</h3>
                    <button
                        onClick={generateDishPopularityReport}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-blue-400 mb-4"
                    >
                        {isLoading ? 'Generowanie...' : 'Generuj Raport Popularności'}
                    </button>
                    {dishPopularityReport.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Najpopularniejsze Dania:</h4>
                            <ul className="list-decimal list-inside space-y-1 text-sm text-black">
                                {dishPopularityReport.map(item => (
                                    <li key={item.name}>{item.name}: {item.count} szt.</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Raport Przychodów */}
                <div className="p-6 bg-white shadow-xl rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Raport Przychodów</h3>
                    <button
                        onClick={generateRevenueReport}
                        disabled={isLoading}
                        className="w-full bg-green-600 text-white py-2.5 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:bg-green-400 mb-4"
                    >
                        {isLoading ? 'Generowanie...' : 'Generuj Raport Przychodów'}
                    </button>
                    {revenueReport && (
                        <div>
                            <h4 className="font-medium text-gray-800 mb-1">Całkowity Przychód: <span className="font-bold">{revenueReport.totalRevenue.toFixed(2)} zł</span></h4>
                            <p className="text-sm text-black">Liczba zrealizowanych zamówień: {revenueReport.orderCount}</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ReportGenerationSection;