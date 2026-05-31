// ==================== APP PRINCIPAL (PARTE 1: LÓGICA) ====================
const { useState, useEffect, useMemo, useRef } = React;

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((userLogado) => {
            setUser(userLogado);
            if (!userLogado) {
                setProducts([]); setPurchases([]); setSales([]); setCustomers([]);
                setCreditSales([]); setResellers([]); setResellerStock([]);
                setResellerSales([]); setResellerReturns([]); setStockAdjustments([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            if (isRegistering) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
        } catch (error) {
            setAuthError("Erro: Verifique os dados ou use uma senha de 6+ caracteres.");
        }
    };
    const handleLogout = () => auth.signOut();

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
        const unsubscribe = db.collection('app_boticario').doc(user.uid).onSnapshot((doc) => {
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
                setTimeout(() => { isReceivingData.current = false; }, 1000);
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
        if (!user) return;
        if (isReceivingData.current) return;
        const saveData = {
            products: products || [], purchases: purchases || [], sales: sales || [],
            customers: customers || [], creditSales: creditSales || [],
            resellers: resellers || [], resellerStock: resellerStock || [],
            resellerSales: resellerSales || [], resellerReturns: resellerReturns || [],
            stockAdjustments: stockAdjustments || []
        };
        db.collection('app_boticario').doc(user.uid).set(saveData)
            .then(() => console.log("Nuvem privada atualizada!"))
            .catch(error => console.error("Erro na nuvem:", error));
    }, [products, purchases, sales, customers, creditSales, resellers, resellerStock, resellerSales, resellerReturns, stockAdjustments, user]);

    const calculateAveragePrice = (productId) => {
        const productPurchases = purchases.filter(p => p.productId === productId);
        if (productPurchases.length === 0) return 0;
        const totalValue = productPurchases.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const totalQuantity = productPurchases.reduce((sum, p) => sum + parseInt(p.quantity), 0);
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
        const totalInvested = monthlyPurchases.reduce((sum, p) => sum + (p.price * p.quantity), 0);
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
                totalPaidValue += stock * calculateAveragePrice(p.id);
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

    // ==================== RENDER — continua em App-render.js ====================
    // (placeholder — o return() será adicionado na Etapa 4b)
    return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
