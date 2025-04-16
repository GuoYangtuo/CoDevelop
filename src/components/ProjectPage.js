import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Navigate } from 'react-router-dom';
import MindMap from './MindMap';
import Auth from './Auth';
import './ProjectPage.css';

const ProjectPage = () => {
    const { projectId } = useParams();
    const [mindmaps, setMindmaps] = useState([]);
    const [selectedMindmap, setSelectedMindmap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAuth, setShowAuth] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [projectExists, setProjectExists] = useState(true);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [updateLogs, setUpdateLogs] = useState({});

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
        loadMindmaps();
    }, [projectId]);

    const loadMindmaps = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/projects/${projectId}/mindmaps`);
            setMindmaps(response.data);
            
            // 自动选择第一个导图
            if (response.data.length > 0 && !selectedMindmap) {
                setSelectedMindmap(response.data[0].id);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Failed to load mindmaps:', error);
            if (error.response && error.response.status === 404) {
                setProjectExists(false);
            }
            setLoading(false);
        }
    };

    const loadUpdateLogs = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/projects/${projectId}/updateLogs`);
            setUpdateLogs(response.data);
        } catch (error) {
            console.error('Failed to load update logs:', error);
        }
    };

    const handleLogin = (userData) => {
        setCurrentUser(userData);
        setShowAuth(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setCurrentUser(null);
    };

    const createNewMindmap = async () => {
        if (!currentUser || (currentUser.id !== 'admin' && !currentUser.isAdmin)) {
            alert('只有管理员可以创建思维导图');
            return;
        }

        const name = prompt('输入思维导图名称:');
        if (name) {
            try {
                await axios.post(`http://localhost:3001/api/projects/${projectId}/mindmaps/${name}`, {
                    nodes: [],
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.id,
                    creatorName: currentUser.username
                });
                loadMindmaps();
                setSelectedMindmap(name);
            } catch (error) {
                console.error('Failed to create mindmap:', error);
            }
        }
    };

    const handleDownloadClick = () => {
        setShowDownloadModal(true);
        loadUpdateLogs();
    };

    const downloadLatestRelease = () => {
        window.open(`http://localhost:3001/api/projects/${projectId}/download`, '_blank');
    };

    if (loading) return <div className="loading">加载中...</div>;
    
    if (!projectExists) {
        return <Navigate to="/" />;
    }

    return (
        <div className="project-page">
            <div className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <button
                    className="toggle-button"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                    {sidebarCollapsed ? '+' : '-'}
                </button>
                <button
                    className="download-button"
                    onClick={handleDownloadClick}
                >
                    <span role="img" aria-label="download">💾</span>
                </button>
            </div>
            
            {!sidebarCollapsed && (
                <div className="sidebar">
                    <div className="sidebar-header">
                        <button
                            className="auth-button"
                            onClick={() => currentUser ? handleLogout() : setShowAuth(true)}
                        >
                            {currentUser ? `退出 (${currentUser.username})` : '登录/注册'}
                        </button>
                    </div>
                    <h2>项目: {projectId}</h2>
                    {currentUser && (currentUser.id === 'admin' || currentUser.isAdmin) && (
                        <button onClick={createNewMindmap}>新建思维导图</button>
                    )}
                    <ul>
                        {mindmaps.map(mindmap => (
                            <li
                                key={mindmap.id}
                                className={selectedMindmap === mindmap.id ? 'selected' : ''}
                                onClick={() => setSelectedMindmap(mindmap.id)}
                            >
                                {mindmap.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
                {selectedMindmap ? (
                    <MindMap
                        mindmapId={selectedMindmap}
                        projectId={projectId}
                        currentUser={currentUser}
                    />
                ) : (
                    <div className="welcome">
                        <h2>欢迎使用思维导图</h2>
                        <p>从侧边栏选择一个思维导图或创建一个新的</p>
                        {(!currentUser || currentUser.id === 'guest') && (
                            <button className="welcome-auth-button" onClick={() => setShowAuth(true)}>
                                登录/注册
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {showAuth && (
                <Auth 
                    onLogin={handleLogin} 
                    onClose={() => setShowAuth(false)} 
                />
            )}

            {showDownloadModal && (
                <div className="modal" onClick={() => setShowDownloadModal(false)}>
                    <div className="download-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setShowDownloadModal(false)}>×</button>
                        <h3>下载项目: {projectId}</h3>
                        
                        <div className="download-section">
                            <button 
                                className="download-action-button" 
                                onClick={downloadLatestRelease}
                            >
                                下载最新版本
                            </button>
                        </div>
                        
                        <div className="update-logs-section">
                            <h4>更新日志</h4>
                            {Object.keys(updateLogs).length > 0 ? (
                                <div className="update-logs-list">
                                    {Object.entries(updateLogs).map(([version, changes]) => (
                                        <div key={version} className="version-entry">
                                            <h5>版本 {version}</h5>
                                            <ul>
                                                {changes.map((change, index) => (
                                                    <li key={index}>{change}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-logs">暂无更新日志</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectPage; 