import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useBranch } from '../contexts/BranchContext';
import { QRCodeSVG } from 'qrcode.react';
import { printTableBill } from '../utils/printBill';
import { Receipt, CreditCard } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
    QrCode, Plus, Edit2, Trash2, Printer, Copy, ExternalLink, 
    Users, Utensils, CheckCircle2, Clock, AlertCircle, Building2, 
    Store, Sparkles, RefreshCw, X, Calendar 
} from 'lucide-react';

export default function TableQRManagement() {
    const { activeBranchId, activeBranch, branches } = useBranch();
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settleModalTable, setSettleModalTable] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isSettling, setIsSettling] = useState(false);

    const [tableFormData, setTableFormData] = useState({
        table_number: '',
        seating_capacity: 4,
        status: 'Available'
    });

    const currentBranch = activeBranch || branches.find(b => b.id.toString() === activeBranchId?.toString()) || (branches.length > 0 ? branches[0] : null);
    const branchName = currentBranch?.name || "Hosto eMenu";
    const resolvedBranchId = currentBranch?.id || (activeBranchId !== 'all' ? activeBranchId : null) || (branches.length > 0 ? branches[0].id : null);
    const branchId = resolvedBranchId ? parseInt(resolvedBranchId) : null;

    const getCustomerMenuBase = () => {
        const origin = window.location.origin;
        if (origin.includes(':3000')) {
            return origin.replace(':3000', ':3002');
        }
        return origin;
    };

    const customerBase = getCustomerMenuBase();
    const branchMasterMenuUrl = `${customerBase}/#/branch/${branchId}/menu`;

    const getTableUrl = (table) => {
        return `${customerBase}/#/branch/${branchId}/table/${table.id}`;
    };

    const fetchTables = async () => {
        try {
            setIsLoading(true);
            const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
            const response = await api.get('/restaurant-tables/live-status', { headers });
            setTables(response.data?.tables || []);
        } catch (error) {
            console.error('Failed to load tables:', error);
            toast.error('Failed to load tables for this branch');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, [activeBranchId]);

    const handleOpenModal = (table = null) => {
        if (table) {
            setEditingTable(table);
            setTableFormData({
                table_number: table.table_number,
                seating_capacity: table.seating_capacity || 4,
                status: table.status || 'Available'
            });
        } else {
            setEditingTable(null);
            setTableFormData({
                table_number: `T-${tables.length + 1}`,
                seating_capacity: 4,
                status: 'Available'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmitTable = async (e) => {
        e.preventDefault();
        if (!tableFormData.table_number.trim()) {
            toast.error('Table number is required');
            return;
        }

        try {
            setIsSubmitting(true);
            const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
            const payload = {
                table_number: tableFormData.table_number.trim(),
                seating_capacity: parseInt(tableFormData.seating_capacity) || 4,
                status: tableFormData.status,
                branch_id: branchId || undefined
            };

            if (editingTable) {
                await api.put(`/restaurant-tables/${editingTable.id}`, payload, { headers });
                toast.success(`Table "${tableFormData.table_number}" updated`);
            } else {
                await api.post('/restaurant-tables', payload, { headers });
                toast.success(`Table "${tableFormData.table_number}" created with QR Code`);
            }
            setIsModalOpen(false);
            fetchTables();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSettleBill = async () => {
        if (!settleModalTable) return;
        try {
            setIsSettling(true);
            const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
            await api.post(`/restaurant-tables/${settleModalTable.id}/settle`, {
                payment_method: paymentMethod
            }, { headers });
            toast.success(`Table ${settleModalTable.table_number} bill settled and table marked Vacant!`);
            setSettleModalTable(null);
            fetchTables();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to settle bill');
        } finally {
            setIsSettling(false);
        }
    };

    const handleSeatReservedGuests = async (resId) => {
        try {
            const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
            const res = await api.post(`/table-reservations/${resId}/seat`, {}, { headers });
            toast.success(res.data?.message || 'Guests seated successfully!');
            fetchTables();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to seat guest');
        }
    };

    const handleCancelReservation = async (resId) => {
        if (!window.confirm("Cancel this table reservation?")) return;
        try {
            const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
            await api.post(`/table-reservations/${resId}/cancel`, {}, { headers });
            toast.success('Reservation cancelled and table made Available.');
            fetchTables();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to cancel reservation');
        }
    };

    const handleDeleteTable = async (table) => {
        if (!window.confirm(`Are you sure you want to delete Table ${table.table_number}?`)) return;
        try {
            const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
            await api.delete(`/restaurant-tables/${table.id}`, { headers });
            toast.success(`Table ${table.table_number} deleted`);
            fetchTables();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete table');
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    const handlePrintSingleTable = (table) => {
        const tableUrl = getTableUrl(table);
        const printWindow = window.open("", "_blank", "width=600,height=750");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Stand - Table ${table.table_number} - ${branchName}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 30px;
                        font-family: 'Montserrat', sans-serif, -apple-system;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: #f1f5f9;
                    }
                    .tent-card {
                        width: 380px;
                        background: #ffffff;
                        border-radius: 28px;
                        padding: 36px 28px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                        text-align: center;
                        border: 2px solid #e2e8f0;
                        box-sizing: border-box;
                    }
                    .branch-name {
                        font-size: 14px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        color: #6366f1;
                        margin-bottom: 6px;
                    }
                    .table-title {
                        font-size: 32px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 0 0 16px;
                        letter-spacing: -0.5px;
                    }
                    .qr-wrapper {
                        background: #ffffff;
                        padding: 20px;
                        border-radius: 20px;
                        display: inline-block;
                        border: 3px solid #0f172a;
                        margin: 10px auto 20px;
                    }
                    .cta-text {
                        font-size: 18px;
                        font-weight: 800;
                        color: #0f172a;
                        margin: 0 0 4px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .sub-text {
                        font-size: 12px;
                        color: #64748b;
                        margin: 0 0 20px;
                        font-weight: 500;
                    }
                    .features-pill {
                        display: flex;
                        justify-content: center;
                        gap: 8px;
                        font-size: 11px;
                        font-weight: 700;
                        color: #475569;
                        background: #f8fafc;
                        padding: 8px 12px;
                        border-radius: 20px;
                        border: 1px solid #e2e8f0;
                    }
                    @media print {
                        body { background: transparent; padding: 0; }
                        .no-print { display: none !important; }
                        .tent-card { box-shadow: none; border: 1.5px solid #000; }
                    }
                </style>
            </head>
            <body>
                <div class="tent-card">
                    <div class="branch-name">${branchName}</div>
                    <h1 class="table-title">TABLE ${table.table_number}</h1>
                    <div class="qr-wrapper">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(tableUrl)}&format=svg" width="220" height="220" alt="QR Code" />
                    </div>
                    <div class="cta-text">SCAN FOR HOSTO EMENU</div>
                    <div class="sub-text">Point phone camera to view full menu and order instantly</div>
                    <div class="features-pill">
                        <span>🍽️ Dine-in</span> • <span>🛵 Delivery</span> • <span>🛍️ Takeaway</span>
                    </div>
                    <div class="no-print" style="margin-top: 24px;">
                        <button onclick="window.print()" style="padding: 10px 24px; background: #6366f1; color: white; border: none; font-weight: bold; border-radius: 12px; cursor: pointer; font-size: 14px;">
                            🖨️ Print Stand Card
                        </button>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintAllTables = () => {
        if (tables.length === 0) {
            toast.error("No tables created yet.");
            return;
        }

        const printWindow = window.open("", "_blank", "width=900,height=800");
        const cardsHtml = tables.map(table => {
            const tableUrl = getTableUrl(table);
            return `
                <div class="tent-card">
                    <div class="branch-name">${branchName}</div>
                    <h1 class="table-title">TABLE ${table.table_number}</h1>
                    <div class="qr-wrapper">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tableUrl)}&format=svg" width="180" height="180" alt="Table ${table.table_number} QR" />
                    </div>
                    <div class="cta-text">SCAN FOR MENU</div>
                    <div class="sub-text">Point camera to order directly</div>
                    <div class="features-pill">
                        <span>🍽️ Dine-in</span> • <span>🛵 Delivery</span>
                    </div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>All Table QR Stands - ${branchName}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 24px;
                        font-family: 'Montserrat', sans-serif, -apple-system;
                        background: #ffffff;
                    }
                    .header-bar {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 16px;
                        margin-bottom: 24px;
                    }
                    .grid-container {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 24px;
                    }
                    .tent-card {
                        border: 2px dashed #94a3b8;
                        border-radius: 20px;
                        padding: 24px 20px;
                        text-align: center;
                        page-break-inside: avoid;
                    }
                    .branch-name {
                        font-size: 11px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #6366f1;
                        margin-bottom: 4px;
                    }
                    .table-title {
                        font-size: 24px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 0 0 10px;
                    }
                    .qr-wrapper {
                        display: inline-block;
                        padding: 10px;
                        border: 2px solid #0f172a;
                        border-radius: 14px;
                        margin-bottom: 12px;
                    }
                    .cta-text {
                        font-size: 14px;
                        font-weight: 800;
                        color: #0f172a;
                        margin: 0 0 2px;
                        text-transform: uppercase;
                    }
                    .sub-text {
                        font-size: 11px;
                        color: #64748b;
                        margin: 0 0 10px;
                    }
                    .features-pill {
                        font-size: 10px;
                        font-weight: 700;
                        color: #475569;
                    }
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header-bar no-print">
                    <div>
                        <h2 style="margin: 0; font-size: 20px;">🖨️ Printable Table QR Codes (${tables.length} Tables)</h2>
                        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">${branchName} • Ready for tabletop stand / acrylic tent holders</p>
                    </div>
                    <button onclick="window.print()" style="padding: 10px 24px; background: #0f172a; color: white; border: none; font-weight: bold; border-radius: 10px; cursor: pointer;">
                        Print All Sheets 📄
                    </button>
                </div>
                <div class="grid-container">
                    ${cardsHtml}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <DashboardLayout>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                                <QrCode className="text-indigo-600" size={32} />
                                Table & QR Code Manager
                            </h1>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                                🏢 {branchName}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                            Generate scannable QR codes placed on dining tables inside the branch. Customers scan to order directly.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handlePrintAllTables}
                            disabled={tables.length === 0}
                            className="flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all"
                        >
                            <Printer size={16} />
                            Print All Tables
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
                        >
                            <Plus size={18} />
                            Add Table
                        </button>
                    </div>
                </div>

                {/* Master Branch Counter Stand Banner */}
                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="space-y-3 z-10 max-w-xl">
                        <span className="px-3 py-1 bg-amber-400 text-neutral-950 font-extrabold text-xs uppercase tracking-wider rounded-full inline-block">
                            ⭐ Branch Master QR Code
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                            Counter Stand & Takeaway QR
                        </h2>
                        <p className="text-indigo-200 text-sm leading-relaxed">
                            Place this QR code at your reception counter, cashier desk, or entrance. Customers scan to browse your full branch menu for dine-in, takeaway, or doorstep delivery.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                                onClick={() => copyToClipboard(branchMasterMenuUrl, "Master Menu URL")}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 transition-all"
                            >
                                <Copy size={14} />
                                Copy Menu Link
                            </button>
                            <a
                                href={branchMasterMenuUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 transition-all"
                            >
                                <ExternalLink size={14} />
                                Preview Live
                            </a>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-2xl flex flex-col items-center shrink-0 z-10 text-neutral-900">
                        <QRCodeSVG value={branchMasterMenuUrl} size={150} level="H" includeMargin={true} />
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mt-2">
                            {branchName}
                        </span>
                    </div>
                </div>

                {/* Table Cards Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Utensils size={20} className="text-indigo-600" />
                            Branch Dining Tables ({tables.length})
                        </h3>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} className="bg-white rounded-2xl h-64 border border-gray-100 animate-pulse p-6" />
                            ))}
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                            <Store className="mx-auto text-gray-400 mb-3" size={48} />
                            <h4 className="text-lg font-bold text-gray-700">No tables created yet for this branch</h4>
                            <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 mb-6">
                                Add restaurant tables to generate scannable tabletop tent cards with unique QR codes.
                            </p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                + Add First Table
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {tables.map(table => {
                                const tableUrl = getTableUrl(table);
                                return (
                                    <div
                                        key={table.id}
                                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all p-5 flex flex-col justify-between group"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                                        Table #{table.id}
                                                    </span>
                                                    <h4 className="text-xl font-black text-gray-900 mt-1">
                                                        Table {table.table_number}
                                                    </h4>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                    table.status === 'Available'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                        : table.status === 'Occupied'
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                }`}>
                                                    {table.status}
                                                </span>
                                            </div>

                                            {/* Live Dining & Billing Strip */}
                                            <div className={`p-2.5 rounded-xl border mb-3 flex items-center justify-between ${
                                                table.status === 'Occupied' 
                                                    ? 'bg-rose-50 border-rose-200' 
                                                    : table.status === 'Waiting for Bill'
                                                    ? 'bg-amber-50 border-amber-200'
                                                    : table.status === 'Reserved'
                                                    ? 'bg-purple-50 border-purple-200'
                                                    : 'bg-emerald-50 border-emerald-200'
                                            }`}>
                                                <div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                                                        table.status === 'Occupied' ? 'text-rose-700' : table.status === 'Waiting for Bill' ? 'text-amber-800' : table.status === 'Reserved' ? 'text-purple-700' : 'text-emerald-700'
                                                    }`}>
                                                        {table.status === 'Occupied' ? '🔴 Dining' : table.status === 'Waiting for Bill' ? '🟡 Waiting Bill' : table.status === 'Reserved' ? `🟣 Reserved ${table.reservation ? '@ ' + table.reservation.time : ''}` : '🟢 Vacant'}
                                                    </span>
                                                    {table.reservation?.guest_name && (
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[130px]">
                                                            👤 {table.reservation.guest_name} ({table.reservation.guest_count}p)
                                                        </span>
                                                    )}
                                                    {table.current_bill_amount > 0 ? (
                                                        <span className="text-xs font-black text-slate-900 block mt-0.5">
                                                            Bill: ₹{Number(table.current_bill_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 block">No active bill</span>
                                                    )}
                                                </div>

                                                {table.status === 'Reserved' && table.reservation && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleSeatReservedGuests(table.reservation.id)}
                                                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-sm flex items-center gap-1"
                                                            title="Seat Guests"
                                                        >
                                                            <span>🟢 Seat</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelReservation(table.reservation.id)}
                                                            className="p-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-300 rounded-lg text-[10px] font-bold"
                                                            title="Cancel Reservation"
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </div>
                                                )}
                                                {(table.status === 'Occupied' || table.status === 'Waiting for Bill' || table.current_bill_amount > 0) && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => printTableBill({ table, branch: currentBranch, isPaid: false })}
                                                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1"
                                                            title="Print Dining Bill Slip"
                                                        >
                                                            <Receipt size={11} />
                                                            <span>Bill</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setSettleModalTable(table)}
                                                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-sm flex items-center gap-1"
                                                            title="Settle Bill & Free Table"
                                                        >
                                                            <CreditCard size={11} />
                                                            <span>Settle</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Table QR Stand Preview */}
                                            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 my-3 flex flex-col items-center text-center group-hover:border-indigo-400 transition-colors">
                                                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                                    <QRCodeSVG value={tableUrl} size={130} level="M" />
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-2.5">
                                                    Scan to Order at Table {table.table_number}
                                                </p>
                                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Users size={12} /> {table.seating_capacity || 4} Seats
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 space-y-2">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handlePrintSingleTable(table)}
                                                    className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <Printer size={14} />
                                                    Print Stand
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(tableUrl, `Table ${table.table_number} Link`)}
                                                    className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                                                    title="Copy Direct Link"
                                                >
                                                    <Copy size={15} />
                                                </button>
                                            </div>

                                            <div className="flex justify-between items-center pt-1 text-xs text-gray-400">
                                                <button
                                                    onClick={() => handleOpenModal(table)}
                                                    className="hover:text-indigo-600 font-semibold flex items-center gap-1"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTable(table)}
                                                    className="hover:text-rose-600 font-semibold flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Add / Edit Table Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Utensils className="text-indigo-600" size={22} />
                                    {editingTable ? `Edit Table ${editingTable.table_number}` : 'Add New Restaurant Table'}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitTable} className="space-y-4 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                        Table Identifier / Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={tableFormData.table_number}
                                        onChange={(e) => setTableFormData({ ...tableFormData, table_number: e.target.value })}
                                        placeholder="e.g. 1, 2, Outdoor-A, VIP-1"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">This number is printed on the tent card and shown on orders.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                            Seating Capacity
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={tableFormData.seating_capacity}
                                            onChange={(e) => setTableFormData({ ...tableFormData, seating_capacity: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={tableFormData.status}
                                            onChange={(e) => setTableFormData({ ...tableFormData, status: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                        >
                                            <option value="Available">Available</option>
                                            <option value="Occupied">Occupied</option>
                                            <option value="Reserved">Reserved</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-indigo-100"
                                    >
                                        {isSubmitting ? 'Saving...' : (editingTable ? 'Update Table' : 'Create & Generate QR')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

