// ==================== INTERFACE COMERCIAL ====================
window.ComercialApp = function ComercialApp({ user, userProfile, allData, onLogout }) {
    const { useState: _us, useEffect: _ue, useMemo: _um } = React;

    const { products, resellers, resellerStock, resellerSales, resellerReturns, sales, purchases, stockAdjustments } = allData;
    const [activeTab, _setTab] = _us('home');
    const [selectedSalon, setSelectedSalon] = _us(null);
    const [salonView, setSalonView] = _us('list'); // 'list' | 'detail'

    // Venda rápida no salão
    const [salonSaleForm, setSalonSaleForm] = _us({ productId: '', quantity: 1, salePrice: '' });
    // Venda direta
    const [directSaleForm, setDirectSaleForm] = _us({ productId: '', quantity: 1, price: '', clientName: '', date: new Date().toISOString().split('T')[0] });
    // Encomenda
    const [showOrderModal, setShowOrderModal] = _us(false);
    const [orderForm, setOrderForm] = _us({ resellerId: '', productId: '', quantity: 1, notes: '' });
    const [orders, setOrders] = _us([]);
    const [toast, setToast] = _us('');

    const myResellers = _um(() =>
        resellers.filter(r => (userProfile.assignedResellers || []).includes(r.id)),
        [resellers, userProfile.assignedResellers]
    );

    // Carrega encomendas desta comercial do Firestore
    _ue(() => {
        if (!user) return;
        // Lê do documento do admin (uid do admin guardado no userProfile.adminUid ou usa coleção orders)
        const unsub = db.collection('orders')
            .where('comercialId', '==', user.uid)
            .onSnapshot(snap => {
                setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        return () => unsub();
    }, [user]);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

    // Calcula stock do salão para um produto
    const calcSalonStock = (resellerId, productId) => {
        const totalIn = resellerStock.filter(t => t.resellerId === resellerId && t.productId === productId).reduce((s, t) => s + parseInt(t.quantity || 0), 0);
        const totalSold = resellerSales.filter(s => s.resellerId === resellerId && s.productId === productId).reduce((s, t) => s + parseInt(t.quantity || 0), 0);
        const totalRet = resellerReturns.filter(r => r.resellerId === resellerId && r.productId === productId).reduce((s, r) => s + parseInt(r.quantity || 0), 0);
        return Math.max(0, totalIn - totalSold - totalRet);
    };

    // Stock principal
    const calcMainStock = (productId) => {
        const totalIn = purchases.filter(p => p.productId === productId).reduce((s, p) => s + parseInt(p.quantity || 0), 0);
        const totalOut = sales.filter(s => s.productId === productId).reduce((s, v) => s + parseInt(v.quantity || 0), 0);
        const totalToResellers = resellerStock.filter(t => t.productId === productId).reduce((s, t) => s + parseInt(t.quantity || 0), 0);
        const totalRet = resellerReturns.filter(r => r.productId === productId).reduce((s, r) => s + parseInt(r.quantity || 0), 0);
        const totalRSold = resellerSales.filter(s => s.productId === productId).reduce((s, v) => s + parseInt(v.quantity || 0), 0);
        const adjIn = stockAdjustments.filter(a => a.productId === productId && a.type === 'entrada').reduce((s, a) => s + parseInt(a.quantity || 0), 0);
        const adjOut = stockAdjustments.filter(a => a.productId === productId && a.type === 'saida').reduce((s, a) => s + parseInt(a.quantity || 0), 0);
        return Math.max(0, totalIn - totalOut - totalToResellers + totalRet - totalRSold + adjIn - adjOut);
    };

    // Ganhos do mês
    const myEarnings = _um(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const myResellerIds = myResellers.map(r => r.id);
        const commR = parseFloat(userProfile.commissionReseller || 10) / 100;
        const commD = parseFloat(userProfile.commissionDirect || 25) / 100;

        const salonSalesMonth = resellerSales.filter(s =>
            myResellerIds.includes(s.resellerId) &&
            new Date(s.date) >= start && new Date(s.date) <= end
        );
        const salonTotal = salonSalesMonth.reduce((s, v) => s + (parseFloat(v.salePrice || 0) * parseInt(v.quantity || 0)), 0);
        const salonEarnings = salonTotal * commR;

        const directSalesMonth = sales.filter(s =>
            s.comercialId === user.uid &&
            new Date(s.date) >= start && new Date(s.date) <= end
        );
        const directTotal = directSalesMonth.reduce((s, v) => s + (parseFloat(v.price || 0) * parseInt(v.quantity || 0)), 0);
        const directEarnings = directTotal * commD;

        return { salonTotal, salonEarnings, directTotal, directEarnings, total: salonEarnings + directEarnings };
    }, [resellerSales, sales, myResellers, userProfile]);

    // Salões com visita em atraso (>15 dias)
    const lateVisits = _um(() =>
        myResellers.filter(r => getDaysSince(r.lastVisitDate) > 15)
            .map(r => ({ ...r, days: getDaysSince(r.lastVisitDate) })),
        [myResellers]
    );

    // Salões com stock baixo (<3 unidades de algum produto)
    const lowStockAlerts = _um(() => {
        const alerts = [];
        myResellers.forEach(r => {
            products.forEach(p => {
                const qty = calcSalonStock(r.id, p.id);
                if (qty > 0 && qty < 3) alerts.push({ reseller: r, product: p, qty });
            });
        });
        return alerts;
    }, [myResellers, products, resellerStock, resellerSales, resellerReturns]);

    const handleRegisterVisit = (resellerId) => {
        const today = new Date().toISOString().split('T')[0];
        const ref = db.collection('app_boticario').doc('banco_principal');
        ref.get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const updated = (data.resellers || []).map(r => r.id === resellerId ? { ...r, lastVisitDate: today } : r);
                ref.set({ ...data, resellers: updated });
                showToast('✅ Visita registada!');
            }
        });
    };

    const handleSalonSale = () => {
        const qty = parseInt(salonSaleForm.quantity);
        if (!selectedSalon || !salonSaleForm.productId || isNaN(qty) || qty <= 0) { alert('Dados inválidos'); return; }
        const avail = calcSalonStock(selectedSalon.id, salonSaleForm.productId);
        if (avail < qty) { alert(`Stock insuficiente. Disponível: ${avail}`); return; }
        const product = products.find(p => p.id === salonSaleForm.productId);
        const price = salonSaleForm.salePrice ? parseFloat(salonSaleForm.salePrice) : parseFloat(product?.catalogPrice || 0);
        const newSale = { id: generateId(), resellerId: selectedSalon.id, productId: salonSaleForm.productId, quantity: qty, salePrice: price, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), comercialId: user.uid, comercialName: userProfile.name };

        const ref = db.collection('app_boticario').doc('banco_principal');
        ref.get().then(doc => {
            if (!doc.exists) return;
            const data = doc.data();
            const updSales = [...(data.resellerSales || []), newSale];
            const updStock = (data.resellerStock || []).map(item => {
                if (item.resellerId === selectedSalon.id && item.productId === salonSaleForm.productId && item.quantity > 0) {
                    return { ...item, quantity: parseInt(item.quantity) - qty };
                }
                return item;
            });
            ref.set({ ...data, resellerSales: updSales, resellerStock: updStock });
            setSalonSaleForm({ productId: '', quantity: 1, salePrice: '' });
            showToast('✅ Venda registada!');
        });
    };

    const handleDirectSale = () => {
        const qty = parseInt(directSaleForm.quantity);
        if (!directSaleForm.productId || isNaN(qty) || qty <= 0 || !directSaleForm.price) { alert('Preencha produto, quantidade e preço'); return; }
        if (calcMainStock(directSaleForm.productId) < qty) { alert('Stock insuficiente'); return; }
        const product = products.find(p => p.id === directSaleForm.productId);
        const newSale = { id: generateId(), productId: directSaleForm.productId, customerId: '', quantity: qty, price: parseFloat(directSaleForm.price), paymentMethod: 'dinheiro', date: directSaleForm.date || new Date().toISOString().split('T')[0], profit: 0, clientName: directSaleForm.clientName, comercialId: user.uid, comercialName: userProfile.name };

        const ref = db.collection('app_boticario').doc('banco_principal');
        ref.get().then(doc => {
            if (!doc.exists) return;
            const data = doc.data();
            ref.set({ ...data, sales: [...(data.sales || []), newSale] });
            setDirectSaleForm({ productId: '', quantity: 1, price: '', clientName: '', date: new Date().toISOString().split('T')[0] });
            showToast('✅ Venda direta registada!');
        });
    };

    const handleCreateOrder = () => {
        if (!orderForm.resellerId || !orderForm.productId || orderForm.quantity <= 0) { alert('Preencha todos os campos'); return; }
        const reseller = resellers.find(r => r.id === orderForm.resellerId);
        const product = products.find(p => p.id === orderForm.productId);
        const newOrder = { resellerId: orderForm.resellerId, resellerName: reseller?.salonName, productId: orderForm.productId, productName: product?.name, quantity: parseInt(orderForm.quantity), notes: orderForm.notes, status: 'pendente', comercialId: user.uid, comercialName: userProfile.name, adminUid: allData.adminUid, createdAt: new Date().toISOString() };
        db.collection('orders').add(newOrder).then(() => {
            setOrderForm({ resellerId: '', productId: '', quantity: 1, notes: '' });
            setShowOrderModal(false);
            showToast('✅ Encomenda enviada!');
        });
    };

    const cancelOrder = (orderId) => {
        if (!confirm('Cancelar esta encomenda?')) return;
        db.collection('orders').doc(orderId).update({ status: 'cancelada' });
    };

    const navTabs = [
        { id: 'home', label: 'Home', icon: 'fa-home' },
        { id: 'saloes', label: 'Salões', icon: 'fa-store' },
        { id: 'vendas', label: 'Vendas', icon: 'fa-euro-sign' },
        { id: 'encomendas', label: 'Encomendas', icon: 'fa-clipboard-list' },
    ];

    const myDirectSales = sales.filter(s => s.comercialId === user.uid);

    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            {/* Toast */}
            {toast && <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold">{toast}</div>}

            {/* ===== ABA HOME ===== */}
            {activeTab === 'home' && (
                <div className="space-y-4 p-4">
                    <div className="flex justify-between items-center pt-2">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Olá, {userProfile.name} 👋</h1>
                            {userProfile.zone && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{userProfile.zone}</span>}
                        </div>
                        <button onClick={onLogout} className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm"><i className="fas fa-sign-out-alt"></i></button>
                    </div>

                    {/* Card Ganhos */}
                    <div className="boticario-gradient text-white rounded-2xl p-5 shadow-lg">
                        <p className="text-white/80 text-sm mb-3">💰 Os meus ganhos este mês</p>
                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between"><span>Vendas dos salões ({userProfile.commissionReseller || 10}%)</span><span>{formatCurrency(myEarnings.salonEarnings)}</span></div>
                            <div className="flex justify-between"><span>Vendas diretas ({userProfile.commissionDirect || 25}%)</span><span>{formatCurrency(myEarnings.directEarnings)}</span></div>
                        </div>
                        <div className="border-t border-white/30 pt-3">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">TOTAL A RECEBER</span>
                                <span className="text-2xl font-bold">{formatCurrency(myEarnings.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Visitas em atraso */}
                    {lateVisits.length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-700 mb-2">⚠️ Visitas em atraso ({lateVisits.length})</h3>
                            <div className="space-y-2">
                                {lateVisits.map(r => (
                                    <div key={r.id} className="alert-red rounded-xl p-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-red-800 text-sm">{r.salonName}</p>
                                            <p className="text-red-600 text-xs">há {r.days} dias sem visita</p>
                                        </div>
                                        <button onClick={() => handleRegisterVisit(r.id)} className="bg-red-600 text-white text-xs px-3 py-2 rounded-lg">Registar</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stock baixo */}
                    {lowStockAlerts.length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-700 mb-2">📦 Stock baixo nos salões</h3>
                            <div className="space-y-2">
                                {lowStockAlerts.slice(0, 5).map((a, i) => (
                                    <div key={i} className="alert-yellow rounded-xl p-3">
                                        <p className="font-bold text-yellow-800 text-sm">{a.reseller.salonName}</p>
                                        <p className="text-yellow-700 text-xs">{a.product.name} — {a.qty} un. restantes</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {lateVisits.length === 0 && lowStockAlerts.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <i className="fas fa-check-circle text-4xl mb-2 text-green-400"></i>
                            <p>Tudo em ordem! 🎉</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== ABA SALÕES ===== */}
            {activeTab === 'saloes' && (
                <div className="p-4">
                    {salonView === 'list' ? (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-800 pt-2">🏪 Os Meus Salões</h2>
                            {myResellers.length === 0 && <div className="text-center py-12 text-gray-400"><i className="fas fa-store text-4xl mb-3"></i><p>Nenhum salão atribuído ainda.</p></div>}
                            {myResellers.map(r => {
                                const days = getDaysSince(r.lastVisitDate);
                                const salonProducts = products.filter(p => calcSalonStock(r.id, p.id) > 0);
                                const totalSold = resellerSales.filter(s => s.resellerId === r.id).reduce((sum, s) => sum + (parseFloat(s.salePrice || 0) * parseInt(s.quantity || 0)), 0);
                                return (
                                    <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 cursor-pointer" onClick={() => { setSelectedSalon(r); setSalonView('detail'); setSalonSaleForm({ productId: '', quantity: 1, salePrice: '' }); }}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{r.salonName}</h3>
                                                <p className="text-gray-500 text-sm">{r.name}</p>
                                            </div>
                                            <i className={`fas fa-circle text-sm ${getVisitStatusColor(days)}`}></i>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                            <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-500">Última visita</p><p className="font-bold text-gray-700">{r.lastVisitDate ? `${days}d` : 'Nunca'}</p></div>
                                            <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-500">Produtos</p><p className="font-bold text-purple-600">{salonProducts.length}</p></div>
                                            <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-500">Vendido</p><p className="font-bold text-green-600">{formatCurrency(totalSold)}</p></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : selectedSalon && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={() => setSalonView('list')} className="text-purple-600"><i className="fas fa-arrow-left text-xl"></i></button>
                                <h2 className="text-xl font-bold text-gray-800">{selectedSalon.salonName}</h2>
                            </div>

                            <button onClick={() => handleRegisterVisit(selectedSalon.id)} className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-bold">
                                ✅ Registar Visita de Hoje
                            </button>

                            {/* Produtos no salão */}
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="font-bold text-gray-700 mb-3">📦 Produtos no Salão</h3>
                                {products.filter(p => calcSalonStock(selectedSalon.id, p.id) > 0).length === 0
                                    ? <p className="text-gray-400 text-sm text-center py-4">Sem produtos em stock</p>
                                    : products.filter(p => calcSalonStock(selectedSalon.id, p.id) > 0).map(p => (
                                        <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <span className="text-sm text-gray-700">{p.name}</span>
                                            <span className={`font-bold text-sm ${calcSalonStock(selectedSalon.id, p.id) < 3 ? 'text-red-600' : 'text-green-600'}`}>{calcSalonStock(selectedSalon.id, p.id)} un.</span>
                                        </div>
                                    ))
                                }
                            </div>

                            {/* Registar Venda */}
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="font-bold text-gray-700 mb-3">💰 Registar Venda</h3>
                                <div className="space-y-3">
                                    <select value={salonSaleForm.productId} onChange={e => setSalonSaleForm({ ...salonSaleForm, productId: e.target.value })} className="w-full border rounded-lg p-3 text-sm">
                                        <option value="">Selecionar produto...</option>
                                        {products.filter(p => calcSalonStock(selectedSalon.id, p.id) > 0).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({calcSalonStock(selectedSalon.id, p.id)} un.)</option>
                                        ))}
                                    </select>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="number" min="1" placeholder="Quantidade" value={salonSaleForm.quantity} onChange={e => setSalonSaleForm({ ...salonSaleForm, quantity: e.target.value })} className="border rounded-lg p-3 text-sm" />
                                        <input type="number" min="0" step="0.01" placeholder="Preço (€)" value={salonSaleForm.salePrice} onChange={e => setSalonSaleForm({ ...salonSaleForm, salePrice: e.target.value })} className="border rounded-lg p-3 text-sm" />
                                    </div>
                                    <button onClick={handleSalonSale} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Registar Venda</button>
                                </div>
                            </div>

                            {/* Histórico últimas 10 */}
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="font-bold text-gray-700 mb-3">📋 Últimas Vendas</h3>
                                {resellerSales.filter(s => s.resellerId === selectedSalon.id).slice(-10).reverse().map(s => {
                                    const p = products.find(pr => pr.id === s.productId);
                                    return (
                                        <div key={s.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                                            <div><p className="font-medium">{p?.name || '—'}</p><p className="text-gray-400 text-xs">{s.date}</p></div>
                                            <p className="font-bold text-green-600">{formatCurrency(s.salePrice * s.quantity)}</p>
                                        </div>
                                    );
                                })}
                                {resellerSales.filter(s => s.resellerId === selectedSalon.id).length === 0 && <p className="text-gray-400 text-sm text-center py-3">Sem vendas registadas</p>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== ABA VENDAS DIRETAS ===== */}
            {activeTab === 'vendas' && (
                <div className="p-4 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 pt-2">💰 Venda Direta</h2>
                    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                        <select value={directSaleForm.productId} onChange={e => { const p = products.find(pr => pr.id === e.target.value); setDirectSaleForm({ ...directSaleForm, productId: e.target.value, price: p ? p.catalogPrice : '' }); }} className="w-full border rounded-lg p-3 text-sm">
                            <option value="">Selecionar produto...</option>
                            {products.filter(p => calcMainStock(p.id) > 0).map(p => (
                                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.catalogPrice || 0)} ({calcMainStock(p.id)} un.)</option>
                            ))}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" min="1" placeholder="Quantidade" value={directSaleForm.quantity} onChange={e => setDirectSaleForm({ ...directSaleForm, quantity: e.target.value })} className="border rounded-lg p-3 text-sm" />
                            <input type="number" min="0" step="0.01" placeholder="Preço (€)" value={directSaleForm.price} onChange={e => setDirectSaleForm({ ...directSaleForm, price: e.target.value })} className="border rounded-lg p-3 text-sm" />
                        </div>
                        <input type="text" placeholder="Nome do cliente (opcional)" value={directSaleForm.clientName} onChange={e => setDirectSaleForm({ ...directSaleForm, clientName: e.target.value })} className="w-full border rounded-lg p-3 text-sm" />
                        <input type="date" value={directSaleForm.date} onChange={e => setDirectSaleForm({ ...directSaleForm, date: e.target.value })} className="w-full border rounded-lg p-3 text-sm" />
                        {directSaleForm.price && directSaleForm.quantity && (
                            <div className="bg-green-50 rounded-lg p-3 text-sm">
                                <div className="flex justify-between"><span>Total:</span><span className="font-bold">{formatCurrency(parseFloat(directSaleForm.price) * parseInt(directSaleForm.quantity || 1))}</span></div>
                                <div className="flex justify-between text-green-700"><span>A minha comissão ({userProfile.commissionDirect || 25}%):</span><span className="font-bold">{formatCurrency(parseFloat(directSaleForm.price) * parseInt(directSaleForm.quantity || 1) * ((userProfile.commissionDirect || 25) / 100))}</span></div>
                            </div>
                        )}
                        <button onClick={handleDirectSale} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">Registar Venda Direta</button>
                    </div>

                    <h3 className="font-bold text-gray-700">Minhas vendas</h3>
                    {myDirectSales.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sem vendas diretas registadas</p>}
                    {myDirectSales.slice().reverse().map(s => {
                        const p = products.find(pr => pr.id === s.productId);
                        const comm = parseFloat(s.price || 0) * parseInt(s.quantity || 1) * ((userProfile.commissionDirect || 25) / 100);
                        return (
                            <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm text-sm">
                                <div className="flex justify-between">
                                    <div><p className="font-medium">{p?.name || '—'}</p><p className="text-gray-400 text-xs">{s.date} {s.clientName ? `• ${s.clientName}` : ''}</p></div>
                                    <div className="text-right"><p className="font-bold">{formatCurrency(s.price * s.quantity)}</p><p className="text-green-600 text-xs">+{formatCurrency(comm)}</p></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== ABA ENCOMENDAS ===== */}
            {activeTab === 'encomendas' && (
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center pt-2">
                        <h2 className="text-xl font-bold text-gray-800">📋 Encomendas</h2>
                        <button onClick={() => setShowOrderModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold"><i className="fas fa-plus mr-1"></i>Nova</button>
                    </div>
                    {orders.length === 0 && <div className="text-center py-12 text-gray-400"><i className="fas fa-clipboard-list text-4xl mb-3"></i><p>Sem encomendas</p></div>}
                    {orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(o => (
                        <div key={o.id} className="bg-white rounded-xl shadow-sm p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{o.resellerName}</p>
                                    <p className="text-gray-600 text-sm">{o.productName} × {o.quantity}</p>
                                    <p className="text-gray-400 text-xs mt-1">{new Date(o.createdAt).toLocaleDateString('pt-PT')}</p>
                                    {o.notes && <p className="text-gray-500 text-xs italic">{o.notes}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${o.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' : o.status === 'aprovado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {o.status === 'pendente' ? '🟡 Pendente' : o.status === 'aprovado' ? '🟢 Aprovado' : '🔴 Rejeitado'}
                                    </span>
                                    {o.status === 'pendente' && <button onClick={() => cancelOrder(o.id)} className="text-xs text-red-500 underline">Cancelar</button>}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Modal Nova Encomenda */}
                    {showOrderModal && (
                        <div className="fixed inset-0 modal-overlay flex items-end justify-center z-50">
                            <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
                                <h3 className="text-lg font-bold">➕ Nova Encomenda</h3>
                                <select value={orderForm.resellerId} onChange={e => setOrderForm({ ...orderForm, resellerId: e.target.value })} className="w-full border rounded-lg p-3 text-sm">
                                    <option value="">Selecionar salão...</option>
                                    {myResellers.map(r => <option key={r.id} value={r.id}>{r.salonName}</option>)}
                                </select>
                                <select value={orderForm.productId} onChange={e => setOrderForm({ ...orderForm, productId: e.target.value })} className="w-full border rounded-lg p-3 text-sm">
                                    <option value="">Selecionar produto...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <input type="number" min="1" placeholder="Quantidade" value={orderForm.quantity} onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })} className="w-full border rounded-lg p-3 text-sm" />
                                <textarea placeholder="Notas (opcional)" value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} className="w-full border rounded-lg p-3 text-sm" rows="2"></textarea>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowOrderModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl">Cancelar</button>
                                    <button onClick={handleCreateOrder} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold">Enviar</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
                <div className="flex">
                    {navTabs.map(tab => (
                        <button key={tab.id} onClick={() => { _setTab(tab.id); if (tab.id !== 'saloes') setSalonView('list'); }} className={`flex-1 flex flex-col items-center py-3 text-xs transition ${activeTab === tab.id ? 'text-purple-600' : 'text-gray-400'}`}>
                            <i className={`fas ${tab.icon} text-lg mb-1`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};
