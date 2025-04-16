import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './MindMap.css';

const NODE_TYPES = {
  PERFORMANCE: '性能优化',
  FEATURE: '功能实现',
  REFACTOR: '代码重构',
  BUGFIX: 'bug修复'
};

const MindMap = ({ mindmapId, projectId = 'gameA', currentUser }) => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [showNodeModal, setShowNodeModal] = useState(false);
    const [newNodeText, setNewNodeText] = useState('');
    const [parentId, setParentId] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const [showLegend, setShowLegend] = useState(false);
    const [editedNodeName, setEditedNodeName] = useState('');
    const [editedNodeDetails, setEditedNodeDetails] = useState('');
    const [newNodeType, setNewNodeType] = useState('FEATURE');
    const [newNodeIsCategory, setNewNodeIsCategory] = useState(false);
    const [newNodeAmount, setNewNodeAmount] = useState(0);
    const mindmapRef = useRef(null);
    const nodeDetailsRef = useRef(null);
    
    // 捐赠相关状态
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [donationAmount, setDonationAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('alipay');
    const [donationPeriod, setDonationPeriod] = useState(30); // 默认一个月(30天)

    useEffect(() => {
        if (mindmapId) {
            loadMindMap();
        }
    }, [mindmapId, projectId]);

    useEffect(() => {
        if (selectedNode) {
            setEditedNodeName(selectedNode.text);
            setEditedNodeDetails(selectedNode.details || '');
        }
    }, [selectedNode]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'h' || e.key === 'H') {
                setShowLegend(true);
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'h' || e.key === 'H') {
                setShowLegend(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleClickOutside = (e) => {
        // 如果点击在节点详情面板内，不要取消选中
        if (nodeDetailsRef.current && nodeDetailsRef.current.contains(e.target)) {
            return;
        }

        if (mindmapRef.current && mindmapRef.current.contains(e.target)) {
            // 如果点击在思维导图区域内但不是节点，取消选中
            if (!e.target.closest('.node')) {
                setSelectedNode(null);
            }
        }
    };

    const loadMindMap = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/projects/${projectId}/mindmaps/${mindmapId}`);
            setNodes(response.data.nodes || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load mindmap:', error);
            setLoading(false);
        }
    };

    const saveMindMap = async () => {
        try {
            await axios.post(`http://localhost:3001/api/projects/${projectId}/mindmaps/${mindmapId}`, { nodes });
            console.log('Mindmap saved successfully');
        } catch (error) {
            console.error('Failed to save mindmap:', error);
        }
    };

    useEffect(() => {
        if (nodes.length > 0) {
            saveMindMap();
        }
    }, [nodes]);

    const addNode = (parentId, text) => {
        if (!currentUser || currentUser.id === 'guest') {
            alert('请登录后再创建节点');
            return;
        }

        const newNode = {
            id: Date.now().toString(),
            text,
            children: [],
            createdAt: new Date().toISOString(),
            createdBy: currentUser.userId,
            creatorName: currentUser?.username || '未知用户',
            details: '',
            isCategory: newNodeIsCategory,
            supporters: {} // 初始化空的支持者列表
        };

        // 只有非分类节点才添加这些属性
        if (!newNodeIsCategory) {
            newNode.amount = parseFloat(newNodeAmount) || 0;
            newNode.type = newNodeType;
        }

        if (!parentId) {
            setNodes([...nodes, newNode]);
        } else {
            const updateNode = (nodeList) => {
                return nodeList.map(node => {
                    if (node.id === parentId) {
                        return {
                            ...node,
                            children: [...node.children, newNode]
                        };
                    }
                    if (node.children) {
                        return {
                            ...node,
                            children: updateNode(node.children)
                        };
                    }
                    return node;
                });
            };

            setNodes(updateNode(nodes));
        }
    };

    const deleteNode = (nodeId) => {
        const deleteNodeRecursive = (nodeList) => {
            return nodeList.filter(node => {
                if (node.id === nodeId) {
                    return false;
                }
                if (node.children) {
                    node.children = deleteNodeRecursive(node.children);
                }
                return true;
            });
        };

        setNodes(deleteNodeRecursive(nodes));
    };

    const updateNode = (nodeId, updates) => {
        const updateNodeRecursive = (nodeList) => {
            return nodeList.map(node => {
                if (node.id === nodeId) {
                    return { ...node, ...updates };
                }
                if (node.children) {
                    return {
                        ...node,
                        children: updateNodeRecursive(node.children)
                    };
                }
                return node;
            });
        };

        setNodes(updateNodeRecursive(nodes));
    };

    const saveNodeChanges = () => {
        if (selectedNode) {
            updateNode(selectedNode.id, {
                text: editedNodeName,
                details: editedNodeDetails
            });
            setSelectedNode({
                ...selectedNode,
                text: editedNodeName,
                details: editedNodeDetails
            });
        }
    };

    const toggleCollapse = (nodeId) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const getNodeTypeColor = (type) => {
        switch (type) {
            case 'PERFORMANCE':
                return 'blue-border';
            case 'FEATURE':
                return 'green-border';
            case 'REFACTOR':
                return 'yellow-border';
            case 'BUGFIX':
                return 'red-border';
            default:
                return '';
        }
    };

    // 检查用户是否有权限编辑节点
    const canEditNode = (node) => {
        console.log(currentUser, node);
        return currentUser && (
            currentUser.id === 'admin' || 
            currentUser.isAdmin || 
            currentUser.username === node.creatorName
        );
    };

    // 处理捐赠功能
    const handleDonate = () => {
        if (!currentUser || currentUser.id === 'guest') {
            alert('请登录后再捐赠');
            return;
        }
        setShowDonateModal(true);
    };

    const submitDonation = () => {
        if (!selectedNode || !currentUser) return;
        
        const amount = parseFloat(donationAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('请输入有效的捐赠金额');
            return;
        }

        const now = new Date();
        // 更新节点的支持者列表
        const updatedSupporters = {
            ...(selectedNode.supporters || {}),
            [currentUser.username]: {
                amount: (selectedNode.supporters?.[currentUser.username]?.amount || 0) + amount,
                date: now.toISOString(),
                period: donationPeriod,
                expireDate: new Date(now.getTime() + donationPeriod * 24 * 60 * 60 * 1000).toISOString()
            }
        };

        // 计算总金额
        const totalAmount = getTotalDonations(updatedSupporters);

        updateNode(selectedNode.id, {
            supporters: updatedSupporters,
            amount: totalAmount
        });

        // 更新选中的节点
        setSelectedNode({
            ...selectedNode,
            supporters: updatedSupporters,
            amount: totalAmount
        });

        setShowDonateModal(false);
        setDonationAmount('');
        
        // 这里应该调用实际的支付API，但我们暂时省略
        alert('捐赠成功，感谢您的支持！');
    };

    const getTotalDonations = (supporters) => {
        if (!supporters) return 0;
        
        return Object.values(supporters).reduce((sum, supporter) => {
            // 如果是旧格式的数据，直接累加数字
            if (typeof supporter === 'number') {
                return sum + supporter;
            }
            // 新格式的数据，累加amount字段
            return sum + (supporter.amount || 0);
        }, 0);
    };

    const getPeriodText = (period) => {
        switch (period) {
            case 30:
                return '一个月';
            case 90:
                return '三个月';
            case 180:
                return '六个月';
            case 365:
                return '一年';
            default:
                return '未知期限';
        }
    };

    const renderNode = (node, level = 0) => {
        const isCollapsed = collapsedNodes.has(node.id);
        const isSelected = selectedNode?.id === node.id;
        const isRoot = level === 0;
        const nodeTypeClass = node.isCategory ? '' : getNodeTypeColor(node.type);
        const hasDetails = node.details && node.details.trim() !== '';

        return (
            <div key={node.id} className={`node-container ${isRoot ? 'root' : ''}`}>
                <div 
                    className={`node ${isSelected ? 'selected' : ''} ${nodeTypeClass}`} 
                    onClick={() => setSelectedNode(node)}
                    data-tooltip={hasDetails ? node.details : null}
                >
                    <div className="node-content">
                        <span className={isRoot ? 'root-text' : ''}>{node.text}</span>
                        <div className="node-actions">
                            {(currentUser && currentUser.id !== 'guest') && (
                                <button
                                    className="action-button add"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setParentId(node.id);
                                        setShowNodeModal(true);
                                    }}
                                >+</button>
                            )}
                            {node.children?.length > 0 && (
                                <button
                                    className="action-button collapse"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCollapse(node.id);
                                    }}
                                >{isCollapsed ? '+' : '-'}</button>
                            )}
                            {canEditNode(node) && (
                                <button
                                    className="action-button delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setNodeToDelete(node);
                                        setShowConfirmModal(true);
                                    }}
                                >×</button>
                            )}
                        </div>
                    </div>
                    <div className="info-container">{!node.isCategory && node.amount > 0 && (
                        <div className="node-amount">¥{node.amount.toLocaleString()}</div>
                    )}
                    <label className="node-creator">{node.creatorName}</label>
                    <label className="node-createdAt">{new Date(node.createdAt).toLocaleString()}</label>
                    </div>
                    
                </div>
                {!isCollapsed && node.children && (
                    <div className="children">
                        {node.children.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="loading">加载中...</div>;

    return (
        <div 
            className="mindmap" 
            onClick={handleClickOutside} 
            ref={mindmapRef}
        >
            
            {nodes.map(node => renderNode(node))}
            
            <div className="controls">
                {(currentUser && currentUser.id !== 'guest') && (
                    <button onClick={() => {
                        setParentId(null);
                        setShowNodeModal(true);
                    }}>添加根节点</button>
                )}
            </div>
            {showNodeModal && (
                <div className="modal" onClick={() => setShowNodeModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setShowNodeModal(false)}>×</button>
                        <h3>添加新节点</h3>
                        <div className="form-group">
                            <label>节点名称</label>
                            <input
                                type="text"
                                value={newNodeText}
                                onChange={(e) => setNewNodeText(e.target.value)}
                                placeholder="输入节点名称"
                            />
                        </div>
                        <div className="form-group checkbox">
                            <input
                                type="checkbox"
                                id="isCategory"
                                checked={newNodeIsCategory}
                                onChange={(e) => setNewNodeIsCategory(e.target.checked)}
                            />
                            <label htmlFor="isCategory">是分类节点</label>
                        </div>
                        {!newNodeIsCategory && (
                            <>
                                <div className="form-group">
                                    <label>节点类型</label>
                                    <select value={newNodeType} onChange={e => setNewNodeType(e.target.value)}>
                                        <option value="PERFORMANCE">性能优化</option>
                                        <option value="FEATURE">功能实现</option>
                                        <option value="REFACTOR">代码重构</option>
                                        <option value="BUGFIX">bug修复</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div className="modal-actions">
                            <button onClick={() => {
                                if (newNodeText.trim()) {
                                    addNode(parentId, newNodeText.trim());
                                    setNewNodeText('');
                                    setNewNodeType('FEATURE');
                                    setNewNodeIsCategory(false);
                                    setNewNodeAmount(0);
                                    setShowNodeModal(false);
                                }
                            }}>确定</button>
                            <button onClick={() => setShowNodeModal(false)}>取消</button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmModal && (
                <div className="modal" onClick={() => setShowConfirmModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setShowConfirmModal(false)}>×</button>
                        <h3>确认删除</h3>
                        <p>确定要删除节点 "{nodeToDelete?.text}" 及其所有子节点吗？</p>
                        <div className="modal-actions">
                            <button onClick={() => {
                                deleteNode(nodeToDelete.id);
                                setShowConfirmModal(false);
                                setNodeToDelete(null);
                                if (selectedNode && selectedNode.id === nodeToDelete.id) {
                                    setSelectedNode(null);
                                }
                            }}>确定</button>
                            <button onClick={() => {
                                setShowConfirmModal(false);
                                setNodeToDelete(null);
                            }}>取消</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedNode && (
                <div className="node-details" ref={nodeDetailsRef}>
                    <h3>{selectedNode.text}</h3>
                    <div className="detail-item">
                        <label>创建者:</label>
                        <span>{selectedNode.creatorName || selectedNode.createdBy}</span>
                    </div>
                    <div className="detail-item">
                        <label>创建时间:</label>
                        <span>{new Date(selectedNode.createdAt).toLocaleString()}</span>
                    </div>
                    
                    {selectedNode.isCategory ? (
                        <div className="detail-item">
                            <label>节点类型:</label>
                            <span>分类节点</span>
                        </div>
                    ) : (
                        <>
                            <div className="detail-item">
                                <label>类型:</label>
                                <span className={getNodeTypeColor(selectedNode.type)}>
                                    {NODE_TYPES[selectedNode.type] || '未知'}
                                </span>
                            </div>
                        </>
                    )}
                    
                    <div className="detail-item">
                        <label>节点名称:</label>
                        {canEditNode(selectedNode) ? (
                            <input
                                type="text"
                                value={editedNodeName}
                                onChange={(e) => setEditedNodeName(e.target.value)}
                            />
                        ) : (
                            <span>{selectedNode.text}</span>
                        )}
                    </div>
                    
                    <div className="detail-item">
                        <label>详细信息:</label>
                        {canEditNode(selectedNode) ? (
                            <textarea
                                value={editedNodeDetails}
                                onChange={(e) => setEditedNodeDetails(e.target.value)}
                            />
                        ) : (
                            <div className="readonly-details">{selectedNode.details}</div>
                        )}
                    </div>
                    
                    {canEditNode(selectedNode) && (
                        <div className="detail-actions">
                            <button onClick={saveNodeChanges}>保存修改</button>
                        </div>
                    )}
                    
                    {!selectedNode.isCategory && (
                        <div className="supporters-section">
                            <h4>支持者列表</h4>
                            {Object.keys(selectedNode.supporters || {}).length > 0 ? (
                                <div className="supporters-list">
                                    {Object.entries(selectedNode.supporters || {}).map(([userId, supporter]) => {
                                        // 如果是旧格式的数据（直接是金额数字）
                                        if (typeof supporter === 'number') {
                                            return (
                                                <div key={userId} className="supporter-item">
                                                    <span className="supporter-name">{userId}</span>
                                                    <span className="supporter-amount">¥{supporter.toLocaleString()}</span>
                                                </div>
                                            );
                                        }
                                        
                                        // 新格式的数据，包含金额、日期和期限
                                        return (
                                            <div key={userId} className="supporter-item">
                                                <div className="supporter-info">
                                                    <span className="supporter-name">{userId}</span>
                                                    <span className="supporter-date">
                                                        {new Date(supporter.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="supporter-period">
                                                        {getPeriodText(supporter.period)}
                                                    </span>
                                                </div>
                                                <span className="supporter-amount">¥{supporter.amount.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="total-donations">
                                        <strong>总金额:</strong> ¥{getTotalDonations(selectedNode.supporters).toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                <p className="no-supporters">暂无支持者</p>
                            )}
                            
                            {currentUser && currentUser.id !== 'guest' && (
                                <button className="donate-button" onClick={handleDonate}>
                                    支持此节点
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {showDonateModal && (
                <div className="modal" onClick={() => setShowDonateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setShowDonateModal(false)}>×</button>
                        <h3>支持节点: {selectedNode.text}</h3>
                        <div className="form-group">
                            <label>捐赠金额</label>
                            <input
                                type="number"
                                value={donationAmount}
                                onChange={(e) => setDonationAmount(e.target.value)}
                                placeholder="请输入金额"
                                min="1"
                            />
                        </div>
                        <div className="form-group">
                            <label>支持期限</label>
                            <select 
                                value={donationPeriod} 
                                onChange={(e) => setDonationPeriod(parseInt(e.target.value, 10))}
                            >
                                <option value="30">一个月</option>
                                <option value="90">三个月</option>
                                <option value="180">六个月</option>
                                <option value="365">一年</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>支付方式</label>
                            <div className="payment-methods">
                                <label className="payment-method">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="alipay"
                                        checked={paymentMethod === 'alipay'}
                                        onChange={() => setPaymentMethod('alipay')}
                                    />
                                    <span>支付宝</span>
                                </label>
                                <label className="payment-method">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="wechat"
                                        checked={paymentMethod === 'wechat'}
                                        onChange={() => setPaymentMethod('wechat')}
                                    />
                                    <span>微信支付</span>
                                </label>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={submitDonation}>确认支付</button>
                            <button onClick={() => setShowDonateModal(false)}>取消</button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="legend-hint">
                {!showLegend ? '按住H显示图例' : ''}
            </div>
            
            {showLegend && (
                <div className="legend">
                    <div className="legend-item">
                        <span className="blue-border">性能优化</span>
                    </div>
                    <div className="legend-item">
                        <span className="green-border">功能实现</span>
                    </div>
                    <div className="legend-item">
                        <span className="yellow-border">代码重构</span>
                    </div>
                    <div className="legend-item">
                        <span className="red-border">bug修复</span>
                    </div>
                    <div className="legend-item">
                        <span>分类节点</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindMap; 