import { useState, useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import Login from './components/Login'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Activity from './components/Activity'
import Standings from './components/Standings'
import Market from './components/Market'
import Teams from './components/Teams'
import Lineup from './components/Lineup'
import Matches from './components/Matches'
import Players from './components/Players'
import Clauses from './components/Clauses'
import Statistics from './components/Statistics'
import Intelligence from './components/Intelligence'
import toast from 'react-hot-toast'

function App() {
    const { isAuthenticated, user, isLoading } = useAuthStore()
    const [currentTab, setCurrentTab] = useState('dashboard')

    useEffect(() => {
        if (isAuthenticated && user) {
            toast.success(`¡Bienvenido, ${user.given_name || user.name || 'Manager'}!`)
        }
    }, [isAuthenticated])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400">Cargando...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Login />
    }

    // Render the correct component based on currentTab
    const renderContent = () => {
        switch (currentTab) {
            case 'dashboard':
                return <Dashboard />
            case 'activity':
                return <Activity />
            case 'standings':
                return <Standings />
            case 'market':
                return <Market />
            case 'teams':
                return <Teams />
            case 'lineup':
                return <Lineup />
            case 'matches':
                return <Matches />
            case 'players':
                return <Players />
            case 'clauses':
                return <Clauses />
            case 'statistics':
                return <Statistics />
            case 'intelligence':
                return <Intelligence />
            default:
                return <Dashboard />
        }
    }

    return (
        <div className="min-h-screen bg-background-dark">
            <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
            <main className="lg:ml-64 pb-24 lg:pb-6 safe-bottom">
                {renderContent()}
            </main>
        </div>
    )
}

export default App
