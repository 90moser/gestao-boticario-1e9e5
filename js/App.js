// ==================== APP PRINCIPAL (PARTE 1: LÓGICA) ====================
const { useState, useEffect, useMemo, useRef } = React;

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [loginInput, setLoginInput] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [authError, setAuthError] = useState('');
    const [comerciais, setComerciais] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [showComercialModal, setShowComercialModal] = useState(false);
    const [comercialForm, setComercialForm] = useState({ name: '', username: '', password: '', zone: '', commissionReseller: 10, commissionDirect: 25 });
    const [showAssignSalonsModal, setShowAssignSalonsModal] = useState(false);
    const [editingComercial, setEditingComercial] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (userLogado) => {
            if (userLogado) {
                setProfileLoading(true);
                try {
                    const snap = await db.collection('users').doc(userLogado.uid).get();
                    let profile;
                    if (snap.exists) {
                        profile = snap.data();
                    } else {
                        profile = { uid: userLogado.uid, role: 'admin', name: userLogado.email, zone: '', assignedResellers: [], commissionDirect: 25, commissionReseller: 10, active: true };
                        await db.collection('users').doc(userLogado.uid).set(profile);
                    }
                    setUserProfile(profile);
                } catch (e) {
                    setUserProfile({ uid: userLogado.uid, role: 'admin', name: userLogado.email, zone: '', assignedResellers: [], commissionDirect: 25, commissionReseller: 10, active: true });
                }
                setProfileLoading(false);
                setUser(userLogado);
            } else {
                setUser(null);
                setUserProfile(null);
                setProducts([]); setPurchases([]); setSales([]); setCustomers([]);
                setCreditSales([]); setResellers([]); setResellerStock([]);
                setResellerSales([]); setResellerReturns([]); setStockAdjustments([]);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !userProfile || userProfile.role !== 'admin') return;
        const unsub = db.collection('users').where('adminUid', '==', user.uid).where('role', '==', 'comercial').onSnapshot(snap => {
            setComerciais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user, userProfile]);

    useEffect(() => {
        if (!user || !userProfile || userProfile.role !== 'admin') return;
        const unsub = db.collection('orders').where('adminUid', '==', user.uid).where('status', '==', 'pendente').onSnapshot(snap => {
            setPendingOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user, userProfile]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        const emailToUse = loginInput.includes('@') ? loginInput : loginInput + '@boticario.internal';
        try {
            if (isRegistering) {
                await auth.createUserWithEmailAndPassword(emailToUse, password);
            } else {
                await auth.signInWithEmailAndPassword(emailToUse, password);
            }
        } catch (error) {
            setAuthError("Erro: Verifique os dados ou use uma senha de 6+ caracteres.");
        }
    };
    const handleLogout = () => { auth.signOut(); };

    const handleCreateComercial = async () => {
        if (!comercialForm.name || !comercialForm.username) return alert('Nome e username são obrigatórios');
        if (!comercialForm.password || comercialForm.password.length < 6) return alert('Senha deve ter pelo menos 6 caracteres');
        const email = comercialForm.username + '@boticario.internal';
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, comercialForm.password);
            const profile = { role: 'comercial', name: comercialForm.name, username: comercialForm.username, zone: comercialForm.zone || '', adminUid: user.uid, commissionReseller: parseFloat(comercialForm.commissionReseller) || 10, commissionDirect: parseFloat(comercialForm.commissionDirect) || 25, assignedResellers: [], active: true, createdAt: new Date().toISOString(), uid: cred.user.uid };
            await db.collection('users').doc(cred.user.uid).set(profile);
            await db.collection('app_boticario').doc(cred.user.uid).set({});
            setComercialForm({ name: '', username: '', password: '', zone: '', commissionReseller: 10, commissionDirect: 25 });
            setShowComercialModal(false);
            alert(`Comercial criada! ✅\nLogin: ${comercialForm.username}\nSenha: ${comercialForm.password}`);
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    };

    const handleApproveOrder = async (order) => {
        const newTransfer = { id: generateId(), resellerId: order.resellerId, productId: order.productId, quantity: parseInt(order.quantity), date: new Date().toISOString().split('T')[0], notes: 'Aprovado de encomenda' };
        const newResellerStock = [...resellerStock, newTransfer];
        await db.collection('app_boticario').doc('banco_principal').update({ resellerStock: newResellerStock });
        await db.collection('orders').doc(order.id).update({ status: 'aprovado', approvedAt: new Date().toISOString() });
    };

    const handleRejectOrder = async (order) => {
        await db.collection('orders').doc(order.id).update({ status: 'rejeitado', rejectedAt: new Date().toISOString() });
    };

    const [products, setProducts] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [creditSales, setCreditSales] = useState([]);
    const [resellers, setResellers] = useState([]);
    const [resellerStock, setResellerStock] = useState([]);
    const [resellerSales, setResellerSales] = useState([]);
    const [resellerReturns, setResellerReturns] = useState([]);
    const [stockAdjustments, setStockAdjustments] = useState([]);

    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
    const backupIntervalRef = useRef(null);

    const triggerAutoBackup = () => {
        if (!autoBackupEnabled) return;
        const data = {
            exportDate: new Date().toISOString(), version: '3.0',
            products, purchases, sales, customers, creditSales,
            resellers, resellerStock, resellerSales, resellerReturns, stockAdjustments,
            config: { lowStockThreshold, expiryAlertDays, staleProductDays }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_automatico_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (autoBackupEnabled) {
            backupIntervalRef.current = setInterval(triggerAutoBackup, 300000);
            return () => clearInterval(backupIntervalRef.current);
        }
    }, [autoBackupEnabled, products, purchases, sales, customers, creditSales, resellers, resellerStock, resellerSales, resellerReturns, stockAdjustments]);

    const [showProductModal, setShowProductModal] = useState(false);
    const [showEditProductModal, setShowEditProductModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showEditSaleModal, setShowEditSaleModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResellerModal, setShowResellerModal] = useState(false);
    const [showEditResellerModal, setShowEditResellerModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showResellerSaleModal, setShowResellerSaleModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);
    const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
    const [showPurchaseHistoryModal, setShowPurchaseHistoryModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);

    const [editingProduct, setEditingProduct] = useState(null);
    const [editingSale, setEditingSale] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editingReseller, setEditingReseller] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);
    const [selectedReseller, setSelectedReseller] = useState(null);
    const [selectedResellerInventory, setSelectedResellerInventory] = useState(null);
    const [editingStockItemId, setEditingStockItemId] = useState(null);
    const [editingStockQty, setEditingStockQty] = useState('');
    const [selectedResellerForHistory, setSelectedResellerForHistory] = useState(null);
    const [quickBuyProduct, setQuickBuyProduct] = useState(null);
    const [adjustStockProduct, setAdjustStockProduct] = useState(null);

    const [customerSort, setCustomerSort] = useState('default');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [productCategoryFilter, setProductCategoryFilter] = useState('todos');
    const [productStatusFilter, setProductStatusFilter] = useState('todos');
    const [productExpiryFilter, setProductExpiryFilter] = useState('all');
    const [productSortBy, setProductSortBy] = useState('name');
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [stockCategoryFilter, setStockCategoryFilter] = useState('todos');
    const [stockStatusFilter, setStockStatusFilter] = useState('todos');
    const [stockExpiryFilter, setStockExpiryFilter] = useState('all');
    const [stockSortBy, setStockSortBy] = useState('name');
    const [purchaseHistorySearch, setPurchaseHistorySearch] = useState('');
    const [purchaseHistoryDateFrom, setPurchaseHistoryDateFrom] = useState('');
    const [purchaseHistoryDateTo, setPurchaseHistoryDateTo] = useState('');

    const [productForm, setProductForm] = useState({ name: '', category: 'perfumaria', fragrance: '', expiryDate: '', cycle: '', catalogPrice: '' });
    const [purchaseForm, setPurchaseForm] = useState({ productId: '', quantity: 1, price: 0, date: new Date().toISOString().split('T')[0] });
    const [saleForm, setSaleForm] = useState({ productId: '', customerId: '', quantity: 1, price: 0, paymentMethod: 'bizum', date: new Date().toISOString().split('T')[0] });
    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '' });
    const [creditForm, setCreditForm] = useState({ saleId: '', amount: 0, dueDate: '', status: 'pendente' });
    const [resellerForm, setResellerForm] = useState({ name: '', salonName: '', address: '', phone: '', email: '', commissionRate: 25 });
    const [transferForm, setTransferForm] = useState({ resellerId: '', productId: '', quantity: 1, date: new Date().toISOString().split('T')[0] });
    const [resellerSaleForm, setResellerSaleForm] = useState({ resellerId: '', productId: '', quantity: 1, salePrice: 0, date: new Date().toISOString().split('T')[0] });
    const [returnForm, setReturnForm] = useState({ resellerId: '', productId: '', quantity: 1, date: new Date().toISOString().split('T')[0] });
    const [quickBuyForm, setQuickBuyForm] = useState({ quantity: 5, price: 0, date: new Date().toISOString().split('T')[0] });
    const [adjustStockForm, setAdjustStockForm] = useState({ type: 'saida', reason: 'quebra', quantity: 1, notes: '', date: new Date().toISOString().split('T')[0] });

    const [lowStockThreshold, setLowStockThreshold] = useState(3);
    const [expiryAlertDays, setExpiryAlertDays] = useState(30);
    const [staleProductDays, setStaleProductDays] = useState(30);

    const fileInputRef = useRef(null);
    const isReceivingData = useRef(true);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = db.collection('app_boticario').doc('banco_principal').onSnapshot((doc) => {
            console.log("📦 Firestore data received:", doc.exists, doc.data());
            if (doc.exists) {
                const data = doc.data();
                isReceivingData.current = true;
                if (data.products) setProducts(data.products);
                if (data.purchases) setPurchases(data.purchases);
                if (data.sales) setSales(data.sales);
                if (data.customers) setCustomers(data.customers);
                if (data.creditSales) setCreditSales(data.creditSales);
                if (data.resellers) setResellers(data.resellers);
                if (data.resellerStock) setResellerStock(data.resellerStock);
                if (data.resellerSales) setResellerSales(data.resellerSales);
                if (data.resellerReturns) setResellerReturns(data.resellerReturns);
                if (data.stockAdjustments) setStockAdjustments(data.stockAdjustments);
                setTimeout(() => { isReceivingData.current = false; }, 2000);
            } else {
                setProducts([]); setPurchases([]); setSales([]); setCustomers([]);
                setCreditSales([]); setResellers([]); setResellerStock([]);
                setResellerSales([]); setResellerReturns([]); setStockAdjustments([]);
                isReceivingData.current = false;
            }
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user || (userProfile && userProfile.role === 'comercial')) return;
        if (isReceivingData.current) return;
        const saveData = {
            products: products || [], purchases: purchases || [], sales: sales || [],
            customers: customers || [], creditSales: creditSales || [],
            resellers: resellers || [], resellerStock: resellerStock || [],
            resellerSales: resellerSales || [], resellerReturns: resellerReturns || [],
            stockAdjustments: stockAdjustments || []
        };
        db.collection('app_boticario').doc('banco_principal').set(saveData)
            .then(() => console.log("Nuvem privada atualizada!"))
            .catch(error => console.error("Erro na nuvem:", error));
    }, [products, purchases, sales, customers, creditSales, resellers, resellerStock, resellerSales, resellerReturns, stockAdjustments, user]);

    const calculateAveragePrice = (productId) => {
        const productPurchases = purchases.filter(p => p.productId === productId);
        if (!productPurchases || productPurchases.length === 0) return 0;
        const totalValue = productPurchases.reduce((sum, p) => sum + (parseFloat(p.price || 0) * parseInt(p.quantity || 0)), 0);
        const totalQuantity = productPurchases.reduce((sum, p) => sum + parseInt(p.quantity || 0), 0);
        return totalQuantity > 0 ? totalValue / totalQuantity : 0;
    };

    const calculateStock = (productId) => {
        const totalIn = purchases.filter(p => p.productId === productId).reduce((sum, p) => sum + parseInt(p.quantity), 0);
        const totalOut = sales.filter(s => s.productId === productId).reduce((sum, s) => sum + parseInt(s.quantity), 0);
        const totalToResellers = resellerStock.filter(t => t.productId === productId).reduce((sum, t) => sum + parseInt(t.quantity), 0);
        const totalReturned = resellerReturns.filter(r => r.productId === productId).reduce((sum, r) => sum + parseInt(r.quantity), 0);
        const totalResellerSales = resellerSales.filter(s => s.productId === productId).reduce((sum, s) => sum + parseInt(s.quantity), 0);
        const adjustmentsIn = stockAdjustments.filter(a => a.productId === productId && a.type === 'entrada').reduce((sum, a) => sum + parseInt(a.quantity), 0);
        const adjustmentsOut = stockAdjustments.filter(a => a.productId === productId && a.type === 'saida').reduce((sum, a) => sum + parseInt(a.quantity), 0);
        return Math.max(0, totalIn - totalOut - totalToResellers + totalReturned - totalResellerSales + adjustmentsIn - adjustmentsOut);
    };

    const calculateResellerStock = (resellerId, productId) => {
        const totalIn = resellerStock.filter(t => t.resellerId === resellerId && t.productId === productId).reduce((sum, t) => sum + parseInt(t.quantity), 0);
        const totalSold = resellerSales.filter(s => s.resellerId === resellerId && s.productId === productId).reduce((sum, s) => sum + parseInt(s.quantity), 0);
        const totalReturned = resellerReturns.filter(r => r.resellerId === resellerId && r.productId === productId).reduce((sum, r) => sum + parseInt(r.quantity), 0);
        return totalIn - totalSold - totalReturned;
    };

    const filterAndSortProducts = (productsList, searchTerm, categoryFilter, statusFilter, expiryFilter, sortBy) => {
        let filtered = productsList.filter(p => {
            const stock = calculateStock(p.id);
            const daysToExpiry = p.expiryDate ? calculateDaysUntilExpiry(p.expiryDate) : null;
            if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (categoryFilter !== 'todos' && p.category !== categoryFilter) return false;
            if (statusFilter === 'ok' && stock >= lowStockThreshold) return true;
            if (statusFilter === 'low' && stock > 0 && stock < lowStockThreshold) return true;
            if (statusFilter === 'out' && stock === 0) return true;
            if (statusFilter !== 'todos' && statusFilter !== 'ok' && statusFilter !== 'low' && statusFilter !== 'out') return false;
            if (expiryFilter === 'no-expiry' && !p.expiryDate) return true;
            if (expiryFilter === 'no-expiry' && p.expiryDate) return false;
            if (expiryFilter !== 'all' && expiryFilter !== 'no-expiry' && daysToExpiry !== null && daysToExpiry <= parseInt(expiryFilter)) return true;
            if (expiryFilter !== 'all' && expiryFilter !== 'no-expiry' && (daysToExpiry === null || daysToExpiry > parseInt(expiryFilter))) return false;
            return true;
        });
        filtered.sort((a, b) => {
            const stockA = calculateStock(a.id), stockB = calculateStock(b.id);
            const valueA = stockA * (parseFloat(a.catalogPrice) || 0);
            const valueB = stockB * (parseFloat(b.catalogPrice) || 0);
            const expiryA = a.expiryDate ? calculateDaysUntilExpiry(a.expiryDate) : 9999;
            const expiryB = b.expiryDate ? calculateDaysUntilExpiry(b.expiryDate) : 9999;
            switch(sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'stock': return stockA - stockB;
                case 'stock-desc': return stockB - stockA;
                case 'value': return valueB - valueA;
                case 'expiry': return expiryA - expiryB;
                default: return 0;
            }
        });
        return filtered;
    };

    const filteredProducts = useMemo(() => filterAndSortProducts(products, productSearchTerm, productCategoryFilter, productStatusFilter, productExpiryFilter, productSortBy), [products, productSearchTerm, productCategoryFilter, productStatusFilter, productExpiryFilter, productSortBy]);
    const filteredStock = useMemo(() => filterAndSortProducts(products, stockSearchTerm, stockCategoryFilter, stockStatusFilter, stockExpiryFilter, stockSortBy), [products, stockSearchTerm, stockCategoryFilter, stockStatusFilter, stockExpiryFilter, stockSortBy]);

    const lowStockProducts = useMemo(() => products.filter(p => calculateStock(p.id) < lowStockThreshold), [products, purchases, sales, resellerStock, resellerSales, resellerReturns, stockAdjustments, lowStockThreshold]);
    const expiryAlertProducts = useMemo(() => products.filter(p => p.expiryDate && calculateDaysUntilExpiry(p.expiryDate) <= expiryAlertDays), [products, expiryAlertDays]);
    const pendingCreditSales = useMemo(() => creditSales.filter(c => c.status === 'pendente'), [creditSales]);
    const staleResellerProducts = useMemo(() => {
        return resellerStock.filter(t => t.quantity > 0 && calculateDaysSince(t.date) >= staleProductDays).map(t => {
            const reseller = resellers.find(r => r.id === t.resellerId);
            const product = products.find(p => p.id === t.productId);
            return { ...t, resellerName: reseller?.name, productName: product?.name, days: calculateDaysSince(t.date) };
        });
    }, [resellerStock, resellers, products, staleProductDays]);

    const financialReport = useMemo(() => {
        const { start, end } = getMonthRange();
        const monthlySales = sales.filter(s => new Date(s.date) >= start && new Date(s.date) <= end);
        const monthlyPurchases = purchases.filter(p => new Date(p.date) >= start && new Date(p.date) <= end);
        const monthlyResellerSales = resellerSales.filter(s => new Date(s.date) >= start && new Date(s.date) <= end);
        const totalInvested = monthlyPurchases.reduce((sum, p) => sum + (parseFloat(p.price || 0) * parseInt(p.quantity || 0)), 0);
        const directProfit = monthlySales.reduce((sum, s) => sum + ((s.price - calculateAveragePrice(s.productId)) * s.quantity), 0);
        const directRevenue = monthlySales.reduce((sum, s) => sum + (s.price * s.quantity), 0);
        const resellerRevenue = monthlyResellerSales.reduce((sum, sale) => {
            const revendedor = resellers.find(r => r.id === sale.resellerId);
            const taxaComissao = revendedor ? revendedor.commissionRate : 0;
            const vendaBruta = sale.salePrice * sale.quantity;
            return sum + (vendaBruta - vendaBruta * (taxaComissao / 100));
        }, 0);
        const totalSold = directRevenue + resellerRevenue;
        const totalProfit = directProfit + resellerRevenue;
        const topProducts = products.map(p => ({ ...p, sold: sales.filter(s => s.productId === p.id).reduce((sum, s) => sum + parseInt(s.quantity), 0) })).sort((a, b) => b.sold - a.sold).slice(0, 5);
        return { totalSold, totalInvested, totalProfit, topProducts, monthlySales, monthlyPurchases, monthlyResellerSales };
    }, [sales, purchases, products, resellerSales, resellers]);

    const topSellingProducts = useMemo(() => {
        return products.map(p => ({
            ...p,
            totalSold: sales.filter(s => s.productId === p.id).reduce((sum, s) => sum + parseInt(s.quantity), 0),
            totalRevenue: sales.filter(s => s.productId === p.id).reduce((sum, s) => sum + (s.price * s.quantity), 0)
        })).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);
    }, [products, sales]);

    const resellerReport = useMemo(() => {
        return resellers.map(r => {
            const resellerSalesList = resellerSales.filter(s => s.resellerId === r.id);
            const totalSales = resellerSalesList.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
            const commission = totalSales * (r.commissionRate / 100);
            const yourEarnings = totalSales - commission;
            const resellerProducts = resellerStock.filter(t => t.resellerId === r.id && t.quantity > 0);
            return { ...r, totalSales, commission, yourEarnings, productsCount: resellerProducts.length, salesCount: resellerSalesList.length };
        });
    }, [resellers, resellerSales, resellerStock]);

    const stockValueReport = useMemo(() => {
        let totalPaidValue = 0, totalSaleValue = 0;
        products.forEach(p => {
            const stock = calculateStock(p.id);
            if (stock > 0) {
                const avgPrice = calculateAveragePrice(p.id);
                totalPaidValue += stock * (isNaN(avgPrice) ? 0 : avgPrice);
                totalSaleValue += stock * (parseFloat(p.catalogPrice) || 0);
            }
        });
        let resellerPaidValue = 0, resellerSaleValue = 0;
        resellerStock.forEach(item => {
            if (item.quantity > 0) {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    resellerPaidValue += item.quantity * (parseFloat(product.costPrice || 0));
                    resellerSaleValue += item.quantity * (parseFloat(product.catalogPrice || 0));
                }
            }
        });
        const totalPaidComplete = totalPaidValue + resellerPaidValue;
        const totalSaleComplete = totalSaleValue + resellerSaleValue;
        const potentialProfitComplete = totalSaleComplete - totalPaidComplete;
        const profitMarginComplete = totalPaidComplete > 0 ? ((totalSaleComplete - totalPaidComplete) / totalPaidComplete) * 100 : 0;
        return {
            totalPaidValue: totalPaidComplete, totalSaleValue: totalSaleComplete,
            potentialProfit: potentialProfitComplete, profitMargin: profitMarginComplete,
            physicalPaidValue: totalPaidValue, physicalSaleValue: totalSaleValue,
            resellerPaidValue, resellerSaleValue
        };
    }, [products, purchases, sales, resellerStock, resellerSales, resellerReturns, stockAdjustments]);

    const customersWithStats = useMemo(() => {
        return customers.map(c => {
            const customerSales = sales.filter(s => s.customerId === c.id);
            return { ...c, totalSpent: customerSales.reduce((sum, s) => sum + (s.price * s.quantity), 0), totalPurchases: customerSales.length };
        });
    }, [customers, sales]);

    const filteredPurchaseHistory = useMemo(() => {
        let filtered = [...purchases];
        if (purchaseHistorySearch) filtered = filtered.filter(p => {
            const product = products.find(prod => prod.id === p.productId);
            return product && product.name.toLowerCase().includes(purchaseHistorySearch.toLowerCase());
        });
        if (purchaseHistoryDateFrom) filtered = filtered.filter(p => new Date(p.date) >= new Date(purchaseHistoryDateFrom));
        if (purchaseHistoryDateTo) filtered = filtered.filter(p => new Date(p.date) <= new Date(purchaseHistoryDateTo));
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [purchases, products, purchaseHistorySearch, purchaseHistoryDateFrom, purchaseHistoryDateTo]);

    const handleAddProduct = () => {
        if (!productForm.name) { alert('Nome obrigatório!'); return; }
        setProducts([...products, { id: generateId(), ...productForm, catalogPrice: parseFloat(productForm.catalogPrice) || 0, createdAt: new Date().toISOString() }]);
        setProductForm({ name: '', category: 'perfumaria', fragrance: '', expiryDate: '', cycle: '', catalogPrice: '' });
        setShowProductModal(false);
    };

    const handleEditProduct = () => {
        if (!editingProduct || !productForm.name) { alert('Nome obrigatório!'); return; }
        setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productForm, catalogPrice: parseFloat(productForm.catalogPrice) || 0 } : p));
        setEditingProduct(null);
        setProductForm({ name: '', category: 'perfumaria', fragrance: '', expiryDate: '', cycle: '', catalogPrice: '' });
        setShowEditProductModal(false);
    };

    const openEditProduct = (product) => {
        setEditingProduct(product);
        setProductForm({ name: product.name, category: product.category, fragrance: product.fragrance || '', expiryDate: product.expiryDate || '', cycle: product.cycle || '', catalogPrice: product.catalogPrice || '' });
        setShowEditProductModal(true);
    };

    const handleDeleteProduct = () => { if (!deleteItem) return; setProducts(products.filter(p => p.id !== deleteItem.id)); setDeleteItem(null); setShowDeleteModal(false); };
    const confirmDeleteProduct = (product) => {
        if (sales.filter(s => s.productId === product.id).length > 0 && !confirm('Produto tem vendas. Continuar?')) return;
        setDeleteItem({ type: 'product', ...product });
        setShowDeleteModal(true);
    };

    const handleAddCustomer = () => {
        if (!customerForm.name) { alert('Nome obrigatório!'); return; }
        setCustomers([...customers, { id: generateId(), ...customerForm, createdAt: new Date().toISOString() }]);
        setCustomerForm({ name: '', phone: '', email: '' });
        setShowCustomerModal(false);
    };

    const handleEditCustomer = () => {
        if (!editingCustomer || !customerForm.name) { alert('Nome obrigatório!'); return; }
        setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...customerForm } : c));
        setEditingCustomer(null);
        setCustomerForm({ name: '', phone: '', email: '' });
        setShowEditCustomerModal(false);
    };

    const openEditCustomer = (customer) => {
        setEditingCustomer(customer);
        setCustomerForm({ name: customer.name, phone: customer.phone || '', email: customer.email || '' });
        setShowEditCustomerModal(true);
    };

    const handleDeleteCustomer = () => { if (!deleteItem) return; setCustomers(customers.filter(c => c.id !== deleteItem.id)); setDeleteItem(null); setShowDeleteModal(false); };
    const confirmDeleteCustomer = (customer) => {
        if (sales.filter(s => s.customerId === customer.id).length > 0 && !confirm('Cliente tem compras. Continuar?')) return;
        setDeleteItem({ type: 'customer', ...customer });
        setShowDeleteModal(true);
    };

    const handleAddReseller = () => {
        if (!resellerForm.name || !resellerForm.salonName) { alert('Nome e Salão obrigatórios!'); return; }
        setResellers([...resellers, { id: generateId(), ...resellerForm, commissionRate: parseFloat(resellerForm.commissionRate) || 25, createdAt: new Date().toISOString(), status: 'ativo' }]);
        setResellerForm({ name: '', salonName: '', address: '', phone: '', email: '', commissionRate: 25 });
        setShowResellerModal(false);
    };

    const handleEditReseller = () => {
        if (!editingReseller || !resellerForm.name) { alert('Nome obrigatório!'); return; }
        setResellers(resellers.map(r => r.id === editingReseller.id ? { ...r, ...resellerForm, commissionRate: parseFloat(resellerForm.commissionRate) || 25 } : r));
        setEditingReseller(null);
        setResellerForm({ name: '', salonName: '', address: '', phone: '', email: '', commissionRate: 25 });
        setShowEditResellerModal(false);
    };

    const openEditReseller = (reseller) => {
        setEditingReseller(reseller);
        setResellerForm({ name: reseller.name, salonName: reseller.salonName, address: reseller.address || '', phone: reseller.phone || '', email: reseller.email || '', commissionRate: reseller.commissionRate || 25 });
        setShowEditResellerModal(true);
    };

    const handleDeleteReseller = () => { if (!deleteItem) return; setResellers(resellers.filter(r => r.id !== deleteItem.id)); setDeleteItem(null); setShowDeleteModal(false); };
    const confirmDeleteReseller = (reseller) => {
        if (resellerStock.filter(t => t.resellerId === reseller.id && calculateResellerStock(reseller.id, t.productId) > 0).length > 0) { alert('Devolva produtos antes!'); return; }
        setDeleteItem({ type: 'reseller', ...reseller });
        setShowDeleteModal(true);
    };

    const handleTransfer = () => {
        if (!transferForm.resellerId || !transferForm.productId || transferForm.quantity <= 0) { alert('Dados inválidos!'); return; }
        if (calculateStock(transferForm.productId) < transferForm.quantity) { alert('Estoque insuficiente!'); return; }
        setResellerStock([...resellerStock, { id: generateId(), ...transferForm, quantity: parseInt(transferForm.quantity), date: transferForm.date || new Date().toISOString().split('T')[0] }]);
        setTransferForm({ resellerId: '', productId: '', quantity: 1, date: new Date().toISOString().split('T')[0] });
        setShowTransferModal(false);
    };

    const handleResellerSale = () => {
        const qty = parseInt(resellerSaleForm.quantity);
        if (!selectedReseller || !resellerSaleForm.productId || isNaN(qty) || qty <= 0) { alert("Selecione um produto e quantidade válida."); return; }
        const stockItems = resellerStock.filter(item => item.resellerId === selectedReseller.id && item.productId === resellerSaleForm.productId);
        if (stockItems.length === 0) { alert(`O revendedor não tem este produto. Estoque: 0`); return; }
        const totalStockForProduct = stockItems.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
        if (totalStockForProduct < qty) { alert(`Estoque insuficiente. Disponível: ${totalStockForProduct}`); return; }
        const product = products.find(p => p.id === resellerSaleForm.productId);
        const defaultPrice = product ? parseFloat(product.catalogPrice) : 0;
        const finalSalePrice = resellerSaleForm.salePrice ? parseFloat(resellerSaleForm.salePrice) : defaultPrice;
        const newSale = { id: generateId(), resellerId: selectedReseller.id, productId: resellerSaleForm.productId, quantity: qty, salePrice: finalSalePrice, date: resellerSaleForm.date || new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() };
        setResellerSales([...resellerSales, newSale]);
        const updatedResellerStock = resellerStock.map(item => {
            if (item.resellerId === selectedReseller.id && item.productId === resellerSaleForm.productId && item.quantity > 0) {
                return { ...item, quantity: parseInt(item.quantity) - qty };
            }
            return item;
        });
        setResellerStock(updatedResellerStock);
        setShowResellerSaleModal(false);
        setResellerSaleForm({ productId: '', quantity: 1, salePrice: '', date: new Date().toISOString().split('T')[0] });
    };

    const handleReturn = () => {
        const qty = parseInt(returnForm.quantity);
        if (!selectedReseller || !returnForm.productId || isNaN(qty) || qty <= 0) { alert("Selecione um produto e quantidade válida."); return; }
        const stockEntry = resellerStock.find(item => item.resellerId === selectedReseller.id && item.productId === returnForm.productId);
        if (!stockEntry || stockEntry.quantity < qty) { alert("O revendedor não tem essa quantidade para devolver."); return; }
        const newReturn = { id: generateId(), resellerId: selectedReseller.id, productId: returnForm.productId, quantity: qty, date: returnForm.date || new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() };
        setResellerReturns([...resellerReturns, newReturn]);
        const updatedResellerStock = resellerStock.map(item => {
            if (item.resellerId === selectedReseller.id && item.productId === returnForm.productId) {
                return { ...item, quantity: item.quantity - qty };
            }
            return item;
        });
        setResellerStock(updatedResellerStock);
        setShowReturnModal(false);
        setReturnForm({ productId: '', quantity: 1, date: new Date().toISOString().split('T')[0] });
    };

    const handleAddSale = () => {
        if (!saleForm.productId || saleForm.quantity <= 0) { alert('Produto e quantidade obrigatórios!'); return; }
        if (calculateStock(saleForm.productId) < saleForm.quantity) { alert('Estoque insuficiente!'); return; }
        const newSale = { id: generateId(), ...saleForm, quantity: parseInt(saleForm.quantity), price: parseFloat(saleForm.price), profit: (parseFloat(saleForm.price) - calculateAveragePrice(saleForm.productId)) * parseInt(saleForm.quantity) };
        setSales([...sales, newSale]);
        if (saleForm.paymentMethod === 'credito') {
            setCreditForm({ saleId: newSale.id, amount: newSale.price * newSale.quantity, dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], status: 'pendente' });
            setShowCreditModal(true);
        }
        setSaleForm({ productId: '', customerId: '', quantity: 1, price: 0, paymentMethod: 'bizum', date: new Date().toISOString().split('T')[0] });
        setShowSaleModal(false);
    };

    const handleEditSale = () => {
        if (!editingSale || !saleForm.productId || saleForm.quantity <= 0) { alert('Dados inválidos!'); return; }
        setSales(sales.map(s => s.id === editingSale.id ? { ...s, ...saleForm, quantity: parseInt(saleForm.quantity), price: parseFloat(saleForm.price), profit: (parseFloat(saleForm.price) - calculateAveragePrice(saleForm.productId)) * parseInt(saleForm.quantity) } : s));
        setEditingSale(null);
        setSaleForm({ productId: '', customerId: '', quantity: 1, price: 0, paymentMethod: 'bizum', date: new Date().toISOString().split('T')[0] });
        setShowEditSaleModal(false);
    };

    const openEditSale = (sale) => {
        setEditingSale(sale);
        setSaleForm({ productId: sale.productId, customerId: sale.customerId || '', quantity: sale.quantity, price: sale.price, paymentMethod: sale.paymentMethod, date: sale.date });
        setShowEditSaleModal(true);
    };

    const handleDeleteSale = () => { if (!deleteItem) return; setSales(sales.filter(s => s.id !== deleteItem.id)); setDeleteItem(null); setShowDeleteModal(false); };
    const confirmDeleteSale = (sale) => { setDeleteItem({ type: 'sale', ...sale }); setShowDeleteModal(true); };

    const handleAddPurchase = () => {
        if (!purchaseForm.productId || purchaseForm.quantity <= 0) { alert('Produto e quantidade obrigatórios!'); return; }
        setPurchases([...purchases, { id: generateId(), ...purchaseForm, quantity: parseInt(purchaseForm.quantity), price: parseFloat(purchaseForm.price) }]);
        setPurchaseForm({ productId: '', quantity: 1, price: 0, date: new Date().toISOString().split('T')[0] });
    };

    const handleAddCredit = () => {
        if (!creditForm.saleId || creditForm.amount <= 0) { alert('Dados inválidos!'); return; }
        setCreditSales([...creditSales, { id: generateId(), ...creditForm, amount: parseFloat(creditForm.amount), createdAt: new Date().toISOString() }]);
        setCreditForm({ saleId: '', amount: 0, dueDate: '', status: 'pendente' });
        setShowCreditModal(false);
    };

    const markCreditAsPaid = (creditId) => { setCreditSales(creditSales.map(c => c.id === creditId ? { ...c, status: 'pago' } : c)); };

    const handleAdjustStock = () => {
        if (!adjustStockProduct || !adjustStockForm.quantity || adjustStockForm.quantity <= 0) { alert('Dados inválidos!'); return; }
        setStockAdjustments([...stockAdjustments, { id: generateId(), productId: adjustStockProduct.id, productName: adjustStockProduct.name, ...adjustStockForm, quantity: parseInt(adjustStockForm.quantity), date: adjustStockForm.date || new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() }]);
        setAdjustStockProduct(null);
        setAdjustStockForm({ type: 'saida', reason: 'quebra', quantity: 1, notes: '', date: new Date().toISOString().split('T')[0] });
        setShowAdjustStockModal(false);
        alert('✅ Ajuste registrado!');
    };

    const openAdjustStock = (product) => {
        setAdjustStockProduct(product);
        setAdjustStockForm({ type: 'saida', reason: 'quebra', quantity: 1, notes: '', date: new Date().toISOString().split('T')[0] });
        setShowAdjustStockModal(true);
    };

    const openQuickBuy = (product) => {
        setQuickBuyProduct(product);
        setQuickBuyForm({ quantity: 5, price: calculateAveragePrice(product.id), date: new Date().toISOString().split('T')[0] });
        setShowQuickBuyModal(true);
    };

    const handleQuickBuy = () => {
        if (!quickBuyProduct || quickBuyForm.quantity <= 0 || quickBuyForm.price <= 0) { alert('Dados inválidos!'); return; }
        setPurchases([...purchases, { id: generateId(), productId: quickBuyProduct.id, quantity: parseInt(quickBuyForm.quantity), price: parseFloat(quickBuyForm.price), date: quickBuyForm.date || new Date().toISOString().split('T')[0] }]);
        setQuickBuyProduct(null);
        setQuickBuyForm({ quantity: 5, price: 0, date: new Date().toISOString().split('T')[0] });
        setShowQuickBuyModal(false);
        alert('✅ Compra registrada!');
    };

    const exportData = () => {
        const data = { exportDate: new Date().toISOString(), version: '3.0', products, purchases, sales, customers, creditSales, resellers, resellerStock, resellerSales, resellerReturns, stockAdjustments, config: { lowStockThreshold, expiryAlertDays, staleProductDays } };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_boticario_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportProductsCSV = (productsList, filename) => {
        const BOM = '﻿', separator = ';';
        const headers = ['Nome', 'Categoria', 'Preço Catálogo', 'Stock', 'Preço Custo', 'Valor Stock', 'Validade', 'Status'];
        const rows = productsList.map(p => {
            const stock = calculateStock(p.id), avgPrice = calculateAveragePrice(p.id);
            const value = stock * (parseFloat(p.catalogPrice) || 0);
            let status = stock === 0 ? 'Sem Stock' : stock < lowStockThreshold ? 'Baixo' : 'OK';
            const fmt = (num) => num.toString().replace('.', ',');
            return [p.name, p.category, fmt(parseFloat(p.catalogPrice) || 0), stock, fmt(avgPrice), fmt(value), p.expiryDate ? formatDate(p.expiryDate) : 'N/A', status].map(cell => `"${cell}"`).join(separator);
        });
        const csv = BOM + [headers.join(separator), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPurchaseHistory = () => {
        const BOM = '﻿', separator = ';';
        const headers = ['Data', 'Produto', 'Quantidade', 'Preço Unitário', 'Total'];
        const fmt = (num) => num.toString().replace('.', ',');
        const rows = filteredPurchaseHistory.map(p => {
            const product = products.find(prod => prod.id === p.productId);
            return [formatDate(p.date), product ? product.name : 'Produto removido', p.quantity, fmt(p.price), fmt(p.price * p.quantity)].map(cell => `"${cell}"`).join(separator);
        });
        const totalInvested = filteredPurchaseHistory.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        rows.push([], ['TOTAL INVESTIDO', '', '', '', fmt(totalInvested)]);
        const csv = BOM + [headers.join(separator), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `historico_compras_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.products) { alert('Arquivo inválido!'); return; }
                if (confirm(`Importar?\n• Produtos: ${data.products?.length || 0}\n• Revendedores: ${data.resellers?.length || 0}\n\n⚠️ SUBSTITUIRÁ dados atuais!`)) {
                    if (data.products) setProducts(data.products);
                    if (data.purchases) setPurchases(data.purchases);
                    if (data.sales) setSales(data.sales);
                    if (data.customers) setCustomers(data.customers);
                    if (data.creditSales) setCreditSales(data.creditSales);
                    if (data.resellers) setResellers(data.resellers);
                    if (data.resellerStock) setResellerStock(data.resellerStock);
                    if (data.resellerSales) setResellerSales(data.resellerSales);
                    if (data.resellerReturns) setResellerReturns(data.resellerReturns);
                    if (data.stockAdjustments) setStockAdjustments(data.stockAdjustments);
                    if (data.config) { setLowStockThreshold(data.config.lowStockThreshold || 3); setExpiryAlertDays(data.config.expiryAlertDays || 30); setStaleProductDays(data.config.staleProductDays || 30); }
                    alert('✅ Importado!');
                    setActiveTab('dashboard');
                }
            } catch (error) { alert('Erro ao ler arquivo!'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const triggerImport = () => { fileInputRef.current.click(); };

    const recuperarDados = async () => {
        if (!window.confirm('Recuperar todos os dados? Confirmar?')) return;
        try {
            const [doc1, doc2] = await Promise.all([
                db.collection('app_boticario').doc('banco_principal').get(),
                db.collection('app_boticario').doc('yYyTI37vC8MvHqKt1prZ1LbCWZd2').get()
            ]);
            const data1 = doc1.exists ? doc1.data() : {};
            const data2 = doc2.exists ? doc2.data() : {};
            const mergeArray = (arr1, arr2) => {
                const base = Array.isArray(arr1) ? arr1 : [];
                const nova = Array.isArray(arr2) ? arr2 : [];
                const ids = new Set(base.map(i => i.id));
                return [...base, ...nova.filter(i => i.id && !ids.has(i.id))];
            };
            const dadosFinais = {
                products: mergeArray(data1.products, data2.products),
                purchases: mergeArray(data1.purchases, data2.purchases),
                sales: mergeArray(data1.sales, data2.sales),
                customers: mergeArray(data1.customers, data2.customers),
                creditSales: mergeArray(data1.creditSales, data2.creditSales),
                resellers: mergeArray(data1.resellers, data2.resellers),
                resellerStock: mergeArray(data1.resellerStock, data2.resellerStock),
                resellerSales: mergeArray(data1.resellerSales, data2.resellerSales),
                resellerReturns: mergeArray(data1.resellerReturns, data2.resellerReturns),
                stockAdjustments: mergeArray(data1.stockAdjustments, data2.stockAdjustments)
            };
            await db.collection('app_boticario').doc('banco_principal').set(dadosFinais);
            setProducts(dadosFinais.products || []);
            setPurchases(dadosFinais.purchases || []);
            setSales(dadosFinais.sales || []);
            setCustomers(dadosFinais.customers || []);
            setCreditSales(dadosFinais.creditSales || []);
            setResellers(dadosFinais.resellers || []);
            setResellerStock(dadosFinais.resellerStock || []);
            setResellerSales(dadosFinais.resellerSales || []);
            setResellerReturns(dadosFinais.resellerReturns || []);
            setStockAdjustments(dadosFinais.stockAdjustments || []);
            alert(
                '✅ DADOS RECUPERADOS!\n\n' +
                'Produtos: ' + dadosFinais.products.length + '\n' +
                'Compras: ' + dadosFinais.purchases.length + '\n' +
                'Vendas: ' + dadosFinais.sales.length + '\n' +
                'Revendedores: ' + dadosFinais.resellers.length + '\n' +
                'Clientes: ' + dadosFinais.customers.length
            );
        } catch(e) {
            alert('Erro: ' + e.message);
        }
    };

    const handleRegisterVisit = (resellerId) => {
        const today = new Date().toISOString().split('T')[0];
        const updatedResellers = resellers.map(r => r.id === resellerId ? { ...r, lastVisitDate: today } : r);
        isReceivingData.current = false;
        setResellers(updatedResellers);
    };
    const handleVisitReseller = handleRegisterVisit;

    const productOptions = useMemo(() => products.map(p => ({ value: p.id, label: p.name, stock: calculateStock(p.id), avgPrice: calculateAveragePrice(p.id) })), [products, purchases, sales, resellerStock, resellerSales, resellerReturns, stockAdjustments]);
    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.name, phone: c.phone || '' })), [customers]);
    const resellerOptions = useMemo(() => resellers.map(r => ({ value: r.id, label: r.name, salon: r.salonName })), [resellers]);

    // ==================== RENDER ====================
    if (!user) {
        return (
            <div className="min-h-screen boticario-gradient flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="text-center mb-8">
                        <i className="fas fa-store text-5xl text-purple-600 mb-4"></i>
                        <h1 className="text-2xl font-bold text-gray-800">{isRegistering ? 'Criar Nova Conta' : 'Acesso ao Sistema'}</h1>
                        <p className="text-gray-500 mt-2">Gestão de Revenda</p>
                    </div>
                    <form onSubmit={handleAuth} className="space-y-6">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Username ou E-mail</label>
                            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="admin@email.com ou username" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
                            <input type="password" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        {authError && <div className="alert-red text-red-700 p-3 rounded text-sm">{authError}</div>}
                        <button type="submit" className="w-full boticario-gradient text-white font-bold py-3 px-4 rounded-lg hover:opacity-90">{isRegistering ? 'Cadastrar' : 'Entrar no Sistema'}</button>
                    </form>
                    <div className="text-center mt-6">
                        <button onClick={() => setIsRegistering(!isRegistering)} className="text-purple-600 text-sm font-medium">{isRegistering ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}</button>
                    </div>
                </div>
            </div>
        );
    }

    if (profileLoading || !userProfile) {
        return (
            <div className="min-h-screen boticario-gradient flex items-center justify-center">
                <div className="text-white text-center"><i className="fas fa-spinner fa-spin text-4xl mb-4"></i><p className="text-lg">A carregar perfil...</p></div>
            </div>
        );
    }

    if (userProfile.role === 'comercial') {
        const allData = { products, resellers, resellerStock, resellerSales, resellerReturns, sales, purchases, stockAdjustments, adminUid: userProfile.adminUid };
        return <ComercialApp user={user} userProfile={userProfile} allData={allData} onLogout={handleLogout} />;
    }

    return (
        <div className="min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" style={{ display: 'none' }} />

            <header className="boticario-gradient text-white p-4 md:p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold"><i className="fas fa-store mr-3"></i>Gestão O Boticário</h1>
                        <p className="text-white/80 mt-1 text-xs md:text-sm"><i className="fas fa-user-circle mr-1"></i>{user?.email}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <button onClick={triggerImport} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg transition text-sm"><i className="fas fa-upload mr-2"></i><span className="hidden sm:inline">Importar</span></button>
                        <button onClick={exportData} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition text-sm"><i className="fas fa-download mr-2"></i><span className="hidden sm:inline">Exportar</span></button>
                        <button onClick={() => setActiveTab('config')} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition"><i className="fas fa-cog"></i></button>
                        <button onClick={async () => { const doc = await db.collection('app_boticario').doc('banco_principal').get(); console.log('Doc exists:', doc.exists); console.log('Data:', JSON.stringify(doc.data())); alert('Doc exists: ' + doc.exists + '\nProdutos: ' + (doc.data()?.products?.length || 0)); }} className="bg-red-500 text-white px-2 py-1 rounded text-xs">DEBUG</button>
                        <button onClick={recuperarDados} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition text-sm font-bold">🔧 Recuperar Dados</button>
                        <button onClick={handleLogout} className="bg-red-500/30 hover:bg-red-500/50 px-3 py-2 rounded-lg transition text-sm" title="Sair"><i className="fas fa-sign-out-alt mr-1"></i><span className="hidden sm:inline">Sair</span></button>
                    </div>
                </div>
            </header>

            <nav className="bg-white shadow-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto">
                    <div className="flex overflow-x-auto">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
                            { id: 'stock', label: 'Stock', icon: 'fa-warehouse' },
                            { id: 'resellers', label: 'Revendedores', icon: 'fa-handshake' },
                            { id: 'products', label: 'Produtos', icon: 'fa-box' },
                            { id: 'sales', label: 'Vendas', icon: 'fa-shopping-cart' },
                            { id: 'purchases', label: 'Compras', icon: 'fa-truck' },
                            { id: 'customers', label: 'Clientes', icon: 'fa-users' },
                            { id: 'credits', label: 'Fiado', icon: 'fa-hand-holding-usd' },
                            { id: 'reports', label: 'Relatórios', icon: 'fa-file-invoice-dollar' }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 md:px-6 py-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-600 hover:text-purple-600'}`}>
                                <i className={`fas ${tab.icon}`}></i>
                                <span className="hidden md:inline">{tab.label}</span>
                                {tab.id === 'resellers' && resellers.length > 0 && <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">{resellers.length}</span>}
                                {tab.id === 'credits' && pendingCreditSales.length > 0 && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{pendingCreditSales.length}</span>}
                                {tab.id === 'stock' && pendingOrders.length > 0 && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders.length}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 md:p-6">
                {/* DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Vendas do Mês" value={formatCurrency(safeNumber(financialReport.totalSold))} icon="fa-shopping-cart" color="border-green-400" />
                            <StatCard title="Investido no Mês" value={formatCurrency(safeNumber(financialReport.totalInvested))} icon="fa-wallet" color="border-red-400" />
                            <StatCard title="Lucro Líquido" value={formatCurrency(safeNumber(financialReport.totalProfit))} icon="fa-coins" color="border-blue-400" />
                            <StatCard title="Fiado Pendente" value={formatCurrency(pendingCreditSales.reduce((sum, c) => sum + c.amount, 0))} icon="fa-hand-holding-usd" color="border-yellow-400" />
                        </div>
                        {resellers.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <StatCard title="💰 Vendas Revendedores (Mês)" value={formatCurrency(resellerSales.filter(s => new Date(s.date) >= getMonthRange().start && new Date(s.date) <= getMonthRange().end).reduce((sum, s) => sum + ((parseFloat(s.salePrice) || 0) * parseInt(s.quantity)), 0))} icon="fa-store" color="border-green-400" />
                                <StatCard title="📦 Produtos em Comodato" value={resellerStock.reduce((sum, t) => sum + (t.quantity > 0 ? t.quantity : 0), 0)} icon="fa-boxes" color="border-purple-400" smallText={`${resellerStock.reduce((sum, t) => sum + (t.quantity > 0 ? t.quantity : 0), 0)} itens`} subValues={[{ label: "Valor Custo", value: formatCurrency(stockValueReport.resellerPaidValue), color: "text-blue-700" }, { label: "Valor Venda", value: formatCurrency(stockValueReport.resellerSaleValue), color: "text-green-700" }]} />
                                <StatCard title="💵 A Receber" value={formatCurrency(resellerSales.filter(s => new Date(s.date) >= getMonthRange().start && new Date(s.date) <= getMonthRange().end).reduce((sum, sale) => { const rev = resellers.find(r => r.id === sale.resellerId); const comissao = rev ? parseFloat(rev.commissionRate) / 100 : 0; const valorBruto = (parseFloat(sale.salePrice) || 0) * parseInt(sale.quantity); return sum + (valorBruto - (valorBruto * comissao)); }, 0))} icon="fa-euro-sign" color="border-yellow-400" />
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="📦 Estoque (Preço Pago)" value={formatCurrency(safeNumber(stockValueReport.totalPaidValue))} icon="fa-boxes" color="border-purple-400" smallText="Quanto investiu" />
                            <StatCard title="💰 Estoque (Preço Venda)" value={formatCurrency(safeNumber(stockValueReport.totalSaleValue))} icon="fa-tag" color="border-green-400" smallText="Preço catálogo" />
                            <StatCard title="🎯 Lucro Potencial" value={formatCurrency(safeNumber(stockValueReport.potentialProfit))} icon="fa-chart-line" color={stockValueReport.potentialProfit >= 0 ? "border-green-400" : "border-red-400"} smallText={`Margem: ${safeNumber(stockValueReport.profitMargin).toFixed(1)}%`} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {lowStockProducts.length > 0 && (<div className="alert-red rounded-lg p-4"><h3 className="font-bold text-red-800 mb-2"><i className="fas fa-exclamation-triangle mr-2"></i>Estoque Baixo ({lowStockProducts.length})</h3><ul className="space-y-1">{lowStockProducts.slice(0, 5).map(p => <li key={p.id} className="text-red-700 text-sm">• {p.name} - {calculateStock(p.id)} un.</li>)}</ul></div>)}
                            {expiryAlertProducts.length > 0 && (<div className="alert-yellow rounded-lg p-4"><h3 className="font-bold text-yellow-800 mb-2"><i className="fas fa-clock mr-2"></i>Validade Próxima ({expiryAlertProducts.length})</h3><ul className="space-y-1">{expiryAlertProducts.slice(0, 5).map(p => <li key={p.id} className="text-yellow-700 text-sm">• {p.name} - {calculateDaysUntilExpiry(p.expiryDate)} dias</li>)}</ul></div>)}
                            {staleResellerProducts.length > 0 && (<div className="alert-blue rounded-lg p-4"><h3 className="font-bold text-blue-800 mb-2"><i className="fas fa-exclamation-circle mr-2"></i>Produtos Parados ({staleResellerProducts.length})</h3><ul className="space-y-1">{staleResellerProducts.slice(0, 5).map(p => <li key={p.id} className="text-blue-700 text-sm">• {p.productName} em {p.resellerName} - {p.days} dias</li>)}</ul></div>)}
                        </div>
                    </div>
                )}

                {/* STOCK */}
                {activeTab === 'stock' && (
                    <div className="space-y-4">
                        {pendingOrders.length > 0 && (
                            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-400">
                                <h3 className="font-bold text-gray-800 mb-3"><i className="fas fa-clipboard-list mr-2 text-yellow-500"></i>Encomendas Pendentes ({pendingOrders.length})</h3>
                                <div className="space-y-2">
                                    {pendingOrders.map(order => {
                                        const produto = products.find(p => p.id === order.productId);
                                        const revendedor = resellers.find(r => r.id === order.resellerId);
                                        return (
                                            <div key={order.id} className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                <div>
                                                    <p className="font-medium text-gray-800">{produto?.name || order.productId} — {order.quantity} un.</p>
                                                    <p className="text-xs text-gray-500">Salão: {revendedor?.salonName || order.resellerId} • Comercial: {order.comercialName}</p>
                                                    {order.notes && <p className="text-xs text-gray-400 italic">{order.notes}</p>}
                                                </div>
                                                <div className="flex gap-2 ml-3">
                                                    <button onClick={() => handleApproveOrder(order)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"><i className="fas fa-check mr-1"></i>Aprovar</button>
                                                    <button onClick={() => handleRejectOrder(order)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"><i className="fas fa-times mr-1"></i>Rejeitar</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-gray-800"><i className="fas fa-warehouse mr-2"></i>Controle de Stock</h2>
                            <div className="flex gap-2">
                                <span className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow"><i className="fas fa-box mr-2"></i>{products.length} produtos</span>
                                <span className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow"><i className="fas fa-exclamation-triangle mr-2 text-red-500"></i>{lowStockProducts.length} críticos</span>
                            </div>
                        </div>
                        <FilterBar searchTerm={stockSearchTerm} onSearchChange={setStockSearchTerm} categoryFilter={stockCategoryFilter} onCategoryChange={setStockCategoryFilter} statusFilter={stockStatusFilter} onStatusChange={setStockStatusFilter} sortBy={stockSortBy} onSortChange={setStockSortBy} expiryFilter={stockExpiryFilter} onExpiryChange={setStockExpiryFilter} totalItems={products.length} filteredItems={filteredStock.length} onExport={() => exportProductsCSV(filteredStock, `stock_boticario_${new Date().toISOString().split('T')[0]}.csv`)} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4"><p className="text-purple-100 text-sm">Valor Pago em Stock</p><p className="text-2xl font-bold">{formatCurrency(safeNumber(stockValueReport.totalPaidValue))}</p></div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4"><p className="text-green-100 text-sm">Valor Venda em Stock</p><p className="text-2xl font-bold">{formatCurrency(safeNumber(stockValueReport.totalSaleValue))}</p></div>
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4"><p className="text-blue-100 text-sm">Lucro Potencial</p><p className="text-2xl font-bold">{formatCurrency(safeNumber(stockValueReport.potentialProfit))}</p></div>
                        </div>
                        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                            <table className="w-full min-w-[1200px]">
                                <thead className="bg-gray-50"><tr><th className="p-4 text-left">Produto</th><th className="p-4 text-left">Categoria</th><th className="p-4 text-center">Stock</th><th className="p-4 text-center">Status</th><th className="p-4 text-left">Preço Pago</th><th className="p-4 text-left">Preço Catálogo</th><th className="p-4 text-left">Valor Stock</th><th className="p-4 text-left">Validade</th><th className="p-4 text-center">Ações</th></tr></thead>
                                <tbody>
                                    {filteredStock.map(p => {
                                        const stock = calculateStock(p.id), avgPrice = calculateAveragePrice(p.id);
                                        const value = stock * (parseFloat(p.catalogPrice) || 0);
                                        const daysToExpiry = p.expiryDate ? calculateDaysUntilExpiry(p.expiryDate) : null;
                                        return (
                                            <tr key={p.id} className={`border-t ${stock < lowStockThreshold ? 'bg-red-50' : stock < lowStockThreshold * 2 ? 'bg-yellow-50' : ''}`}>
                                                <td className="p-4 font-medium">{p.name}</td>
                                                <td className="p-4"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">{p.category}</span></td>
                                                <td className="p-4 text-center"><span className={`font-bold text-lg ${stock === 0 ? 'text-red-600' : stock < lowStockThreshold ? 'text-orange-600' : 'text-green-600'}`}>{stock}</span></td>
                                                <td className="p-4 text-center">{stock === 0 ? <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">SEM STOCK</span> : stock < lowStockThreshold ? <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-bold">BAIXO</span> : <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">OK</span>}</td>
                                                <td className="p-4">{formatCurrency(avgPrice)}</td>
                                                <td className="p-4">{formatCurrency(parseFloat(p.catalogPrice) || 0)}</td>
                                                <td className="p-4 font-medium">{formatCurrency(value)}</td>
                                                <td className="p-4">{p.expiryDate ? <span className={daysToExpiry <= expiryAlertDays ? 'text-red-600 font-bold' : 'text-gray-600'}>{formatDate(p.expiryDate)}{daysToExpiry && daysToExpiry <= expiryAlertDays && <span className="block text-xs">({daysToExpiry} dias)</span>}</span> : '-'}</td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-1 flex-wrap">
                                                        <button onClick={() => openEditProduct(p)} className="btn-edit text-white px-2 py-1.5 rounded text-xs"><i className="fas fa-edit"></i></button>
                                                        <button onClick={() => openAdjustStock(p)} className="btn-adjust text-white px-2 py-1.5 rounded text-xs"><i className="fas fa-sliders-h"></i></button>
                                                        {stock < lowStockThreshold && <button onClick={() => openQuickBuy(p)} className="btn-buy text-white px-2 py-1.5 rounded text-xs"><i className="fas fa-cart-plus"></i></button>}
                                                        {resellers.length > 0 && stock > 0 && <button onClick={() => { setTransferForm({ ...transferForm, productId: p.id, quantity: 1 }); setShowTransferModal(true); }} className="btn-transfer text-white px-2 py-1.5 rounded text-xs"><i className="fas fa-exchange-alt"></i></button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredStock.length === 0 && <div className="p-8 text-center text-gray-500"><i className="fas fa-search text-4xl mb-3"></i><p>Nenhum produto encontrado</p><button onClick={() => { setStockSearchTerm(''); setStockCategoryFilter('todos'); setStockStatusFilter('todos'); setStockExpiryFilter('all'); setStockSortBy('name'); }} className="mt-3 text-purple-600 hover:underline">Limpar filtros</button></div>}
                        </div>
                    </div>
                )}

                {/* REVENDEDORES */}
                {activeTab === 'resellers' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-gray-800"><i className="fas fa-handshake mr-2"></i>Gestão de Revendedores</h2>
                            <button onClick={() => setShowResellerModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm"><i className="fas fa-plus mr-2"></i>Novo Revendedor</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4"><p className="text-purple-100 text-sm">Total Revendedores</p><p className="text-2xl font-bold">{resellers.length}</p></div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4"><p className="text-green-100 text-sm">Vendas Totais</p><p className="text-2xl font-bold">{formatCurrency(resellerSales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0))}</p></div>
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4"><p className="text-blue-100 text-sm">Seu Ganho</p><p className="text-2xl font-bold">{formatCurrency(resellerSales.reduce((sum, s) => { const rev = resellers.find(r => r.id === s.resellerId); const rate = rev ? rev.commissionRate : 25; return sum + (s.salePrice * s.quantity) * ((100 - rate) / 100); }, 0))}</p></div>
                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4"><p className="text-orange-100 text-sm">Comissões</p><p className="text-2xl font-bold">{formatCurrency(resellerSales.reduce((sum, s) => { const rev = resellers.find(r => r.id === s.resellerId); const rate = rev ? rev.commissionRate : 25; return sum + (s.salePrice * s.quantity) * (rate / 100); }, 0))}</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {resellers.map(r => {
                                const vendasDesteRevendedor = resellerSales.filter(venda => venda.resellerId === r.id);
                                const totalVendido = vendasDesteRevendedor.reduce((acc, venda) => acc + (venda.salePrice * venda.quantity), 0);
                                const valorComissao = totalVendido * (r.commissionRate / 100);
                                const valorAReceber = totalVendido - valorComissao;
                                const estoqueDesteRevendedor = resellerStock.filter(item => item.resellerId === r.id && item.quantity > 0);
                                const capitalRetido = estoqueDesteRevendedor.reduce((acc, item) => { const produto = products.find(p => p.id === item.productId); return acc + (item.quantity * (produto ? parseFloat(produto.costPrice || 0) : 0)); }, 0);
                                const lucroPotencial = estoqueDesteRevendedor.reduce((acc, item) => { const produto = products.find(p => p.id === item.productId); return acc + (item.quantity * (produto ? parseFloat(produto.catalogPrice || 0) : 0)); }, 0);
                                return (
                                    <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-lg">{r.salonName}<span title={`Última visita: ${r.lastVisitDate ? formatDate(r.lastVisitDate) : 'Nunca'}`} className="ml-2 cursor-pointer"><i className={`fas fa-circle text-xs ${getVisitStatusColor(getDaysSince(r.lastVisitDate))}`}></i></span></h3>
                                                <p className="text-gray-500 text-sm"><i className="fas fa-user text-xs mr-1"></i> {r.name}</p>
                                                {(() => { const com = comerciais.find(c => (c.assignedResellers||[]).includes(r.id)); return com ? <span className="text-xs text-purple-600 font-medium"><i className="fas fa-star text-xs mr-1"></i>{com.name}</span> : null; })()}
                                            </div>
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">{r.commissionRate}%</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg mb-4 space-y-1">
                                            <div className="flex justify-between text-sm"><span className="text-gray-600">Total Vendido:</span><span className="font-bold text-gray-800">{formatCurrency(totalVendido)}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-gray-600">Comissão ({r.commissionRate}%):</span><span className="font-bold text-orange-600">{formatCurrency(valorComissao)}</span></div>
                                            <div className="flex justify-between text-sm pt-1 border-t mt-1"><span className="text-gray-800 font-medium">A Receber:</span><span className="font-bold text-green-600">{formatCurrency(valorAReceber)}</span></div>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded-lg mb-4 space-y-2 border border-blue-200">
                                            <div className="flex items-center gap-2 mb-2"><i className="fas fa-boxes text-blue-600"></i><h4 className="font-medium text-blue-900">Estoque em Comodato</h4></div>
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex justify-between text-sm"><span className="text-blue-700">Capital Retido (Custo):</span><span className="font-bold text-blue-800">{formatCurrency(capitalRetido)}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-blue-700">Lucro Potencial (Rua):</span><span className="font-bold text-green-700">{formatCurrency(lucroPotencial)}</span></div>
                                                <div className="flex justify-between text-sm pt-1 border-t border-blue-300"><span className="text-blue-900 font-medium">Margem Potencial:</span><span className="font-bold text-purple-700">{lucroPotencial > 0 ? `${((lucroPotencial - capitalRetido) / lucroPotencial * 100).toFixed(1)}%` : '0%'}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            <button onClick={() => { setSelectedReseller(r); setShowResellerSaleModal(true); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition text-sm font-medium"><i className="fas fa-euro-sign"></i> Venda</button>
                                            <button onClick={() => { setSelectedReseller(r); setShowTransferModal(true); }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded transition text-sm font-medium"><i className="fas fa-exchange-alt"></i> Stock</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <button onClick={() => { setSelectedReseller(r); setShowReturnModal(true); }} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded transition text-sm font-medium"><i className="fas fa-undo"></i> Devolver</button>
                                            <button onClick={() => { setSelectedResellerInventory(r); setShowInventoryModal(true); }} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded transition text-sm font-medium"><i className="fas fa-boxes"></i></button>
                                            <button onClick={() => { setSelectedResellerForHistory(r); setShowSalesHistoryModal(true); }} className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded transition text-sm font-medium"><i className="fas fa-history"></i> Histórico</button>
                                            <button onClick={() => handleVisitReseller(r.id)} className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded transition text-sm font-medium"><i className="fas fa-handshake"></i></button>
                                            <button onClick={() => confirmDeleteReseller(r)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded transition text-sm font-medium"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {resellers.length === 0 && <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500"><i className="fas fa-handshake text-4xl mb-3"></i><p>Nenhum revendedor cadastrado</p></div>}
                    </div>
                )}

                {/* PRODUTOS */}
                {activeTab === 'products' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-gray-800">Cadastro de Produtos</h2>
                            <button onClick={() => setShowProductModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm"><i className="fas fa-plus mr-2"></i>Novo Produto</button>
                        </div>
                        <FilterBar searchTerm={productSearchTerm} onSearchChange={setProductSearchTerm} categoryFilter={productCategoryFilter} onCategoryChange={setProductCategoryFilter} statusFilter={productStatusFilter} onStatusChange={setProductStatusFilter} sortBy={productSortBy} onSortChange={setProductSortBy} expiryFilter={productExpiryFilter} onExpiryChange={setProductExpiryFilter} totalItems={products.length} filteredItems={filteredProducts.length} onExport={() => exportProductsCSV(filteredProducts, `produtos_boticario_${new Date().toISOString().split('T')[0]}.csv`)} />
                        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                            <table className="w-full min-w-[1000px]">
                                <thead className="bg-gray-50"><tr><th className="p-4 text-left">Produto</th><th className="p-4 text-left">Categoria</th><th className="p-4 text-left">Fragrância</th><th className="p-4 text-left">Ciclo</th><th className="p-4 text-left">Preço Catálogo</th><th className="p-4 text-left">Validade</th><th className="p-4 text-center">Stock</th><th className="p-4 text-center">Ações</th></tr></thead>
                                <tbody>
                                    {filteredProducts.map(p => {
                                        const stock = calculateStock(p.id);
                                        const daysToExpiry = p.expiryDate ? calculateDaysUntilExpiry(p.expiryDate) : null;
                                        return (
                                            <tr key={p.id} className={`border-t ${stock < lowStockThreshold ? 'bg-red-50' : daysToExpiry && daysToExpiry <= expiryAlertDays ? 'bg-yellow-50' : ''}`}>
                                                <td className="p-4 font-medium">{p.name}</td>
                                                <td className="p-4"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">{p.category}</span></td>
                                                <td className="p-4">{p.fragrance || '-'}</td>
                                                <td className="p-4">{p.cycle || '-'}</td>
                                                <td className="p-4 font-medium">{formatCurrency(parseFloat(p.catalogPrice) || 0)}</td>
                                                <td className="p-4">{p.expiryDate ? <span className={daysToExpiry <= expiryAlertDays ? 'text-red-600 font-bold' : ''}>{formatDate(p.expiryDate)}{daysToExpiry <= expiryAlertDays && ` (${daysToExpiry}d)`}</span> : '-'}</td>
                                                <td className="p-4 text-center"><span className={`font-bold ${stock < lowStockThreshold ? 'text-red-600' : 'text-green-600'}`}>{stock} un.</span></td>
                                                <td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => openEditProduct(p)} className="btn-edit text-white px-3 py-1 rounded text-sm"><i className="fas fa-edit"></i></button><button onClick={() => confirmDeleteProduct(p)} className="btn-delete text-white px-3 py-1 rounded text-sm"><i className="fas fa-trash"></i></button></div></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredProducts.length === 0 && <div className="p-8 text-center text-gray-500"><i className="fas fa-search text-4xl mb-3"></i><p>Nenhum produto encontrado</p><button onClick={() => { setProductSearchTerm(''); setProductCategoryFilter('todos'); setProductStatusFilter('todos'); setProductExpiryFilter('all'); setProductSortBy('name'); }} className="mt-3 text-purple-600 hover:underline">Limpar filtros</button></div>}
                        </div>
                    </div>
                )}

                {/* VENDAS */}
                {activeTab === 'sales' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-gray-800">Registro de Vendas</h2>
                            <button onClick={() => setShowSaleModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm"><i className="fas fa-plus mr-2"></i>Nova Venda</button>
                        </div>
                        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                            <table className="w-full min-w-[1000px]">
                                <thead className="bg-gray-50"><tr><th className="p-4 text-left">Data</th><th className="p-4 text-left">Produto</th><th className="p-4 text-left">Cliente</th><th className="p-4 text-center">Qtd</th><th className="p-4 text-left">Preço Unit.</th><th className="p-4 text-left">Total</th><th className="p-4 text-left">Lucro</th><th className="p-4 text-left">Pagamento</th><th className="p-4 text-center">Ações</th></tr></thead>
                                <tbody>
                                    {sales.slice().reverse().map(s => {
                                        const product = products.find(p => p.id === s.productId);
                                        const customer = customers.find(c => c.id === s.customerId);
                                        return (
                                            <tr key={s.id} className="border-t">
                                                <td className="p-4">{formatDate(s.date)}</td>
                                                <td className="p-4 font-medium">{product?.name || 'Produto removido'}</td>
                                                <td className="p-4">{customer?.name || 'Não informado'}</td>
                                                <td className="p-4 text-center">{s.quantity}</td>
                                                <td className="p-4">{formatCurrency(s.price)}</td>
                                                <td className="p-4 font-bold">{formatCurrency(s.price * s.quantity)}</td>
                                                <td className="p-4"><span className={s.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(s.profit)}</span></td>
                                                <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{s.paymentMethod}</span></td>
                                                <td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => openEditSale(s)} className="btn-edit text-white px-3 py-1 rounded text-sm"><i className="fas fa-edit"></i></button><button onClick={() => confirmDeleteSale(s)} className="btn-delete text-white px-3 py-1 rounded text-sm"><i className="fas fa-trash"></i></button></div></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {sales.length === 0 && <div className="p-8 text-center text-gray-500"><i className="fas fa-shopping-cart text-4xl mb-3"></i><p>Nenhuma venda registrada</p></div>}
                        </div>
                    </div>
                )}

                {/* COMPRAS */}
                {activeTab === 'purchases' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-gray-800">Gestão de Compras</h2>
                            <button onClick={() => setShowPurchaseHistoryModal(true)} className="btn-history text-white px-4 py-2 rounded-lg transition text-sm"><i className="fas fa-history mr-2"></i>Histórico de Compras</button>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4"><i className="fas fa-trophy text-yellow-500 mr-2"></i>🏆 Top 5 Produtos Mais Vendidos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {topSellingProducts.map((p, idx) => (
                                    <div key={p.id} className={`text-center p-4 rounded-lg ${idx === 0 ? 'bg-yellow-50 border-2 border-yellow-400' : 'bg-gray-50'}`}>
                                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold mb-2 ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-500' : 'bg-gray-300'}`}>{idx + 1}</div>
                                        <p className="font-bold text-sm mb-1">{p.name}</p>
                                        <p className="text-2xl font-bold text-purple-600">{p.totalSold}</p>
                                        <p className="text-xs text-gray-500">unidades</p>
                                        <p className="text-sm font-medium text-green-600 mt-2">{formatCurrency(p.totalRevenue)}</p>
                                    </div>
                                ))}
                            </div>
                            {topSellingProducts.length === 0 && <p className="text-gray-500 text-center py-4">Nenhuma venda registrada ainda</p>}
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h3 className="text-lg font-bold mb-4">Registrar Entrada de Mercadoria</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                <SearchableDropdown label="Produto *" options={productOptions} value={purchaseForm.productId} onChange={(value) => setPurchaseForm({...purchaseForm, productId: value})} placeholder="Selecione o produto" renderOption={(option) => (<div><div className="font-medium">{option.label}</div><div className="text-xs text-gray-500">Stock: {option.stock} un.</div></div>)} />
                                <input type="number" placeholder="Quantidade" min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({...purchaseForm, quantity: e.target.value})} className="border rounded-lg p-3 text-sm" />
                                <input type="number" placeholder="Preço Unitário (R$)" min="0" step="0.01" value={purchaseForm.price} onChange={(e) => setPurchaseForm({...purchaseForm, price: e.target.value})} className="border rounded-lg p-3 text-sm" />
                                <input type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({...purchaseForm, date: e.target.value})} className="border rounded-lg p-3 text-sm" />
                            </div>
                            <button onClick={handleAddPurchase} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"><i className="fas fa-save mr-2"></i>Registrar Compra</button>
                        </div>
                    </div>
                )}

                {/* CLIENTES */}
                {activeTab === 'customers' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-gray-800">Gestão de Clientes</h2>
                            <button onClick={() => setShowCustomerModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm"><i className="fas fa-user-plus mr-2"></i>Novo Cliente</button>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-gray-700 font-medium"><i className="fas fa-filter mr-2"></i>Ordenar por:</span>
                                <button onClick={() => setCustomerSort('default')} className={`px-4 py-2 rounded-lg transition text-sm ${customerSort === 'default' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Recentes</button>
                                <button onClick={() => setCustomerSort('spent')} className={`px-4 py-2 rounded-lg transition text-sm ${customerSort === 'spent' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Mais Gastaram</button>
                                <button onClick={() => setCustomerSort('purchases')} className={`px-4 py-2 rounded-lg transition text-sm ${customerSort === 'purchases' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Mais Compras</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customersWithStats.sort((a, b) => customerSort === 'spent' ? b.totalSpent - a.totalSpent : customerSort === 'purchases' ? b.totalPurchases - a.totalPurchases : 0).map(c => (
                                <div key={c.id} className="bg-white rounded-lg shadow-md p-4 card-hover">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><i className="fas fa-user text-purple-600"></i></div>
                                            <div><h3 className="font-bold">{c.name}</h3><p className="text-gray-500 text-sm">{c.phone || 'Sem telefone'}</p></div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEditCustomer(c)} className="btn-edit text-white px-2 py-1 rounded text-xs"><i className="fas fa-edit"></i></button>
                                            <button onClick={() => confirmDeleteCustomer(c)} className="btn-delete text-white px-2 py-1 rounded text-xs"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p><i className="fas fa-shopping-bag mr-2"></i>{c.totalPurchases} compras</p>
                                        <p><i className="fas fa-euro-sign mr-2"></i>Total: {formatCurrency(c.totalSpent)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {customers.length === 0 && <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500"><i className="fas fa-users text-4xl mb-3"></i><p>Nenhum cliente cadastrado</p></div>}
                    </div>
                )}

                {/* FIADO */}
                {activeTab === 'credits' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-gray-800"><i className="fas fa-hand-holding-usd mr-2"></i>Controle de Fiado</h2>
                            <button onClick={() => { setCreditForm({ saleId: '', amount: 0, dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], status: 'pendente' }); setShowCreditModal(true); }} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition text-sm"><i className="fas fa-plus mr-2"></i>Novo Registro</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg p-4"><p className="text-yellow-100 text-sm">Total Pendente</p><p className="text-2xl font-bold">{formatCurrency(pendingCreditSales.reduce((sum, c) => sum + c.amount, 0))}</p></div>
                            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-4"><p className="text-red-100 text-sm">Vencidos</p><p className="text-2xl font-bold">{pendingCreditSales.filter(c => new Date(c.dueDate) < new Date()).length}</p></div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4"><p className="text-green-100 text-sm">Total Recebido</p><p className="text-2xl font-bold">{formatCurrency(creditSales.filter(c => c.status === 'pago').reduce((sum, c) => sum + c.amount, 0))}</p></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <h3 className="text-lg font-bold text-red-600 mb-3"><i className="fas fa-clock mr-2"></i>Pendentes ({pendingCreditSales.length})</h3>
                                <div className="space-y-2">
                                    {pendingCreditSales.map(c => {
                                        const sale = sales.find(s => s.id === c.saleId);
                                        const customer = sale ? customers.find(cust => cust.id === sale.customerId) : null;
                                        const isOverdue = new Date(c.dueDate) < new Date();
                                        const daysLeft = calculateDaysUntilExpiry(c.dueDate);
                                        return (
                                            <div key={c.id} className={`p-3 rounded-lg border-l-4 ${isOverdue ? 'alert-red' : 'alert-yellow'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div><p className="font-bold text-sm">{customer?.name || 'Cliente não informado'}</p><p className="text-xs">Vence: {formatDate(c.dueDate)}{isOverdue ? <span className="text-red-600 font-bold"> ({Math.abs(daysLeft)} dias atrasado)</span> : <span className="text-yellow-600"> (em {daysLeft} dias)</span>}</p></div>
                                                    <div className="text-right"><p className="font-bold">{formatCurrency(c.amount)}</p><button onClick={() => markCreditAsPaid(c.id)} className="mt-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"><i className="fas fa-check mr-1"></i>Marcar Pago</button></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {pendingCreditSales.length === 0 && <div className="text-center py-8 text-gray-500"><i className="fas fa-check-circle text-4xl mb-3 text-green-500"></i><p>Nenhuma venda pendente!</p></div>}
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <h3 className="text-lg font-bold text-green-600 mb-3"><i className="fas fa-check-circle mr-2"></i>Pagos ({creditSales.filter(c => c.status === 'pago').length})</h3>
                                <div className="space-y-2">
                                    {creditSales.filter(c => c.status === 'pago').map(c => {
                                        const sale = sales.find(s => s.id === c.saleId);
                                        const customer = sale ? customers.find(cust => cust.id === sale.customerId) : null;
                                        return (<div key={c.id} className="p-3 rounded-lg border-l-4 alert-green"><div className="flex justify-between"><div><p className="font-bold text-sm">{customer?.name || 'Cliente não informado'}</p><p className="text-xs text-gray-600">Pago em: {formatDate(c.createdAt)}</p></div><p className="font-bold text-green-600">{formatCurrency(c.amount)}</p></div></div>);
                                    })}
                                    {creditSales.filter(c => c.status === 'pago').length === 0 && <div className="text-center py-8 text-gray-500"><i className="fas fa-inbox text-4xl mb-3"></i><p>Nenhum pagamento registrado</p></div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RELATÓRIOS */}
                {activeTab === 'reports' && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800">Relatórios Financeiros</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4"><p className="text-green-100 text-sm">Total Vendido (Mês)</p><p className="text-2xl font-bold">{formatCurrency(safeNumber(financialReport.totalSold))}</p></div>
                            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-4"><p className="text-red-100 text-sm">Total Investido (Mês)</p><p className="text-2xl font-bold">{formatCurrency(safeNumber(financialReport.totalInvested))}</p></div>
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4"><p className="text-purple-100 text-sm">Lucro Líquido (Mês)</p><p className="text-2xl font-bold">{formatCurrency(safeNumber(financialReport.totalProfit))}</p></div>
                        </div>
                    </div>
                )}

                {/* CONFIGURAÇÕES */}
                {activeTab === 'config' && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
                        <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4">
                            <h3 className="text-lg font-bold text-orange-800 mb-2"><i className="fas fa-wrench mr-2"></i>🔧 Migrar Dados</h3>
                            <p className="text-sm text-orange-700 mb-3">Faz merge de todos os documentos do Firestore (banco_principal + {user.uid}) num único documento unificado. Usar apenas uma vez.</p>
                            <button onClick={async () => {
                                if (!confirm('Vai fazer merge de banco_principal + ' + user.uid + '. Continuar?')) return;
                                const docs = ['banco_principal', user.uid];
                                let dadosMergidos = { products: [], purchases: [], sales: [], customers: [], creditSales: [], resellers: [], resellerStock: [], resellerSales: [], resellerReturns: [], stockAdjustments: [] };
                                const mergeArray = (existing, newItems) => {
                                    if (!newItems || !newItems.length) return existing;
                                    const ids = new Set(existing.map(i => i.id));
                                    return [...existing, ...newItems.filter(i => !ids.has(i.id))];
                                };
                                for (const docId of docs) {
                                    const doc = await db.collection('app_boticario').doc(docId).get();
                                    if (doc.exists) {
                                        const data = doc.data();
                                        dadosMergidos.products = mergeArray(dadosMergidos.products, data.products);
                                        dadosMergidos.purchases = mergeArray(dadosMergidos.purchases, data.purchases);
                                        dadosMergidos.sales = mergeArray(dadosMergidos.sales, data.sales);
                                        dadosMergidos.customers = mergeArray(dadosMergidos.customers, data.customers);
                                        dadosMergidos.creditSales = mergeArray(dadosMergidos.creditSales, data.creditSales);
                                        dadosMergidos.resellers = mergeArray(dadosMergidos.resellers, data.resellers);
                                        dadosMergidos.resellerStock = mergeArray(dadosMergidos.resellerStock, data.resellerStock);
                                        dadosMergidos.resellerSales = mergeArray(dadosMergidos.resellerSales, data.resellerSales);
                                        dadosMergidos.resellerReturns = mergeArray(dadosMergidos.resellerReturns, data.resellerReturns);
                                        dadosMergidos.stockAdjustments = mergeArray(dadosMergidos.stockAdjustments, data.stockAdjustments);
                                    }
                                }
                                await db.collection('app_boticario').doc('banco_principal').set(dadosMergidos);
                                setProducts(dadosMergidos.products);
                                setPurchases(dadosMergidos.purchases);
                                setSales(dadosMergidos.sales);
                                setCustomers(dadosMergidos.customers);
                                setCreditSales(dadosMergidos.creditSales);
                                setResellers(dadosMergidos.resellers);
                                setResellerStock(dadosMergidos.resellerStock);
                                setResellerSales(dadosMergidos.resellerSales);
                                setResellerReturns(dadosMergidos.resellerReturns);
                                setStockAdjustments(dadosMergidos.stockAdjustments);
                                alert('✅ Migração concluída!\nProdutos: ' + dadosMergidos.products.length + '\nVendas: ' + dadosMergidos.sales.length + '\nCompras: ' + dadosMergidos.purchases.length + '\nRevendedores: ' + dadosMergidos.resellers.length);
                            }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm"><i className="fas fa-database mr-2"></i>Executar Migração</button>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold text-gray-800"><i className="fas fa-users mr-2 text-purple-600"></i>Equipa Comercial</h3>
                                <button onClick={() => setShowComercialModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm"><i className="fas fa-plus mr-1"></i>Nova Comercial</button>
                            </div>
                            {comerciais.length === 0 ? (
                                <p className="text-gray-500 text-sm">Nenhuma comercial criada ainda.</p>
                            ) : (
                                <div className="space-y-3">
                                    {comerciais.map(c => (
                                        <div key={c.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                                            <div>
                                                <p className="font-medium text-gray-800">{c.name}</p>
                                                <p className="text-xs text-gray-500">@{c.username} • Salões: {(c.assignedResellers||[]).length} • Comissão R: {c.commissionReseller}% / D: {c.commissionDirect}%</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingComercial(c); setShowAssignSalonsModal(true); }} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"><i className="fas fa-store mr-1"></i>Salões</button>
                                                <button onClick={async () => { await db.collection('users').doc(c.id).update({ active: !c.active }); }} className={`${c.active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'} text-white px-2 py-1 rounded text-xs`}>{c.active ? 'Ativa' : 'Inativa'}</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4 max-w-md mb-4">
                            <h3 className="text-lg font-bold text-gray-800 mb-3"><i className="fas fa-cloud-upload-alt mr-2 text-purple-600"></i>Backup Automático</h3>
                            <div className="flex items-center justify-between mb-3">
                                <div><p className="font-medium text-gray-700">Ativar Backup Automático</p><p className="text-xs text-gray-500">Backup a cada 5 minutos + ao fechar</p></div>
                                <button onClick={() => setAutoBackupEnabled(!autoBackupEnabled)} className={`relative w-14 h-7 rounded-full transition ${autoBackupEnabled ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${autoBackupEnabled ? 'transform translate-x-7' : ''}`}></span></button>
                            </div>
                            {autoBackupEnabled && <div className="bg-green-50 border-l-4 border-green-500 p-3"><p className="text-sm text-green-800"><i className="fas fa-check-circle mr-2"></i><strong>Ativo!</strong> Backup automático ativado.</p></div>}
                            <button onClick={triggerAutoBackup} className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition text-sm"><i className="fas fa-download mr-2"></i>Backup Agora</button>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4 max-w-md">
                            <div className="space-y-3">
                                <div><label className="block text-gray-700 font-medium mb-2 text-sm">Limite de Estoque Baixo (unidades)</label><input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 3)} className="w-full border rounded-lg p-3 text-sm" /></div>
                                <div><label className="block text-gray-700 font-medium mb-2 text-sm">Alerta de Validade (dias)</label><input type="number" value={expiryAlertDays} onChange={(e) => setExpiryAlertDays(parseInt(e.target.value) || 30)} className="w-full border rounded-lg p-3 text-sm" /></div>
                                <div><label className="block text-gray-700 font-medium mb-2 text-sm">Alerta Produto Parado (dias)</label><input type="number" value={staleProductDays} onChange={(e) => setStaleProductDays(parseInt(e.target.value) || 30)} className="w-full border rounded-lg p-3 text-sm" /></div>
                                <div className="pt-3 border-t"><button onClick={() => { if (confirm('Tem certeza? Isso apagará todos os dados!')) { localStorage.clear(); window.location.reload(); } }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition w-full text-sm"><i className="fas fa-trash mr-2"></i>Limpar Todos os Dados</button></div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ==================== MODALS ==================== */}
            <Modal isOpen={showAdjustStockModal} onClose={() => { setShowAdjustStockModal(false); setAdjustStockProduct(null); }} title="🔧 Ajustar Stock">
                <div className="space-y-4">
                    {adjustStockProduct && <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500"><p className="font-bold">{adjustStockProduct.name}</p><p className="text-sm text-gray-600">Stock atual: {calculateStock(adjustStockProduct.id)} un.</p></div>}
                    <div><label className="block text-gray-700 font-medium mb-2">Tipo de Ajuste *</label><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setAdjustStockForm({...adjustStockForm, type: 'entrada'})} className={`p-3 rounded-lg border-2 transition ${adjustStockForm.type === 'entrada' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}><i className="fas fa-plus-circle text-green-600 mr-2"></i><span className="font-medium">Entrada (+)</span><p className="text-xs text-gray-500 mt-1">Adicionar ao stock</p></button><button type="button" onClick={() => setAdjustStockForm({...adjustStockForm, type: 'saida'})} className={`p-3 rounded-lg border-2 transition ${adjustStockForm.type === 'saida' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}><i className="fas fa-minus-circle text-red-600 mr-2"></i><span className="font-medium">Saída (-)</span><p className="text-xs text-gray-500 mt-1">Remover do stock</p></button></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Motivo *</label><select value={adjustStockForm.reason} onChange={(e) => setAdjustStockForm({...adjustStockForm, reason: e.target.value})} className="w-full border rounded-lg p-3"><option value="quebra">Quebra / Dano</option><option value="erro_compra">Erro na Compra</option><option value="perda">Perda / Extravio</option><option value="validade">Produto Vencido</option><option value="inventario">Ajuste de Inventário</option><option value="outro">Outro</option></select></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Quantidade *</label><input type="number" value={adjustStockForm.quantity} onChange={(e) => setAdjustStockForm({...adjustStockForm, quantity: e.target.value})} className="w-full border rounded-lg p-3" min="1" /></div><div><label className="block text-gray-700 font-medium mb-2">Data</label><input type="date" value={adjustStockForm.date} onChange={(e) => setAdjustStockForm({...adjustStockForm, date: e.target.value})} className="w-full border rounded-lg p-3" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Observações</label><textarea value={adjustStockForm.notes} onChange={(e) => setAdjustStockForm({...adjustStockForm, notes: e.target.value})} className="w-full border rounded-lg p-3" rows="3" placeholder="Descreva o motivo do ajuste..."></textarea></div>
                    <div className={`p-4 rounded-lg ${adjustStockForm.type === 'entrada' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}><p className="font-bold">{adjustStockForm.type === 'entrada' ? '➕' : '➖'} Stock atual: {calculateStock(adjustStockProduct?.id || '')} un.</p><p className="text-sm">Novo stock: <span className="font-bold">{adjustStockProduct ? (adjustStockForm.type === 'entrada' ? calculateStock(adjustStockProduct.id) + parseInt(adjustStockForm.quantity || 0) : calculateStock(adjustStockProduct.id) - parseInt(adjustStockForm.quantity || 0)) : 0} un.</span></p></div>
                    <button onClick={handleAdjustStock} className={`w-full py-3 rounded-lg transition text-white ${adjustStockForm.type === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}><i className="fas fa-check mr-2"></i>Confirmar Ajuste</button>
                </div>
            </Modal>

            <Modal isOpen={showQuickBuyModal} onClose={() => { setShowQuickBuyModal(false); setQuickBuyProduct(null); }} title="🛒 Compra Rápida">
                <div className="space-y-4">
                    {quickBuyProduct && <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500"><p className="font-bold">{quickBuyProduct.name}</p><p className="text-sm text-gray-600">Stock atual: {calculateStock(quickBuyProduct.id)} un. (Baixo!)</p></div>}
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Quantidade *</label><input type="number" value={quickBuyForm.quantity} onChange={(e) => setQuickBuyForm({...quickBuyForm, quantity: e.target.value})} className="w-full border rounded-lg p-3" min="1" /></div><div><label className="block text-gray-700 font-medium mb-2">Preço Unitário (R$) *</label><input type="number" value={quickBuyForm.price} onChange={(e) => setQuickBuyForm({...quickBuyForm, price: e.target.value})} className="w-full border rounded-lg p-3" step="0.01" min="0" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data da Compra</label><input type="date" value={quickBuyForm.date} onChange={(e) => setQuickBuyForm({...quickBuyForm, date: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    {quickBuyForm.quantity && quickBuyForm.price && <div className="p-4 bg-green-50 rounded-lg"><p className="text-sm"><strong>Total:</strong> {formatCurrency(quickBuyForm.quantity * quickBuyForm.price)}</p></div>}
                    <button onClick={handleQuickBuy} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition"><i className="fas fa-cart-plus mr-2"></i>Registrar Compra</button>
                </div>
            </Modal>

            <Modal isOpen={showTransferModal} onClose={() => { setShowTransferModal(false); setSelectedReseller(null); }} title="🔄 Transferir para Revendedor">
                <div className="space-y-4">
                    {selectedReseller && <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500"><p className="font-bold">{selectedReseller.salonName}</p><p className="text-sm text-gray-600">{selectedReseller.name}</p></div>}
                    {transferForm.productId && <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500"><p className="font-bold">{products.find(p => p.id === transferForm.productId)?.name}</p><p className="text-sm text-gray-600">Stock disponível: {calculateStock(transferForm.productId)} un.</p></div>}
                    {!transferForm.productId && <SearchableDropdown label="Produto *" options={productOptions} value={transferForm.productId} onChange={(value) => setTransferForm({...transferForm, productId: value})} placeholder="Selecione o produto" renderOption={(option) => (<div><div className="font-medium">{option.label}</div><div className="text-xs text-gray-500">Stock: {option.stock} un.</div></div>)} />}
                    <SearchableDropdown label="Revendedor *" options={resellerOptions} value={transferForm.resellerId} onChange={(value) => setTransferForm({...transferForm, resellerId: value})} placeholder="Selecione o revendedor" renderOption={(option) => (<div><div className="font-medium">{option.label}</div><div className="text-xs text-gray-500">{option.salon}</div></div>)} />
                    <div><label className="block text-gray-700 font-medium mb-2">Quantidade *</label><input type="number" value={transferForm.quantity} onChange={(e) => setTransferForm({...transferForm, quantity: e.target.value})} className="w-full border rounded-lg p-3" min="1" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data da Transferência</label><input type="date" value={transferForm.date} onChange={(e) => setTransferForm({...transferForm, date: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div className="flex gap-3"><button onClick={() => { setShowTransferModal(false); setSelectedReseller(null); setTransferForm({ resellerId: '', productId: '', quantity: 1, date: new Date().toISOString().split('T')[0] }); }} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg transition"><i className="fas fa-times mr-2"></i>Cancelar</button><button onClick={handleTransfer} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition"><i className="fas fa-exchange-alt mr-2"></i>Transferir</button></div>
                </div>
            </Modal>

            <Modal isOpen={showReturnModal} onClose={() => { setShowReturnModal(false); setSelectedReseller(null); }} title="📦 Devolver Produtos">
                <div className="space-y-4">
                    {selectedReseller && <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500"><p className="font-bold">{selectedReseller.salonName}</p><p className="text-sm text-gray-600">{selectedReseller.name}</p></div>}
                    <div><label className="block text-gray-700 font-medium mb-2">Produto para Devolver *</label><select className="w-full border rounded-lg p-3 text-sm" value={returnForm.productId} onChange={(e) => setReturnForm({...returnForm, productId: e.target.value})}><option value="">Selecione o produto...</option>{selectedReseller && resellerStock && resellerStock.filter(item => item.resellerId === selectedReseller.id && item.quantity > 0).map(item => { const prod = products.find(p => p.id === item.productId); return (<option key={item.id} value={item.productId}>{prod ? prod.name : 'Produto não encontrado'} — ({item.quantity} un.)</option>); })}</select></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Quantidade *</label><input type="number" value={returnForm.quantity} onChange={(e) => setReturnForm({...returnForm, quantity: e.target.value})} className="w-full border rounded-lg p-3 text-sm" min="1" /></div>
                    <button onClick={handleReturn} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold"><i className="fas fa-undo mr-2"></i>Confirmar Devolução</button>
                </div>
            </Modal>

            <Modal isOpen={showResellerSaleModal} onClose={() => { setShowResellerSaleModal(false); setSelectedReseller(null); }} title="💰 Registrar Venda do Revendedor">
                <div className="space-y-4">
                    {selectedReseller && <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500"><p className="font-bold">{selectedReseller.salonName}</p><p className="text-sm text-gray-600">Comissão: {selectedReseller.commissionRate}%</p></div>}
                    <div><label className="block text-gray-700 font-medium mb-2">Produto Vendido *</label><select className="w-full border rounded-lg p-3 text-sm" value={resellerSaleForm.productId} onChange={(e) => setResellerSaleForm({...resellerSaleForm, productId: e.target.value})}><option value="">Selecione o produto vendido...</option>{selectedReseller && resellerStock.filter(item => item.resellerId === selectedReseller.id && item.quantity > 0).map(item => { const prod = products.find(p => p.id === item.productId); return (<option key={item.id} value={item.productId}>{prod ? prod.name : 'Produto não encontrado'} — (Tem {item.quantity} un.)</option>); })}</select>{selectedReseller && resellerStock.filter(item => item.resellerId === selectedReseller.id && item.quantity > 0).length === 0 && <p className="text-red-500 text-xs mt-1 italic">Sem produtos. Faça uma transferência primeiro.</p>}</div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Quantidade *</label><input type="number" value={resellerSaleForm.quantity} onChange={(e) => setResellerSaleForm({...resellerSaleForm, quantity: e.target.value})} className="w-full border rounded-lg p-3" min="1" /></div><div><label className="block text-gray-700 font-medium mb-2">Preço de Venda (R$) *</label><input type="number" value={resellerSaleForm.salePrice} onChange={(e) => setResellerSaleForm({...resellerSaleForm, salePrice: e.target.value})} className="w-full border rounded-lg p-3" step="0.01" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data da Venda</label><input type="date" value={resellerSaleForm.date} onChange={(e) => setResellerSaleForm({...resellerSaleForm, date: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    {resellerSaleForm.salePrice && resellerSaleForm.quantity && selectedReseller && <div className="p-4 bg-green-50 rounded-lg space-y-2"><p className="text-sm"><strong>Total Venda:</strong> {formatCurrency(resellerSaleForm.salePrice * resellerSaleForm.quantity)}</p><p className="text-sm text-orange-600"><strong>Comissão ({selectedReseller.commissionRate}%):</strong> {formatCurrency((resellerSaleForm.salePrice * resellerSaleForm.quantity) * (selectedReseller.commissionRate / 100))}</p><p className="text-sm text-green-600 font-bold"><strong>Seu Ganho:</strong> {formatCurrency((resellerSaleForm.salePrice * resellerSaleForm.quantity) * ((100 - selectedReseller.commissionRate) / 100))}</p></div>}
                    <button onClick={handleResellerSale} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition"><i className="fas fa-check mr-2"></i>Registrar Venda</button>
                </div>
            </Modal>

            <Modal isOpen={showInventoryModal} onClose={() => { setShowInventoryModal(false); setSelectedResellerInventory(null); setEditingStockItemId(null); }} title={`📦 Stock: ${selectedResellerInventory?.salonName}`}>
                <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3"><i className="fas fa-info-circle text-blue-600"></i><p className="text-sm text-blue-800">Produtos em posse de <strong>{selectedResellerInventory?.name}</strong>.</p></div>
                    <div className="bg-white rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Produto</th><th className="p-3 text-center">Stock</th><th className="p-3 text-center">Ações</th></tr></thead>
                            <tbody>
                                {selectedResellerInventory && resellerStock.filter(item => item.resellerId === selectedResellerInventory.id && item.quantity > 0).map(item => {
                                    const prod = products.find(p => p.id === item.productId);
                                    const isEditing = editingStockItemId === item.id;
                                    return (
                                        <tr key={item.id} className="border-t hover:bg-gray-50">
                                            <td className="p-3 font-medium">{prod ? prod.name : 'Produto não encontrado'}</td>
                                            <td className="p-3 text-center">{isEditing ? <input type="number" min="0" value={editingStockQty} onChange={(e) => setEditingStockQty(e.target.value)} className="w-20 border-2 border-blue-400 rounded-lg px-2 py-1 text-center font-bold focus:outline-none" autoFocus /> : <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">{item.quantity} un.</span>}</td>
                                            <td className="p-3 text-center"><div className="flex justify-center gap-2">{isEditing ? (<><button onClick={() => { const newQty = parseInt(editingStockQty); if (!isNaN(newQty) && newQty >= 0) { setResellerStock(resellerStock.map(s => s.id === item.id ? { ...s, quantity: newQty } : s)); } setEditingStockItemId(null); }} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"><i className="fas fa-check"></i></button><button onClick={() => setEditingStockItemId(null)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-xs"><i className="fas fa-times"></i></button></>) : (<><button onClick={() => { setEditingStockItemId(item.id); setEditingStockQty(String(item.quantity)); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"><i className="fas fa-edit"></i></button><button onClick={() => { if (window.confirm(`Remover ${prod?.name} do stock?`)) { setResellerStock(resellerStock.map(s => s.id === item.id ? { ...s, quantity: 0 } : s)); } }} className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded"><i className="fas fa-trash"></i></button></>)}</div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {(!selectedResellerInventory || resellerStock.filter(item => item.resellerId === selectedResellerInventory.id && item.quantity > 0).length === 0) && <div className="p-8 text-center text-gray-500"><i className="fas fa-box-open text-3xl mb-2 block opacity-30"></i><p>O salão está sem stock.</p></div>}
                    </div>
                    <button onClick={() => { setShowInventoryModal(false); setSelectedResellerInventory(null); setEditingStockItemId(null); }} className="w-full bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition">Fechar</button>
                </div>
            </Modal>

            <Modal isOpen={showSalesHistoryModal} onClose={() => { setShowSalesHistoryModal(false); setSelectedResellerForHistory(null); }} title={`📊 Histórico - ${selectedResellerForHistory?.salonName}`}>
                <div className="space-y-4">
                    {selectedResellerForHistory && (<>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><div className="flex items-center gap-3"><div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center"><i className="fas fa-user"></i></div><div><h3 className="font-bold text-purple-900">{selectedResellerForHistory.salonName}</h3><p className="text-purple-700 text-sm">Total de vendas: {resellerSales.filter(s => s.resellerId === selectedResellerForHistory.id).length}</p></div></div></div>
                        <div className="bg-white rounded-lg border overflow-hidden">
                            {resellerSales.filter(sale => sale.resellerId === selectedResellerForHistory.id).length === 0 ? (
                                <div className="p-8 text-center text-gray-500"><i className="fas fa-receipt text-4xl mb-3 opacity-30"></i><p>Nenhuma venda registrada.</p></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b"><tr><th className="p-3 text-left text-xs font-medium text-gray-700">Data</th><th className="p-3 text-left text-xs font-medium text-gray-700">Produto</th><th className="p-3 text-center text-xs font-medium text-gray-700">Qtd</th><th className="p-3 text-right text-xs font-medium text-gray-700">Valor</th><th className="p-3 text-right text-xs font-medium text-gray-700">Total</th></tr></thead>
                                        <tbody>
                                            {resellerSales.filter(sale => sale.resellerId === selectedResellerForHistory.id).sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => {
                                                const product = products.find(p => p.id === sale.productId);
                                                return (
                                                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-3"><div className="text-sm">{new Date(sale.date).toLocaleDateString('pt-BR')}</div><div className="text-xs text-gray-500">{sale.timestamp ? new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div></td>
                                                        <td className="p-3"><div className="font-medium text-sm">{product ? product.name : 'Produto não encontrado'}</div>{product && <div className="text-xs text-gray-500">{product.category}</div>}</td>
                                                        <td className="p-3 text-center"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">{sale.quantity} un</span></td>
                                                        <td className="p-3 text-right"><div className="text-sm font-medium">{formatCurrency(sale.salePrice)}</div></td>
                                                        <td className="p-3 text-right"><div className="font-bold text-green-600">{formatCurrency(sale.salePrice * sale.quantity)}</div></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t"><tr><td colSpan="4" className="p-3 text-right font-medium">Total Geral:</td><td className="p-3 text-right"><div className="font-bold text-lg text-green-600">{formatCurrency(resellerSales.filter(sale => sale.resellerId === selectedResellerForHistory.id).reduce((sum, sale) => sum + (sale.salePrice * sale.quantity), 0))}</div></td></tr></tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>)}
                </div>
                <button onClick={() => { setShowSalesHistoryModal(false); setSelectedResellerForHistory(null); }} className="w-full mt-4 bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition">Fechar</button>
            </Modal>

            <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title="Novo Produto">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Nome do Produto *</label><input type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full border rounded-lg p-3" placeholder="Ex: Lily Eau de Parfum" /></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Categoria</label><select value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className="w-full border rounded-lg p-3"><option value="perfumaria">Perfumaria</option><option value="corpo">Corpo e Banho</option><option value="maquiagem">Maquiagem</option><option value="cabelo">Cabelo</option><option value="acessorios">Acessórios</option></select></div><div><label className="block text-gray-700 font-medium mb-2">Preço Catálogo (R$)</label><input type="number" value={productForm.catalogPrice} onChange={(e) => setProductForm({...productForm, catalogPrice: e.target.value})} className="w-full border rounded-lg p-3" step="0.01" min="0" /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Fragrância</label><input type="text" value={productForm.fragrance} onChange={(e) => setProductForm({...productForm, fragrance: e.target.value})} className="w-full border rounded-lg p-3" /></div><div><label className="block text-gray-700 font-medium mb-2">Ciclo O Boticário</label><input type="text" value={productForm.cycle} onChange={(e) => setProductForm({...productForm, cycle: e.target.value})} className="w-full border rounded-lg p-3" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data de Validade</label><input type="date" value={productForm.expiryDate} onChange={(e) => setProductForm({...productForm, expiryDate: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleAddProduct} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Salvar Produto</button>
                </div>
            </Modal>

            <Modal isOpen={showEditProductModal} onClose={() => { setShowEditProductModal(false); setEditingProduct(null); }} title="Editar Produto">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Nome do Produto *</label><input type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Categoria</label><select value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className="w-full border rounded-lg p-3"><option value="perfumaria">Perfumaria</option><option value="corpo">Corpo e Banho</option><option value="maquiagem">Maquiagem</option><option value="cabelo">Cabelo</option><option value="acessorios">Acessórios</option></select></div><div><label className="block text-gray-700 font-medium mb-2">Preço Catálogo (R$)</label><input type="number" value={productForm.catalogPrice} onChange={(e) => setProductForm({...productForm, catalogPrice: e.target.value})} className="w-full border rounded-lg p-3" step="0.01" min="0" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data de Validade</label><input type="date" value={productForm.expiryDate} onChange={(e) => setProductForm({...productForm, expiryDate: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleEditProduct} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Atualizar Produto</button>
                </div>
            </Modal>

            <Modal isOpen={showSaleModal} onClose={() => setShowSaleModal(false)} title="Nova Venda">
                <div className="space-y-4">
                    <SearchableDropdown label="Produto *" options={productOptions} value={saleForm.productId} onChange={(value) => setSaleForm({...saleForm, productId: value})} placeholder="Selecione o produto" renderOption={(option) => (<div><div className="font-medium">{option.label}</div><div className="text-xs text-gray-500">Stock: {option.stock} un.</div></div>)} />
                    <SearchableDropdown label="Cliente" options={customerOptions} value={saleForm.customerId} onChange={(value) => setSaleForm({...saleForm, customerId: value})} placeholder="Não informado" renderOption={(option) => (<div><div className="font-medium">{option.label}</div></div>)} />
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Quantidade *</label><input type="number" value={saleForm.quantity} onChange={(e) => setSaleForm({...saleForm, quantity: e.target.value})} className="w-full border rounded-lg p-3" min="1" /></div><div><label className="block text-gray-700 font-medium mb-2">Preço de Venda (R$) *</label><input type="number" value={saleForm.price} onChange={(e) => setSaleForm({...saleForm, price: e.target.value})} className="w-full border rounded-lg p-3" step="0.01" min="0" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Método de Pagamento</label><select value={saleForm.paymentMethod} onChange={(e) => setSaleForm({...saleForm, paymentMethod: e.target.value})} className="w-full border rounded-lg p-3"><option value="bizum">Bizum</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="credito">Fiado/Crédito</option></select></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data da Venda</label><input type="date" value={saleForm.date} onChange={(e) => setSaleForm({...saleForm, date: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleAddSale} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition"><i className="fas fa-check mr-2"></i>Registrar Venda</button>
                </div>
            </Modal>

            <Modal isOpen={showEditSaleModal} onClose={() => { setShowEditSaleModal(false); setEditingSale(null); }} title="Editar Venda">
                <div className="space-y-4">
                    <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500"><p className="text-yellow-800 text-sm"><i className="fas fa-info-circle mr-2"></i>Editando venda de {formatDate(editingSale?.date)}</p></div>
                    <SearchableDropdown label="Produto *" options={productOptions} value={saleForm.productId} onChange={(value) => setSaleForm({...saleForm, productId: value})} placeholder="Selecione o produto" renderOption={(option) => (<div><div className="font-medium">{option.label}</div><div className="text-xs text-gray-500">Stock: {option.stock} un.</div></div>)} />
                    <SearchableDropdown label="Cliente" options={customerOptions} value={saleForm.customerId} onChange={(value) => setSaleForm({...saleForm, customerId: value})} placeholder="Não informado" renderOption={(option) => (<div><div className="font-medium">{option.label}</div></div>)} />
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Quantidade *</label><input type="number" value={saleForm.quantity} onChange={(e) => setSaleForm({...saleForm, quantity: e.target.value})} className="w-full border rounded-lg p-3" min="1" /></div><div><label className="block text-gray-700 font-medium mb-2">Preço de Venda (R$) *</label><input type="number" value={saleForm.price} onChange={(e) => setSaleForm({...saleForm, price: e.target.value})} className="w-full border rounded-lg p-3" step="0.01" min="0" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Método de Pagamento</label><select value={saleForm.paymentMethod} onChange={(e) => setSaleForm({...saleForm, paymentMethod: e.target.value})} className="w-full border rounded-lg p-3"><option value="bizum">Bizum</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="credito">Fiado/Crédito</option></select></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data da Venda</label><input type="date" value={saleForm.date} onChange={(e) => setSaleForm({...saleForm, date: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleEditSale} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Atualizar Venda</button>
                </div>
            </Modal>

            <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Novo Cliente">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Nome *</label><input type="text" value={customerForm.name} onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Telefone</label><input type="tel" value={customerForm.phone} onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})} className="w-full border rounded-lg p-3" placeholder="+55 00 00000-0000" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Email</label><input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleAddCustomer} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Salvar Cliente</button>
                </div>
            </Modal>

            <Modal isOpen={showEditCustomerModal} onClose={() => { setShowEditCustomerModal(false); setEditingCustomer(null); }} title="Editar Cliente">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Nome *</label><input type="text" value={customerForm.name} onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Telefone</label><input type="tel" value={customerForm.phone} onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Email</label><input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleEditCustomer} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Atualizar Cliente</button>
                </div>
            </Modal>

            <Modal isOpen={showResellerModal} onClose={() => setShowResellerModal(false)} title="Novo Revendedor">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Nome do Contato *</label><input type="text" value={resellerForm.name} onChange={(e) => setResellerForm({...resellerForm, name: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Nome do Salão *</label><input type="text" value={resellerForm.salonName} onChange={(e) => setResellerForm({...resellerForm, salonName: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Endereço</label><input type="text" value={resellerForm.address} onChange={(e) => setResellerForm({...resellerForm, address: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Telefone</label><input type="tel" value={resellerForm.phone} onChange={(e) => setResellerForm({...resellerForm, phone: e.target.value})} className="w-full border rounded-lg p-3" /></div><div><label className="block text-gray-700 font-medium mb-2">Comissão (%)</label><input type="number" value={resellerForm.commissionRate} onChange={(e) => setResellerForm({...resellerForm, commissionRate: e.target.value})} className="w-full border rounded-lg p-3" min="0" max="100" step="0.1" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Email</label><input type="email" value={resellerForm.email} onChange={(e) => setResellerForm({...resellerForm, email: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleAddReseller} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Salvar Revendedor</button>
                </div>
            </Modal>

            <Modal isOpen={showEditResellerModal} onClose={() => { setShowEditResellerModal(false); setEditingReseller(null); }} title="Editar Revendedor">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Nome do Contato *</label><input type="text" value={resellerForm.name} onChange={(e) => setResellerForm({...resellerForm, name: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Nome do Salão *</label><input type="text" value={resellerForm.salonName} onChange={(e) => setResellerForm({...resellerForm, salonName: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Endereço</label><input type="text" value={resellerForm.address} onChange={(e) => setResellerForm({...resellerForm, address: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 font-medium mb-2">Telefone</label><input type="tel" value={resellerForm.phone} onChange={(e) => setResellerForm({...resellerForm, phone: e.target.value})} className="w-full border rounded-lg p-3" /></div><div><label className="block text-gray-700 font-medium mb-2">Comissão (%)</label><input type="number" value={resellerForm.commissionRate} onChange={(e) => setResellerForm({...resellerForm, commissionRate: e.target.value})} className="w-full border rounded-lg p-3" min="0" max="100" step="0.1" /></div></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Email</label><input type="email" value={resellerForm.email} onChange={(e) => setResellerForm({...resellerForm, email: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleEditReseller} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Atualizar Revendedor</button>
                </div>
            </Modal>

            <Modal isOpen={showCreditModal} onClose={() => setShowCreditModal(false)} title="Registro de Fiado">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Valor (R$) *</label><input type="number" value={creditForm.amount} onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})} className="w-full border rounded-lg p-3" step="0.01" min="0" /></div>
                    <div><label className="block text-gray-700 font-medium mb-2">Data de Vencimento *</label><input type="date" value={creditForm.dueDate} onChange={(e) => setCreditForm({...creditForm, dueDate: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                    <button onClick={handleAddCredit} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg transition"><i className="fas fa-save mr-2"></i>Registrar Fiado</button>
                </div>
            </Modal>

            <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteItem(null); }} title="Confirmar Exclusão">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500"><p className="text-red-800 font-bold"><i className="fas fa-exclamation-triangle mr-2"></i>Atenção!</p><p className="text-red-700 mt-2">{deleteItem?.type === 'product' ? `Excluir produto "${deleteItem?.name}"?` : deleteItem?.type === 'customer' ? `Excluir cliente "${deleteItem?.name}"?` : deleteItem?.type === 'reseller' ? `Excluir revendedor "${deleteItem?.name}"?` : 'Excluir este item?'}</p><p className="text-red-600 text-sm mt-2">Esta ação não pode ser desfeita!</p></div>
                    <div className="flex gap-3"><button onClick={() => { setShowDeleteModal(false); setDeleteItem(null); }} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg transition"><i className="fas fa-times mr-2"></i>Cancelar</button><button onClick={deleteItem?.type === 'product' ? handleDeleteProduct : deleteItem?.type === 'customer' ? handleDeleteCustomer : deleteItem?.type === 'reseller' ? handleDeleteReseller : handleDeleteSale} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition"><i className="fas fa-trash mr-2"></i>Excluir</button></div>
                </div>
            </Modal>

            <Modal isOpen={showPurchaseHistoryModal} onClose={() => setShowPurchaseHistoryModal(false)} title="📜 Histórico de Compras">
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-bold mb-3"><i className="fas fa-filter mr-2"></i>Filtros</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div><label className="block text-gray-700 font-medium mb-2 text-sm">Buscar Produto</label><input type="text" value={purchaseHistorySearch} onChange={(e) => setPurchaseHistorySearch(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Nome do produto..." /></div>
                            <div><label className="block text-gray-700 font-medium mb-2 text-sm">Data Inicial</label><input type="date" value={purchaseHistoryDateFrom} onChange={(e) => setPurchaseHistoryDateFrom(e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                            <div><label className="block text-gray-700 font-medium mb-2 text-sm">Data Final</label><input type="date" value={purchaseHistoryDateTo} onChange={(e) => setPurchaseHistoryDateTo(e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                        </div>
                        <div className="mt-3 flex gap-2"><button onClick={() => { setPurchaseHistorySearch(''); setPurchaseHistoryDateFrom(''); setPurchaseHistoryDateTo(''); }} className="text-sm text-purple-600 hover:underline"><i className="fas fa-eraser mr-1"></i>Limpar Filtros</button><button onClick={exportPurchaseHistory} className="text-sm text-green-600 hover:underline"><i className="fas fa-file-csv mr-1"></i>Exportar CSV</button></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Total de Compras</p><p className="text-2xl font-bold text-blue-600">{filteredPurchaseHistory.length}</p></div>
                        <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Total Investido</p><p className="text-2xl font-bold text-green-600">{formatCurrency(filteredPurchaseHistory.reduce((sum, p) => sum + (p.price * p.quantity), 0))}</p></div>
                        <div className="bg-purple-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Período</p><p className="text-sm font-bold text-purple-600">{purchaseHistoryDateFrom ? formatDate(purchaseHistoryDateFrom) : 'Início'} - {purchaseHistoryDateTo ? formatDate(purchaseHistoryDateTo) : 'Hoje'}</p></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Produto</th><th className="p-3 text-center">Qtd</th><th className="p-3 text-left">Preço Unit.</th><th className="p-3 text-left">Total</th></tr></thead>
                            <tbody>
                                {filteredPurchaseHistory.map(p => {
                                    const product = products.find(prod => prod.id === p.productId);
                                    return (<tr key={p.id} className="border-t"><td className="p-3">{formatDate(p.date)}</td><td className="p-3 font-medium">{product?.name || 'Produto removido'}</td><td className="p-3 text-center">{p.quantity}</td><td className="p-3">{formatCurrency(p.price)}</td><td className="p-3 font-bold">{formatCurrency(p.price * p.quantity)}</td></tr>);
                                })}
                            </tbody>
                        </table>
                        {filteredPurchaseHistory.length === 0 && <div className="text-center py-8 text-gray-500"><i className="fas fa-inbox text-4xl mb-3"></i><p>Nenhuma compra encontrada</p></div>}
                    </div>
                </div>
            </Modal>

            <footer className="bg-gray-800 text-white py-6 mt-12">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-gray-400"><i className="fas fa-store mr-2"></i>Sistema de Gestão para Revenda O Boticário</p>
                    <p className="text-gray-500 text-sm mt-2">Versão Estável • {new Date().getFullYear()}</p>
                </div>
            </footer>

            <Modal isOpen={showComercialModal} onClose={() => setShowComercialModal(false)} title="Nova Comercial">
                <div className="space-y-4">
                    <div><label className="block text-gray-700 font-medium mb-2">Nome Completo *</label><input type="text" value={comercialForm.name} onChange={(e) => setComercialForm({...comercialForm, name: e.target.value})} className="w-full border rounded-lg p-3" placeholder="Ex: Patrícia Silva" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-gray-700 font-medium mb-2">Username (login) *</label><input type="text" value={comercialForm.username} onChange={(e) => setComercialForm({...comercialForm, username: e.target.value.toLowerCase().replace(/\s/g,'')})} className="w-full border rounded-lg p-3" placeholder="ex: patricia" /><p className="text-xs text-gray-400 mt-1">{comercialForm.username || 'username'}@boticario.internal</p></div>
                        <div><label className="block text-gray-700 font-medium mb-2">Zona</label><input type="text" value={comercialForm.zone} onChange={(e) => setComercialForm({...comercialForm, zone: e.target.value})} className="w-full border rounded-lg p-3" placeholder="Ex: Lisboa Norte" /></div>
                    </div>
                    <div><label className="block text-gray-700 font-medium mb-2">Senha *</label><input type="password" value={comercialForm.password} onChange={(e) => setComercialForm({...comercialForm, password: e.target.value})} className="w-full border rounded-lg p-3" placeholder="Mínimo 6 caracteres" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-gray-700 font-medium mb-2">Comissão Salões (%)</label><input type="number" value={comercialForm.commissionReseller} onChange={(e) => setComercialForm({...comercialForm, commissionReseller: e.target.value})} className="w-full border rounded-lg p-3" min="0" max="100" /></div>
                        <div><label className="block text-gray-700 font-medium mb-2">Comissão Diretas (%)</label><input type="number" value={comercialForm.commissionDirect} onChange={(e) => setComercialForm({...comercialForm, commissionDirect: e.target.value})} className="w-full border rounded-lg p-3" min="0" max="100" /></div>
                    </div>
                    <button onClick={handleCreateComercial} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition"><i className="fas fa-plus mr-2"></i>Criar Comercial</button>
                </div>
            </Modal>

            <Modal isOpen={showAssignSalonsModal} onClose={() => { setShowAssignSalonsModal(false); setEditingComercial(null); }} title={`Salões de ${editingComercial?.name || ''}`}>
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">Selecione os salões atribuídos a esta comercial:</p>
                    {resellers.map(r => {
                        const assigned = (editingComercial?.assignedResellers || []).includes(r.id);
                        return (
                            <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <div><p className="font-medium text-gray-800">{r.salonName}</p><p className="text-xs text-gray-500">{r.name}</p></div>
                                <button onClick={async () => {
                                    const current = editingComercial?.assignedResellers || [];
                                    const updated = assigned ? current.filter(id => id !== r.id) : [...current, r.id];
                                    await db.collection('users').doc(editingComercial.id).update({ assignedResellers: updated });
                                    setEditingComercial({...editingComercial, assignedResellers: updated});
                                }} className={`px-3 py-1 rounded text-sm font-medium ${assigned ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {assigned ? <span><i className="fas fa-check mr-1"></i>Atribuído</span> : <span>Atribuir</span>}
                                </button>
                            </div>
                        );
                    })}
                    {resellers.length === 0 && <p className="text-gray-500 text-sm">Nenhum revendedor cadastrado.</p>}
                </div>
            </Modal>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
