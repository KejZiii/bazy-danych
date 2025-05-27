import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Brak dostępu</h1>
                <p className="mb-4">Nie masz uprawnień do wyświetlenia tej strony.</p>
                <button
                    onClick={() => router.back()}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Wróć
                </button>
            </div>
        </div>
    )
}