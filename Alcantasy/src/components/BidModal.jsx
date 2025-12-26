
import { useState, useEffect } from 'react'
import { Gavel, X, DollarSign } from 'lucide-react'
import { fantasyAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function BidModal({ isOpen, onClose, player, leagueId, onBidSuccess }) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (player) {
            // Set default bid to market value or slightly higher
            setAmount(player.price || player.playerMaster?.marketValue || '')
        }
    }, [player])

    if (!isOpen || !player) return null

    const p = player.playerMaster || player
    const minValue = p.marketValue

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const bidValue = parseFloat(amount)
            if (bidValue < minValue) {
                toast.error(`La puja mínima es ${minValue.toLocaleString()} €`)
                setLoading(false)
                return
            }

            // Prepare bid data
            // Usually API requires: leagueId, playerMasterId, amount, teamId?
            // The endpoint in api.js needs to be checked or assumed standard
            // fantasyAPI.makeBid(leagueId, playerMasterId, amount) ??

            // Assuming makeBid(leagueId, offerData)
            // offerData usually { playerMasterId: ..., amount: ... }

            // Checking api.js signature based on typically v4:
            // makeOffers: (leagueId, offers) => ... where offers is array
            // or separate endpoint.

            // Let's assume we implement a specific call if not present,
            // or use a generic 'makeBid' helper we will add to api.js if needed.
            // Using fantasyAPI.makeBid(leagueId, offer)

            // Use makeBid from api.js: makeBid(leagueId, marketId, amount)
            // player.id is the market item ID
            await fantasyAPI.makeBid(leagueId, player.id, bidValue)

            toast.success('Oferta realizada con éxito')
            if (onBidSuccess) onBidSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Error al realizar la oferta')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface-light w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface-dark/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Gavel size={20} className="text-primary" />
                        Realizar Puja
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-surface-accent border-2 border-primary/20 p-1 flex-shrink-0">
                            {p.images?.transparent?.['256x256'] ? (
                                <img src={p.images.transparent['256x256']} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-xl">
                                    {p.nickname?.[0]}
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-xl text-white">{p.nickname}</h4>
                            <p className="text-sm text-gray-400">{p.team?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300">
                                    VM: {(p.marketValue / 1000000).toFixed(1)}M €
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                Cantidad de la puja (€)
                            </label>
                            <div className="relative">
                                <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors font-mono text-lg"
                                    placeholder="0"
                                    min={minValue}
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">
                                Mínimo: {new Intl.NumberFormat('es-ES').format(minValue)} €
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary-dark text-black font-bold py-3.5 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? 'Enviando...' : 'Confirmar Puja'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
