import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from '../config/axios'
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react'
import { parseApiError } from '../utils/apiError'

const ResetPassword = () => {
    const { token } = useParams()
    const navigate = useNavigate()

    const [ password, setPassword ] = useState('')
    const [ confirmPassword, setConfirmPassword ] = useState('')
    const [ message, setMessage ] = useState('')
    const [ error, setError ] = useState('')
    const [ submitting, setSubmitting ] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        setMessage('')

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setSubmitting(true)

        axios.post('/users/reset-password', { token, password })
            .then(res => {
                setMessage(res.data.message)
                setTimeout(() => navigate('/login'), 3000)
            })
            .catch(err => {
                setError(parseApiError(err, 'Failed to reset password. Link might be invalid or expired.'))
            })
            .finally(() => {
                setSubmitting(false)
            })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md px-4 relative z-10">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl shadow-lg mb-4">
                            <Lock className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Set New Password</h1>
                        <p className="text-slate-400 mt-2">Create a secure password for your account</p>
                    </div>

                    {message ? (
                        <div className="space-y-6 text-center">
                            <div className="flex flex-col items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/50 text-green-400 text-sm">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                                <p>{message}</p>
                            </div>
                            <p className="text-slate-500 text-xs">Redirecting to login...</p>
                            <Link to="/login" className="inline-flex items-center gap-2 text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Go to Login Now
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">
                                    New Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        type="password"
                                        id="password"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                        placeholder="••••••••"
                                        required
                                        minLength={3}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="confirmPassword">
                                    Confirm New Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        type="password"
                                        id="confirmPassword"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg transform transition-all active:scale-[0.98] disabled:opacity-50 group"
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>Update Password</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ResetPassword
