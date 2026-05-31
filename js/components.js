const { useState: _useState, useEffect: _useEffect, useMemo: _useMemo, useRef: _useRef } = React;

window.SearchableDropdown = function SearchableDropdown({ options, value, onChange, placeholder, label, renderOption, emptyMessage = "Nenhum item encontrado" }) {
    const [isOpen, setIsOpen] = _useState(false);
    const [searchTerm, setSearchTerm] = _useState('');
    const dropdownRef = _useRef(null);
    const selectedOption = options.find(o => o.value === value);
    const sortedOptions = _useMemo(() => [...options].sort((a, b) => a.label.localeCompare(b.label)), [options]);
    const filteredOptions = _useMemo(() => {
        if (!searchTerm) return sortedOptions;
        return sortedOptions.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [sortedOptions, searchTerm]);

    _useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => { onChange(optionValue); setIsOpen(false); setSearchTerm(''); };

    return (
        <div className="searchable-dropdown" ref={dropdownRef}>
            {label && <label className="block text-gray-700 font-medium mb-2">{label}</label>}
            <div className="border rounded-lg p-3 bg-white cursor-pointer flex justify-between items-center" onClick={() => setIsOpen(!isOpen)}>
                <span className={selectedOption ? 'text-gray-800' : 'text-gray-400'}>{selectedOption ? selectedOption.label : placeholder}</span>
                <i className={`fas fa-chevron-down text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>
            {isOpen && (
                <div className="dropdown-options mt-1">
                    <div className="p-2 border-b sticky top-0 bg-white">
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input type="text" className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="🔍 Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                        </div>
                    </div>
                    <div className="overflow-y-auto">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <div key={option.value} className={`dropdown-option ${option.value === value ? 'selected' : ''}`} onClick={() => handleSelect(option.value)}>
                                {renderOption ? renderOption(option) : option.label}
                            </div>
                        )) : <div className="p-4 text-center text-gray-500 text-sm"><i className="fas fa-inbox text-2xl mb-2"></i><p>{emptyMessage}</p></div>}
                    </div>
                </div>
            )}
        </div>
    );
};

window.FilterBar = function FilterBar({ searchTerm, onSearchChange, categoryFilter, onCategoryChange, statusFilter, onStatusChange, sortBy, onSortChange, expiryFilter, onExpiryChange, totalItems, filteredItems, onExport }) {
    const categories = ['todos', 'perfumaria', 'corpo', 'maquiagem', 'cabelo', 'acessorios'];
    const statusOptions = [{ value: 'todos', label: 'Todos Status' }, { value: 'ok', label: 'Stock OK' }, { value: 'low', label: 'Stock Baixo' }, { value: 'out', label: 'Sem Stock' }];
    const sortOptions = [{ value: 'name', label: 'Nome (A-Z)' }, { value: 'name-desc', label: 'Nome (Z-A)' }, { value: 'stock', label: 'Stock (Menor)' }, { value: 'stock-desc', label: 'Stock (Maior)' }, { value: 'value', label: 'Valor (Maior)' }, { value: 'expiry', label: 'Validade (Próxima)' }];
    const expiryOptions = [{ value: 'all', label: 'Todas Validades' }, { value: '30', label: 'Vence em 30 dias' }, { value: '60', label: 'Vence em 60 dias' }, { value: '90', label: 'Vence em 90 dias' }, { value: 'no-expiry', label: 'Sem Validade' }];

    return (
        <div className="filter-bar rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="🔍 Buscar produto por nome..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
                    </div>
                </div>
                <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)} className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {categories.map(cat => (<option key={cat} value={cat}>{cat === 'todos' ? '📋 Todas Categorias' : cat.charAt(0).toUpperCase() + cat.slice(1)}</option>))}
                </select>
                <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {statusOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
                <select value={expiryFilter} onChange={(e) => onExpiryChange(e.target.value)} className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {expiryOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
                <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {sortOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
                <button onClick={onExport} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition" title="Exportar CSV"><i className="fas fa-file-csv"></i></button>
                <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm">
                    <i className="fas fa-box mr-2 text-purple-600"></i>
                    <span className="font-bold">{filteredItems}</span> de {totalItems} produtos
                </div>
            </div>
        </div>
    );
};

window.StatCard = function StatCard({ title, value, icon, color, subtitle, smallText, subValues }) {
    return (
        <div className={`bg-white rounded-lg p-4 md:p-6 card-hover shadow-md border-l-4 ${color}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm">{title}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-800">{value}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                    {smallText && <p className="text-xs text-gray-500 mt-1">{smallText}</p>}
                    {subValues && (
                        <div className="mt-2 space-y-1">
                            {subValues.map((subValue, index) => (
                                <div key={index} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{subValue.label}:</span>
                                    <span className={`font-medium ${subValue.color || 'text-gray-800'}`}>{subValue.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-full ${color.replace('border-', 'bg-').replace('-400', '-100')}`}>
                    <i className={`fas ${icon} text-xl`}></i>
                </div>
            </div>
        </div>
    );
};

window.Modal = function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times"></i></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};
