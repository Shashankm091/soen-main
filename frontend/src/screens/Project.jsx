import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer'
import Editor from '@monaco-editor/react';
import { Panel, Group, Separator } from "react-resizable-panels";
import { Send, Users, X, Code, Play, Check, Copy, Terminal, MonitorPlay, MessageSquare, Plus, Loader2, Pencil } from 'lucide-react';

const getFileLanguage = (filename) => {
    if(!filename) return "javascript";
    const ext = filename.split('.').pop();
    switch(ext) {
        case 'html': return 'html';
        case 'css': return 'css';
        case 'js': case 'jsx': return 'javascript';
        case 'json': return 'json';
        case 'ts': case 'tsx': return 'typescript';
        case 'md': return 'markdown';
        default: return 'javascript';
    }
}

function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current)
            ref.current.removeAttribute('data-highlighted')
        }
    }, [ props.className, props.children ])

    return <code {...props} ref={ref} />
}

function resolveWebContainerTree(fileTree) {
    const wcTree = {}
    for (const [path, data] of Object.entries(fileTree)) {
        const parts = path.split('/');
        let current = wcTree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                current[part] = data;
            } else {
                if (!current[part]) {
                    current[part] = { directory: {} };
                }
                current = current[part].directory;
            }
        }
    }
    return wcTree;
}

const Project = () => {

    const location = useLocation()
    const navigate = useNavigate()

    const [ isSidePanelOpen, setIsSidePanelOpen ] = useState(false)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ selectedUserId, setSelectedUserId ] = useState(new Set())
    const [ project, setProject ] = useState(location?.state?.project || null)
    const [ message, setMessage ] = useState('')
    const { user } = useContext(UserContext)
    const messageBox = useRef(null)

    const [ users, setUsers ] = useState([])
    const [ messages, setMessages ] = useState([])
    const [ fileTree, setFileTree ] = useState({})

    const [ currentFile, setCurrentFile ] = useState(null)
    const [ openFiles, setOpenFiles ] = useState([])

    const [ webContainer, setWebContainer ] = useState(null)
    const [ iframeUrl, setIframeUrl ] = useState(null)
    const [ webContainerLogs, setWebContainerLogs ] = useState([])

    const [ runProcess, setRunProcess ] = useState(null)

    const [ isAiGenerating, setIsAiGenerating ] = useState(false);
    const [ typingUsers, setTypingUsers ] = useState(new Set());
    const [ onlineUsers, setOnlineUsers ] = useState(new Set());
    const typingTimeout = useRef(null);
    const [ copiedFile, setCopiedFile ] = useState(null);
    const [ showPreview, setShowPreview ] = useState(false);
    const [ isRunning, setIsRunning ] = useState(false);
    const [ searchQuery, setSearchQuery ] = useState('');

    const handleUserClick = (id) => {
        setSelectedUserId(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function addCollaborators() {
        axios.put("/projects/add-user", {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            setProject(res.data.project);
            setSelectedUserId(new Set());
            setIsModalOpen(false)
        }).catch(err => {
            console.log(err)
        })
    }

    const send = () => {
        if (!message.trim()) return;
        const messageData = {
            message,
            sender: user,
            timestamp: new Date().toISOString()
        };
        sendMessage('project-message', messageData)
        setMessages(prev => [ ...prev, messageData ])
        setMessage("")
        sendMessage('stop_typing', { email: user.email });
        scrollToBottom();
    }

    const handleMessageChange = (e) => {
        setMessage(e.target.value);
        sendMessage('typing', { email: user.email });
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            sendMessage('stop_typing', { email: user.email });
        }, 1500);
    }

    function WriteAiMessage(message) {
        let messageObject = null
        try {
            messageObject = JSON.parse(message)
        } catch {
            try {
                const firstBrace = message.indexOf('{');
                const lastBrace = message.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    const jsonStr = message.substring(firstBrace, lastBrace + 1);
                    messageObject = JSON.parse(jsonStr)
                } else {
                    throw new Error("No JSON found")
                }
            } catch (err) {
                return (
                    <div className='bg-slate-800 text-slate-200 rounded p-3 text-sm'>
                        <p>{message}</p>
                    </div>
                )
            }
        }

        return (
            <div className='bg-slate-800 text-slate-200 rounded p-3 text-sm'>
                <Markdown
                    children={messageObject.text}
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode,
                        },
                    }}
                />
            </div>
        )
    }

    useEffect(() => {
        if (!project?._id) return;
        initializeSocket(project._id)

        if (!webContainer) {
            getWebContainer().then(container => {
                setWebContainer(container)
                console.log("container started")
            })
        }

        receiveMessage('online-users', (users) => {
            setOnlineUsers(new Set(users));
        });

        receiveMessage('typing', (data) => {
            setTypingUsers(prev => new Set([...prev, data.email]));
        });

        receiveMessage('stop_typing', (data) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(data.email);
                return next;
            });
        });

        receiveMessage('ai-typing', (data) => {
            setIsAiGenerating(data.isTyping);
            scrollToBottom();
        });

        receiveMessage('project-message', data => {
            if (data.sender._id == 'ai') {
                try {
                    let message = null;
                    try {
                        message = JSON.parse(data.message)
                    } catch {
                        const firstBrace = data.message.indexOf('{');
                        const lastBrace = data.message.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                            const jsonStr = data.message.substring(firstBrace, lastBrace + 1);
                            message = JSON.parse(jsonStr)
                        } else {
                            throw new Error("No JSON found")
                        }
                    }

                    if (message.fileTree) {
                        setFileTree(prev => ({ ...prev, ...message.fileTree }))
                        const generatedFiles = Object.keys(message.fileTree);
                        if (generatedFiles.length > 0) {
                            setCurrentFile(generatedFiles[0]);
                            setOpenFiles(prev => [...new Set([...prev, ...generatedFiles])]);
                        }
                        
                        // Automatically run
                        setIsRunning(true);
                        setShowPreview(true);
                        setWebContainerLogs([]);
                        
                        getWebContainer().then(async (container) => {
                            const wcTree = resolveWebContainerTree(message.fileTree)
                            await container.mount(wcTree)
                            
                            setRunProcess((prev) => {
                                if (prev) prev.kill()
                                return null;
                            })

                            let tempRunProcess;
                            
                            if ('package.json' in message.fileTree) {
                                const buildCmd = message.buildCommand || { mainItem: "npm", commands: ["install"] };
                                const startCmd = message.startCommand || { mainItem: "npm", commands: ["start"] };

                                setWebContainerLogs(prev => [...prev, `\n$ ${buildCmd.mainItem} ${buildCmd.commands.join(' ')}\n`]);
                                const installProcess = await container.spawn(buildCmd.mainItem, buildCmd.commands)
                                installProcess.output.pipeTo(new WritableStream({
                                    write(chunk) {
                                        setWebContainerLogs(prev => [...prev, chunk]);
                                    }
                                }))

                                const installExitCode = await installProcess.exit;
                                if (installExitCode !== 0) {
                                    setWebContainerLogs(prev => [...prev, `\nBuild failed with code ${installExitCode}\n`]);
                                    setIsRunning(false);
                                    return; 
                                }

                                setWebContainerLogs(prev => [...prev, `\n$ ${startCmd.mainItem} ${startCmd.commands.join(' ')}\n`]);
                                tempRunProcess = await container.spawn(startCmd.mainItem, startCmd.commands);
                            } else {
                                setWebContainerLogs(prev => [...prev, `\n$ npx -y serve .\n`]);
                                tempRunProcess = await container.spawn("npx", ["-y", "serve", "."]);
                            }

                            tempRunProcess.output.pipeTo(new WritableStream({
                                write(chunk) {
                                    setWebContainerLogs(prev => [...prev, chunk]);
                                }
                            }))
                            setRunProcess(tempRunProcess)

                            tempRunProcess.exit.then((code) => {
                                if (code !== 0) {
                                    setWebContainerLogs(prev => [...prev, `\nContainer process exited with code ${code}\n`]);
                                }
                                setIsRunning(false);
                            });

                            container.on('server-ready', (port, url) => {
                                setIframeUrl(url)
                                setIsRunning(false);
                            })
                        })
                    }
                } catch (err) {
                    console.error("Failed to parse AI message JSON:", err)
                }
            }
            setMessages(prev => [ ...prev, data ])
            setTimeout(scrollToBottom, 50);
        })

        if (location?.state?.project?._id) {
            axios.get(`/projects/get-project/${location.state.project._id}`).then(res => {
                setProject(res.data.project)
                const ft = res.data.project.fileTree || {};
                setFileTree(ft)
                const files = Object.keys(ft);
                setOpenFiles(files);
                if (files.length > 0) {
                    setCurrentFile(files[0]);
                }
            })

            axios.get(`/projects/get-messages/${location.state.project._id}`).then(res => {
                setMessages(res.data.messages || [])
                setTimeout(scrollToBottom, 100);
            }).catch(err => console.error("Error fetching messages:", err))
        }

        axios.get('/users/all').then(res => {
            setUsers(res.data.users)
        }).catch(err => console.log(err))

    }, [])

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).catch(err => console.log(err))
    }

    function deleteFile(filename) {
        if (!window.confirm("Are you sure you want to delete this file?")) return;
        const ft = { ...fileTree };
        delete ft[filename];
        setFileTree(ft);
        saveFileTree(ft);
        const newOpenFiles = openFiles.filter(f => f !== filename);
        setOpenFiles(newOpenFiles);
        if (currentFile === filename) {
            setCurrentFile(newOpenFiles.length > 0 ? newOpenFiles[0] : null);
        }
    }

    function renameFile(oldName) {
        const newName = window.prompt("Enter new file name:", oldName);
        if (!newName || newName === oldName) return;

        if (fileTree[newName]) {
            alert("A file with that name already exists!");
            return;
        }

        const ft = { ...fileTree };
        ft[newName] = ft[oldName];
        delete ft[oldName];
        setFileTree(ft);
        saveFileTree(ft);

        const newOpenFiles = openFiles.map(f => f === oldName ? newName : f);
        setOpenFiles(newOpenFiles);
        if (currentFile === oldName) {
            setCurrentFile(newName);
        }
    }

    function scrollToBottom() {
        if(messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight
        }
    }

    function getIframeUrl() {
        if (!iframeUrl) return null;
        if (!('package.json' in fileTree) && currentFile && currentFile.endsWith('.html')) {
            return `${iframeUrl}/${currentFile}`;
        }
        return iframeUrl;
    }

    async function handleRunCode() {
        try {
            setShowPreview(true);
            setIsRunning(true);
            setWebContainerLogs([]);
            setIframeUrl(null);
            
            const container = await getWebContainer()
            const wcTree = resolveWebContainerTree(fileTree)
            await container.mount(wcTree)

            setRunProcess((prev) => {
                if (prev) prev.kill()
                return null;
            })

            let tempRunProcess;
            if ('package.json' in fileTree) {
                setWebContainerLogs(prev => [...prev, `\n$ npm install\n`]);
                const installProcess = await container.spawn("npm", [ "install" ])

                installProcess.output.pipeTo(new WritableStream({
                    write(chunk) {
                        setWebContainerLogs(prev => [...prev, chunk]);
                    }
                }))

                const installExitCode = await installProcess.exit;
                if (installExitCode !== 0) {
                    setWebContainerLogs(prev => [...prev, `\nBuild process failed with code ${installExitCode}\n`]);
                    setIsRunning(false);
                    return;
                }

                setWebContainerLogs(prev => [...prev, `\n$ npm start\n`]);
                tempRunProcess = await container.spawn("npm", [ "start" ]);
            } else {
                setWebContainerLogs(prev => [...prev, `\n$ npx -y serve .\n`]);
                tempRunProcess = await container.spawn("npx", [ "-y", "serve", "." ]);
            }

            tempRunProcess.output.pipeTo(new WritableStream({
                write(chunk) {
                    setWebContainerLogs(prev => [...prev, chunk]);
                }
            }))
            setRunProcess(tempRunProcess)

            tempRunProcess.exit.then((code) => {
                if (code !== 0) {
                    setWebContainerLogs(prev => [...prev, `\nContainer process exited with code ${code}\n`]);
                }
                setIsRunning(false);
            });

            container.on('server-ready', (port, url) => {
                setIframeUrl(url)
                setIsRunning(false);
            })
        } catch (err) {
            setWebContainerLogs(prev => [...prev, `\nError: ${err.message}\n`]);
            setIsRunning(false);
        }
    }

    return (
        <main className='h-screen w-screen flex bg-slate-950 text-slate-200 overflow-hidden font-sans'>
            {!project ? (
                <div className="flex items-center justify-center w-full h-full text-slate-400 flex-col gap-4">
                    <Loader2 size={48} className="animate-spin text-blue-500" />
                    <p>Loading project workspace...</p>
                </div>
            ) : (
            <>
            {/* Header/Nav */}
            <div className="absolute top-0 left-0 w-full h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-20 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="hover:text-white text-slate-400 transition-colors flex items-center gap-2 text-sm font-semibold">
                        <i className="ri-arrow-left-s-line text-lg"></i>
                        Dashboard
                    </button>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-wide">{project.name}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsModalOpen(true)} className='flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-800 text-sm font-medium transition-colors text-slate-300 hover:text-white border border-transparent hover:border-slate-700'>
                        <Plus size={16} /> Add Member
                    </button>
                    <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className={`p-2 rounded-md transition-colors ${isSidePanelOpen ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
                        <Users size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full h-full pt-12">
                <Group orientation="horizontal" className="w-full h-full">
                    
                    {/* Chat Panel */}
                    <Panel defaultSize={25} minSize={20} className="bg-[#0b141a] flex flex-col h-full border-r border-slate-800 relative z-10">
                        <div className="p-3 bg-[#202c33] border-b border-[#313d45] flex items-center gap-3">
                            <MessageSquare size={18} className="text-[#00a884]"/>
                            <h2 className="font-semibold text-[#e9edef]">Project Chat</h2>
                        </div>
                        
                        <div ref={messageBox} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-[#374045] scrollbar-track-transparent">
                            {messages?.map((msg, index) => {
                                const isMe = msg?.sender?._id === user?._id?.toString();
                                const isAi = msg?.sender?._id === 'ai';
                                
                                return (
                                    <div key={index} className={`flex flex-col w-fit max-w-[85%] ${isMe ? 'ml-auto items-end' : 'items-start'}`}>
                                        {!isMe && <span className="text-xs text-[#8696a0] mb-1 ml-1 font-medium">{msg?.sender?.email || 'Unknown'}</span>}
                                        <div className={`p-2.5 px-3.5 rounded-2xl relative shadow-sm ${
                                            isMe 
                                                ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-sm' 
                                                : isAi 
                                                    ? 'bg-[#1f2c34] text-[#e9edef] rounded-tl-sm border border-purple-900/40 shadow-[0_0_15px_rgba(147,51,234,0.1)]' 
                                                    : 'bg-[#202c33] text-[#e9edef] rounded-tl-sm'
                                            }`}>
                                            <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                                                {isAi ? WriteAiMessage(msg?.message) : msg?.message}
                                            </div>
                                            <span className="text-[10px] text-white/50 block text-right mt-1 font-mono">
                                                {(msg?.timestamp || msg?.createdAt) ? new Date(msg?.timestamp || msg?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                {isMe && <Check size={12} className="inline-block ml-1 text-[#53bdeb]"/>}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                            
                            <div className="h-4"></div> {/* Bottom padding spacer */}
                        </div>

                        {/* Typing Indicators */}
                        <div className="absolute bottom-[68px] left-4 right-4 pointer-events-none z-10">
                            {Array.from(typingUsers).length > 0 && 
                                <span className="bg-[#202c33] text-[#00a884] text-xs px-3 py-1.5 rounded-full shadow-md animate-pulse font-medium inline-block">
                                    {Array.from(typingUsers).join(', ')} is typing...
                                </span>
                            }
                            {isAiGenerating && 
                                <span className="bg-[#1f2c34] text-purple-400 text-xs px-3 py-1.5 rounded-full shadow-md animate-pulse border border-purple-900/30 font-medium inline-flex items-center gap-2 mt-1">
                                    <Terminal size={12}/> AI analyzing and building logic...
                                </span>
                            }
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-[#202c33] border-t border-[#313d45] flex items-end gap-2 shrink-0">
                            <textarea
                                value={message}
                                onChange={handleMessageChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                rows={1}
                                className='w-full bg-[#2a3942] text-[#d1d7db] rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[#00a884] resize-none max-h-32 placeholder-[#8696a0] transition-all text-[15px]' 
                                placeholder='Type a message or ping @ai for code...' 
                            />
                            <button
                                onClick={send}
                                disabled={!message.trim() && !isAiGenerating}
                                className='w-12 h-12 shrink-0 bg-[#00a884] hover:bg-[#00c298] disabled:bg-[#2a3942] disabled:text-[#8696a0] text-slate-900 flex items-center justify-center rounded-full transition-colors cursor-pointer shadow-md'>
                                <Send size={18} className="translate-x-[1px] translate-y-[-1px]"/>
                            </button>
                        </div>
                    </Panel>

                    <Separator className="w-1 bg-slate-800 hover:bg-blue-500 cursor-col-resize transition-colors" />

                    {/* Editor & Explorer Panel */}
                    <Panel defaultSize={showPreview ? 35 : 75} className="flex flex-col bg-[#1e1e1e] relative min-w-0">
                        {/* Editor Tabs & Actions Bar */}
                        <div className="flex bg-[#252526] border-b border-black overflow-x-auto overflow-y-hidden shrink-0 h-10 scrollbar-hide">
                            <div className="flex-1 flex min-w-0">
                                {openFiles?.length === 0 && <div className="text-slate-500 text-xs px-4 py-2 italic flex items-center">No files open. Ask @ai to generate some.</div>}
                                {openFiles?.map((file, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setCurrentFile(file)}
                                        className={`group px-4 py-2 flex items-center gap-2 border-r border-[#1e1e1e] text-sm whitespace-nowrap min-w-24 cursor-pointer ${currentFile === file ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-t-blue-500' : 'bg-[#2d2d2d] text-slate-400 hover:bg-[#353535]'}`}>
                                        <Code size={14} className={currentFile === file ? 'text-blue-500' : 'text-slate-500'}/>
                                        {file}
                                        <button onClick={(e) => { e.stopPropagation(); renameFile(file); }} className="opacity-0 group-hover:opacity-100 hover:text-blue-400 p-1 transition-opacity ml-1" title="Rename file">
                                            <Pencil size={12} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteFile(file); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity" title="Delete file">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex items-center px-2 shrink-0 border-l border-black ml-auto bg-[#333333]">
                                <button 
                                    onClick={() => {
                                        if (isRunning) {
                                            if (runProcess) runProcess.kill();
                                            setIsRunning(false);
                                            setWebContainerLogs(prev => [...prev, `\nProcess completely terminated by user.\n`]);
                                        } else {
                                            handleRunCode();
                                        }
                                    }}
                                    disabled={!fileTree || Object.keys(fileTree).length === 0}
                                    className={`flex items-center gap-2 px-3 py-1 text-white rounded text-xs font-bold transition-all mx-1 shadow-sm ${isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-[#107c10] hover:bg-[#0e6d0e] disabled:bg-slate-700 disabled:text-slate-400'}`}>
                                    {isRunning ? <X size={14} /> : <Play size={14} />}
                                    {isRunning ? "Stop Output" : "Run Output"}
                                </button>
                                <button 
                                    onClick={() => setShowPreview(!showPreview)}
                                    className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-all ml-1 ${showPreview ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                                    <MonitorPlay size={14} />
                                    {showPreview ? "Hide Preview" : "Split Preview"}
                                </button>
                            </div>
                        </div>

                        {/* Editor Body */}
                        <div className="flex-1 overflow-hidden relative">
                            {currentFile && fileTree[currentFile] ? (
                                <>
                                    <button 
                                        className="absolute top-4 right-6 z-10 p-1.5 px-3 bg-[#333] hover:bg-[#444] text-[#ccc] border border-[#555] rounded text-xs flex items-center gap-1 transition-all opacity-50 hover:opacity-100"
                                        onClick={() => {
                                            navigator.clipboard.writeText(fileTree[currentFile].file.contents);
                                            setCopiedFile(currentFile);
                                            setTimeout(() => setCopiedFile(null), 2000);
                                        }}
                                    >
                                        {copiedFile === currentFile ? <><Check size={14} className="text-green-500"/> Copied!</> : <><Copy size={14}/> Copy File</>}
                                    </button>
                                    <Editor
                                        height="100%"
                                        theme="vs-dark"
                                        language={getFileLanguage(currentFile)}
                                        value={fileTree[currentFile].file.contents}
                                        onChange={(value) => {
                                            const ft = {
                                                ...fileTree,
                                                [currentFile]: {
                                                    file: { contents: value }
                                                }
                                            }
                                            setFileTree(ft)
                                            saveFileTree(ft)
                                        }}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            wordWrap: "on",
                                            padding: { top: 16 }
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 select-none bg-auto bg-center opacity-50">
                                    <Code size={64} className="mb-4 text-slate-700"/>
                                    <h2 className="text-xl font-bold">No file selected</h2>
                                    <p className="max-w-xs text-center mt-2 text-sm">Ask the AI in the chat to generate a codebase to start evaluating!</p>
                                </div>
                            )}
                        </div>
                    </Panel>

                    {/* Conditional Preview Panel */}
                    {showPreview && (
                        <>
                            <Separator className="w-1 bg-slate-800 hover:bg-blue-500 cursor-col-resize shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] transition-colors" />
                            <Panel defaultSize={40} className="flex flex-col bg-slate-900 border-l border-black overflow-hidden relative">
                                <div className="h-10 bg-slate-800 border-b border-slate-700 flex flex-col justify-center px-4 shrink-0 shadow-sm z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MonitorPlay size={15} className="text-blue-400"/>
                                            <span className="text-xs font-semibold tracking-wider text-slate-300">LIVE PREVIEW</span>
                                        </div>
                                        <div className="flex items-center gap-2 w-1/2 max-w-[300px]">
                                            <input 
                                                type="text" 
                                                value={getIframeUrl() || 'Starting container...'} 
                                                readOnly
                                                className="w-full bg-slate-950 border border-slate-700 text-slate-400 text-xs px-2 py-1 rounded truncate outline-none select-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white relative">
                                    {iframeUrl ? (
                                        <iframe src={getIframeUrl()} className="w-full h-full border-none" sandbox="allow-scripts allow-forms allow-popups allow-same-origin"></iframe>
                                    ) : (
                                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-500">
                                            {isRunning ? (
                                                <>
                                                    <Loader2 size={40} className="animate-spin text-blue-500 mb-4"/>
                                                    <p className="font-semibold tracking-wide">Building & Running container...</p>
                                                    <p className="text-xs mt-2 max-w-[250px] text-center opacity-70">Check the terminal below for detailed output logs.</p>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center">
                                                    <MonitorPlay size={48} className="text-slate-700 mb-4 opacity-50"/>
                                                    <p>Click "Run Output" to spin up the container.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Integrated Terminal inside Preview Pane */}
                                <div className="h-[30%] min-h-[150px] bg-[#1e1e1e] border-t border-slate-950 flex flex-col select-text shrink-0">
                                    <div className="h-8 bg-[#252526] uppercase flex items-center px-4 text-[11px] font-bold text-slate-400 tracking-wider">
                                        Terminal Logs
                                    </div>
                                    <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed text-[#00ff00] break-words">
                                        <pre className="whitespace-pre-wrap">{webContainerLogs.join('')}</pre>
                                        <div className="h-4"></div>
                                    </div>
                                </div>
                            </Panel>
                        </>
                    )}

                </Group>
            </div>

            {/* Side Panel for Collaborators */}
            <div className={`fixed top-12 right-0 w-80 h-[calc(100vh-48px)] bg-slate-900 border-l border-slate-800 shadow-2xl transition-transform duration-300 z-50 ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className='flex justify-between items-center p-4 border-b border-slate-800'>
                    <h2 className='font-bold flex items-center gap-2'><Users size={18} className="text-blue-500"/> Project Members</h2>
                    <button onClick={() => setIsSidePanelOpen(false)} className='p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors'>
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-full">
                    {project?.users && project?.users.map(u => {
                        const emailStr = u?.email || "Unknown User";
                        const isOnline = onlineUsers.has(emailStr);
                        return (
                            <div key={u?._id || u} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                                <div className='relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md'>
                                    {emailStr.charAt(0).toUpperCase()}
                                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className='font-semibold text-sm truncate text-white'>{emailStr}</h3>
                                    <p className="text-xs text-slate-400">{isOnline ? 'Online now' : 'Offline'}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Add Collaborator Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-full max-w-md">
                        <header className='flex justify-between items-center mb-6'>
                            <h2 className='text-xl font-bold'>Invite Members</h2>
                            <button onClick={() => setIsModalOpen(false)} className='p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded-md transition-colors'>
                                <X size={20} />
                            </button>
                        </header>
                        
                        <div className="mb-4">
                            <input 
                                type="email" 
                                placeholder="Search member by Gmail ID..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#1f2937] border border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2 mb-8 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                            {users?.filter(u => u?.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                                <div key={u?._id || u} 
                                    className={`cursor-pointer border border-transparent rounded-lg p-3 flex gap-3 items-center transition-all ${selectedUserId.has(u?._id) ? 'bg-blue-600/10 border-blue-500/50' : 'hover:bg-slate-800'}`} 
                                    onClick={() => handleUserClick(u?._id)}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${selectedUserId.has(u?._id) ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                        {u?.email?.charAt(0).toUpperCase() || <Users size={16}/>}
                                    </div>
                                    <div className="flex-1">
                                        <h1 className='font-semibold text-[15px]'>{u?.email}</h1>
                                    </div>
                                    {selectedUserId.has(u?._id) && <Check size={18} className="text-blue-500"/>}
                                </div>
                            ))}
                            {users?.filter(u => u?.email?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                <div className="text-slate-500 text-center py-6 px-4 bg-slate-800/30 rounded-lg border border-slate-800 border-dashed">
                                    <p className="font-medium text-slate-400 mb-1">No users found.</p>
                                    <p className="text-xs">If you want to invite a friend via Gmail, they must first quickly register an account on this app's Login screen!</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className='px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded font-medium transition-colors'>Cancel</button>
                            <button onClick={addCollaborators} disabled={selectedUserId.size === 0} className='px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-medium shadow-md transition-colors'>
                                Invite to Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Overlay for Side Panel */}
            {isSidePanelOpen && (
                <div onClick={() => setIsSidePanelOpen(false)} className="fixed inset-0 bg-black/20 z-40 lg:hidden"></div>
            )}
            </>
            )}
        </main>
    )
}

export default Project