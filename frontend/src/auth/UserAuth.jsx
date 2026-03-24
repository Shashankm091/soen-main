import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'

const UserAuth = ({ children }) => {

    const { user, setUser } = useContext(UserContext)
    const token = localStorage.getItem('token')
    const navigate = useNavigate()

    const [ loading, setLoading ] = useState(() => {
        if (user) return false
        if (!token) return false
        return true
    })

    useEffect(() => {
        if (user) {
            setLoading(false)
            return
        }

        if (!token) {
            setLoading(false)
            navigate('/login')
            return
        }

        axios.get('/users/profile')
            .then((res) => {
                setUser(res.data.user)
                setLoading(false)
            })
            .catch((err) => {
                console.error('Session restore failed:', err)
                localStorage.removeItem('token')
                setLoading(false)
                navigate('/login')
            })
    }, [ user, token, navigate, setUser ])

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
    }


    return (
        <>
            {children}
        </>
    )
}

export default UserAuth