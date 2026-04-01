import React, { useContext, useState, useEffect } from 'react'
import { UserContext } from '../context/user.context'
import axios from "../config/axios"
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Trash2, LogOut } from 'lucide-react'

const Home = () => {

    const { user, setUser } = useContext(UserContext)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ projectName, setProjectName ] = useState('')
    const [ project, setProject ] = useState([])
    const [ error, setError ] = useState(null)
    const [ loadingId, setLoadingId ] = useState(null)

    const navigate = useNavigate()

    function logout() {
        localStorage.removeItem('token')
        setUser(null)
        navigate('/login')
    }

    function fetchProjects() {
        axios.get('/projects/all').then((res) => {
            setProject(res.data.projects)
        }).catch(err => {
            console.log(err)
        })
    }

    function createProject(e) {
        e.preventDefault()

        axios.post('/projects/create', {
            name: projectName,
        })
            .then((res) => {
                setIsModalOpen(false)
                setError(null)
                setProjectName('')
                fetchProjects()
            })
            .catch((err) => {
                setError(err.response?.data?.error || err.response?.data || "Failed to create project")
            })
    }
    
    function deleteProject(e, projectId) {
        e.stopPropagation(); // Prevent navigating to project
        if (!window.confirm("Are you sure you want to permanently delete this project?")) return;
        
        setLoadingId(projectId)
        axios.delete(`/projects/delete/${projectId}`)
            .then(res => {
                fetchProjects()
            })
            .catch(err => {
                console.error(err)
            })
            .finally(() => {
                setLoadingId(null)
            })
    }

    useEffect(() => {
        fetchProjects()
    }, [])

    return (
        <main className='min-h-screen bg-slate-950 text-white p-8 relative overflow-hidden'>
            {/* Subtle background glow effects */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            
            <header className="mb-10 relative z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Your Workspace</h1>
                    <p className="text-slate-400 mt-2">Welcome back, {user?.email}</p>
                </div>
                <button 
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-400 rounded-lg transition-all duration-300 group"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Logout</span>
                </button>
            </header>

            <div className="projects grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative z-10">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="project flex flex-col items-center justify-center gap-3 p-6 bg-slate-900/50 backdrop-blur-sm border-2 border-dashed border-slate-700 rounded-xl min-h-[160px] text-slate-400 hover:text-white hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 group cursor-pointer">
                    <div className="w-12 h-12 bg-slate-800 group-hover:bg-blue-600/20 rounded-full flex items-center justify-center transition-colors">
                        <Plus size={24} className="group-hover:text-blue-400" />
                    </div>
                    <span className="font-semibold tracking-wide">New Project</span>
                </button>

                {
                    (project || [])?.map((p) => {
                        if (!p) return null;
                        return (
                        <div key={p._id}
                            onClick={() => {
                                navigate(`/project/${p._id}`, {
                                    state: { project: p }
                                })
                            }}
                            className="project group flex flex-col gap-4 cursor-pointer p-6 bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl min-h-[160px] hover:bg-slate-800/60 hover:border-slate-600 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 relative overflow-hidden">
                            
                            {/* Decorative top border line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 to-slate-800 group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300"></div>

                            <div className="flex justify-between items-start">
                                <h2 className='font-bold text-xl truncate pr-6'>{p.name || 'Untitled Project'}</h2>
                                <button 
                                    onClick={(e) => deleteProject(e, p._id)}
                                    disabled={loadingId === p._id}
                                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="mt-auto flex items-center gap-2 text-slate-400 text-sm">
                                <div className="flex bg-slate-800/80 px-3 py-1.5 rounded-full items-center gap-2 border border-slate-700">
                                    <Users size={14} className="text-blue-400" />
                                    <span>{p.users?.length || 0} {(p.users?.length || 0) === 1 ? 'member' : 'members'}</span>
                                </div>
                            </div>
                        </div>
                    )})
                }
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                        <h2 className="text-2xl font-bold mb-6">Create New Project</h2>
                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}
                        <form onSubmit={createProject}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Project Name</label>
                                <input
                                    onChange={(e) => setProjectName(e.target.value)}
                                    value={projectName}
                                    autoFocus
                                    type="text" 
                                    placeholder="e.g. My Awesome App"
                                    className="block w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-600" required />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors rounded-lg font-medium" onClick={() => { setIsModalOpen(false); setError(null); }}>Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 transition-all">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Home