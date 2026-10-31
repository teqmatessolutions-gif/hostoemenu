import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import API from "../services/api";
import { useBranch } from "../contexts/BranchContext";
import {
  CalendarCheck, CalendarX, Clock, DollarSign, Users, LogIn, LogOut,
  CheckCircle2, AlertTriangle, XCircle, ChevronRight, Loader2,
  TrendingUp, Utensils, Wrench, Banknote, History, RefreshCw, Building2,
  Printer, PlusCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

const BUDGET_CATEGORIES = [
  "Utilities",
  "Maintenance",
  "Salary",
  "Food & Beverage",
  "Marketing",
  "Transportation",
  "Supplies",
  "Other",
];

const DEPARTMENTS = [
  "Restaurant",
  "Facility",
  "Hotel",
  "Office",
  "Security",
  "Fire & Safety",
  "Housekeeping"
];

function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees ' : 'Rupees ';
  return str + 'Only';
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function formatReportSum(val) {
  if (!val || val === 0) return "₹ -";
  return `₹ ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayBookDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

const mapTransactionToDayBook = (tx) => {
  let vchType = "Receipt";
  const type = tx.reference_type?.toLowerCase() || "";
  if (type === "expense" || type === "purchase_payment" || type === "vendor_payment") {
    vchType = "Payment";
  } else if (type === "purchase") {
    vchType = "Purchase";
  } else if (type === "checkout") {
    vchType = "Sales";
  } else if (type === "contra") {
    vchType = "Contra";
  } else {
    vchType = tx.reference_type ? tx.reference_type.charAt(0).toUpperCase() + tx.reference_type.slice(1).toLowerCase() : "Journal";
  }

  let vchNo = tx.entry_number || "";
  const match = vchNo.match(/\d+$/);
  if (match) {
    vchNo = match[0];
  }

  let particulars = tx.description || "General Transaction";
  const debitLedger = tx.lines?.[0]?.debit;
  const creditLedger = tx.lines?.[0]?.credit;

  let debitAmount = 0;
  let creditAmount = 0;

  if (vchType === "Payment" || vchType === "Purchase") {
    particulars = debitLedger || tx.description || "Expense Account";
    debitAmount = tx.total_amount || 0;
  } else if (vchType === "Receipt" || vchType === "Sales") {
    particulars = creditLedger || tx.description || "Revenue Account";
    creditAmount = tx.total_amount || 0;
  } else {
    const isCashDebited = tx.lines?.some(l => l.debit?.toLowerCase().includes("cash") && !l.debit?.toLowerCase().includes("bank"));
    if (isCashDebited) {
      particulars = creditLedger || tx.description || "Contra A/C";
      creditAmount = tx.total_amount || 0;
    } else {
      particulars = debitLedger || tx.description || "Contra A/C";
      debitAmount = tx.total_amount || 0;
    }
  }

  if (particulars) {
    particulars = particulars.toUpperCase();
  }

  return {
    date: formatDayBookDate(tx.entry_date),
    particulars,
    vchType,
    vchNo,
    debitAmount,
    creditAmount
  };
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color = "indigo", sub }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChecklistItem({ item }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${item.ok ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
      {item.ok
        ? <CheckCircle2 className="text-emerald-500 w-5 h-5 flex-shrink-0" />
        : <AlertTriangle className="text-amber-500 w-5 h-5 flex-shrink-0" />}
      <span className="text-sm font-medium text-gray-700 flex-1">{item.label}</span>
      {!item.ok && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {item.count} pending
        </span>
      )}
      {item.ok && item.count !== undefined && (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          {item.count} in-house
        </span>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DayAudit() {
  const { activeBranchId, activeBranch } = useBranch();

  const [currentAudit, setCurrentAudit] = useState(null);
  const [history, setHistory] = useState([]);
  const [checklist, setChecklist] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("today"); // 'today' | 'history' | 'report'

  // Employees list for Payment Voucher dropdown
  const [employees, setEmployees] = useState([]);
  
  // Payment Voucher states
  const [showCreateVoucher, setShowCreateVoucher] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    employee_id: "",
    category: "",
    department: "",
    amount: "",
    payment_mode: "Cash",
    description: "",
    date: todayISO()
  });
  
  const [showVoucherSlip, setShowVoucherSlip] = useState(false);
  const [selectedVoucherTx, setSelectedVoucherTx] = useState(null);

  // Historical Report
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [historicalTransactions, setHistoricalTransactions] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Open Day form
  const [openForm, setOpenForm] = useState({ 
    business_date: todayISO(), 
    opening_cash_balance: "", 
    opening_account_balance: "",
    opening_notes: "" 
  });
  const [showOpenForm, setShowOpenForm] = useState(false);

  // Close Day form
  const [closeForm, setCloseForm] = useState({ 
    closing_cash_balance: "", 
    closing_account_balance: "",
    system_expected_cash: 0,
    system_expected_account: 0,
    override_reason: "",
    closing_notes: "" 
  });
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/employees?limit=1000");
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        API.get("/day-audit/current"),
        API.get("/day-audit/history?limit=30"),
      ]);
      const current = currentRes.data;
      setCurrentAudit(current);
      setHistory(historyRes.data || []);

      if (current) {
        const [clRes, txRes] = await Promise.all([
          API.get("/day-audit/checklist"),
          API.get("/day-audit/transactions")
        ]);
        setChecklist(clRes.data);
        const txs = txRes.data || [];
        setTransactions(txs);

        // Calculate expected balances
        let expectedCash = current.opening_cash_balance || 0;
        let expectedAcc = current.opening_account_balance || 0;

        txs.forEach(tx => {
          const type = tx.reference_type?.toLowerCase();
          
          // An expense or payment represents an outflow from cash/bank
          const isOutflow = type === "expense" || type === "purchase_payment" || type === "vendor_payment";
          const amount = tx.total_amount || 0;
          
          const isCash = tx.lines?.some(l => {
            const d = l.debit?.toLowerCase() || "";
            const c = l.credit?.toLowerCase() || "";
            // Primary cash ledgers: "Cash in Hand", "Petty Cash"
            return (d.includes("cash") && !d.includes("bank")) || 
                   (c.includes("cash") && !c.includes("bank"));
          });

          const isBank = tx.lines?.some(l => {
            const d = l.debit?.toLowerCase() || "";
            const c = l.credit?.toLowerCase() || "";
            // Primary bank ledgers: "Bank Account", "UPI", "Online"
            return d.includes("bank") || c.includes("bank") || 
                   d.includes("upi") || c.includes("upi") ||
                   d.includes("online") || c.includes("online");
          });

          // We only track actual cash/bank movements for expected balances
          // Pure accounting entries like 'purchase' (AP) or 'waste' are ignored
          if (isCash) {
            expectedCash += isOutflow ? -amount : amount;
          } else if (isBank) {
            expectedAcc += isOutflow ? -amount : amount;
          }
        });

        setCloseForm(prev => ({
          ...prev,
          closing_cash_balance: expectedCash.toFixed(2),
          closing_account_balance: expectedAcc.toFixed(2),
          system_expected_cash: expectedCash,
          system_expected_account: expectedAcc
        }));

      } else {
        setChecklist(null);
        setTransactions([]);
        
        // Auto-fill opening balance from previous day's closing balance
        if (historyRes.data && historyRes.data.length > 0) {
          const lastAudit = historyRes.data[0];
          setOpenForm(prev => ({
            ...prev,
            opening_cash_balance: lastAudit.closing_cash_balance !== null ? lastAudit.closing_cash_balance : "",
            opening_account_balance: lastAudit.closing_account_balance !== null ? lastAudit.closing_account_balance : ""
          }));
        } else {
          setOpenForm(prev => ({
            ...prev,
            opening_cash_balance: "",
            opening_account_balance: ""
          }));
        }
      }
    } catch (err) {
      console.error("Day audit fetch error:", err);
      toast.error("Failed to load day audit data");
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => { 
    fetchAll();
    fetchEmployees();
  }, [fetchAll]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleOpenDay = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await API.post("/day-audit/open", {
        business_date: openForm.business_date,
        opening_cash_balance: parseFloat(openForm.opening_cash_balance || 0),
        opening_account_balance: parseFloat(openForm.opening_account_balance || 0),
        opening_notes: openForm.opening_notes,
      });
      toast.success("Business day opened successfully!");
      setShowOpenForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to open day");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const data = new FormData();
      data.append("employee_id", voucherForm.employee_id);
      data.append("category", voucherForm.category);
      data.append("amount", voucherForm.amount);
      data.append("date", voucherForm.date);
      data.append("description", voucherForm.description || "");
      if (voucherForm.department) data.append("department", voucherForm.department);
      data.append("payment_mode", voucherForm.payment_mode);

      await API.post("/expenses", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Payment Voucher created successfully!");
      setShowCreateVoucher(false);
      setVoucherForm({
        employee_id: "",
        category: "",
        department: "",
        amount: "",
        payment_mode: "Cash",
        description: "",
        date: todayISO()
      });
      fetchAll();
    } catch (err) {
      console.error("Create voucher error:", err);
      toast.error(err.response?.data?.detail || "Failed to create voucher");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseDay = async (e) => {
    e.preventDefault();
    
    // Validate override reason
    const cashDiff = Math.abs(parseFloat(closeForm.closing_cash_balance || 0) - closeForm.system_expected_cash);
    const accDiff = Math.abs(parseFloat(closeForm.closing_account_balance || 0) - closeForm.system_expected_account);
    
    if ((cashDiff > 0.01 || accDiff > 0.01) && !closeForm.override_reason.trim()) {
      toast.error("Please provide a reason for the balance discrepancy.");
      return;
    }

    setActionLoading(true);
    try {
      await API.post("/day-audit/close", {
        closing_cash_balance: parseFloat(closeForm.closing_cash_balance || 0),
        closing_account_balance: parseFloat(closeForm.closing_account_balance || 0),
        system_expected_cash: closeForm.system_expected_cash,
        system_expected_account: closeForm.system_expected_account,
        override_reason: closeForm.override_reason,
        closing_notes: closeForm.closing_notes,
      });
      toast.success("Day closed & night audit complete!");
      setShowCloseConfirm(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Night audit failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewReport = async (audit) => {
    setReportLoading(true);
    try {
      const txRes = await API.get(`/day-audit/${audit.id}/transactions`);
      console.log("VIEWING REPORT FOR:", audit);
      setSelectedAudit(audit);
      setHistoricalTransactions(txRes.data || []);
      setShowReportModal(true);
    } catch (err) {
      toast.error("Failed to load audit transactions");
    } finally {
      setReportLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isCashTransaction = (tx) => {
    return tx.lines?.some(l => {
      const d = l.debit?.toLowerCase() || "";
      const c = l.credit?.toLowerCase() || "";
      return (d.includes("cash") && !d.includes("bank")) || 
             (c.includes("cash") && !c.includes("bank"));
    });
  };

  const isBankTransaction = (tx) => {
    return tx.lines?.some(l => {
      const d = l.debit?.toLowerCase() || "";
      const c = l.credit?.toLowerCase() || "";
      return d.includes("bank") || c.includes("bank") || 
             d.includes("upi") || c.includes("upi") ||
             d.includes("online") || c.includes("online");
    });
  };

  const cashTransactions = transactions.filter(isCashTransaction);
  const accountTransactions = transactions.filter(isBankTransaction);

  const splitTransactions = (txs) => {
    const cash = txs.filter(isCashTransaction);
    const acc = txs.filter(isBankTransaction);
    return { cash, acc };
  };

  const getDebitCredit = (tx, mode = "cash") => {
    if (!tx.lines) return { debit: 0, credit: 0 };
    const isTarget = (name) => {
      if (!name) return false;
      const n = name.toLowerCase();
      if (mode === "cash") {
        return n.includes("cash") && !n.includes("bank");
      } else {
        return n.includes("bank") || n.includes("upi") || n.includes("online");
      }
    };
    
    let debit = 0;
    let credit = 0;
    tx.lines.forEach(l => {
      if (isTarget(l.debit)) debit += l.amount;
      if (isTarget(l.credit)) credit += l.amount;
    });
    return { debit, credit };
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const isOpen = currentAudit?.status === "open";

  if (activeBranchId === "all") {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-500">
            <Building2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Select a Property</h2>
          <p className="text-gray-500 max-w-sm">
            Day Audit operations are property-specific. Please select a specific branch from the sidebar to manage its business day.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            
            /* Print Voucher */
            .print-voucher-active .print-voucher-area,
            .print-voucher-active .print-voucher-area * {
              visibility: visible !important;
            }
            .print-voucher-active .print-voucher-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              background: white !important;
              color: black !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
            
            /* Print Day Book */
            .print-report-active:not(.print-voucher-active) .print-daybook-area,
            .print-report-active:not(.print-voucher-active) .print-daybook-area * {
              visibility: visible !important;
            }
            .print-report-active:not(.print-voucher-active) .print-daybook-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              background: white !important;
              color: black !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }

            .no-print, .no-print * {
              display: none !important;
              visibility: hidden !important;
            }
            @page {
              size: auto;
              margin: 15mm 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
      </style>
      <div id="print-root" className={`max-w-6xl mx-auto space-y-6 pb-10 ${showVoucherSlip ? "print-voucher-active" : ""} ${showReportModal ? "print-report-active" : ""}`}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <CalendarCheck className="text-indigo-600" size={32} />
              Day Audit
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Manage the business day lifecycle for{" "}
              <span className="font-semibold text-gray-700">{activeBranch?.name || "this branch"}</span>
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors no-print"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit no-print">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "today" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Today's Audit
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "history" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Audit History
          </button>

        </div>

        {/* ── Tab: Today's Audit ── */}
        {activeTab === "today" && (
          <div className="space-y-6">
            {/* ── Business Day Status Banner ── */}
        <div className={`rounded-2xl p-6 flex items-center justify-between ${isOpen ? "bg-emerald-500" : "bg-gray-800"}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isOpen ? "bg-emerald-400" : "bg-gray-700"}`}>
              {isOpen ? <CalendarCheck className="text-white" size={28} /> : <CalendarX className="text-gray-300" size={28} />}
            </div>
            <div>
              {isOpen ? (
                <>
                  <p className="text-emerald-100 text-sm font-medium">BUSINESS DAY OPEN</p>
                  <p className="text-white text-2xl font-bold">{formatDate(currentAudit.business_date)}</p>
                  <p className="text-emerald-200 text-sm">Opened at {formatTime(currentAudit.opened_at)}</p>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm font-medium">NO ACTIVE BUSINESS DAY</p>
                  <p className="text-white text-2xl font-bold">Day is Closed</p>
                  <p className="text-gray-400 text-sm">Open a new business day to accept transactions</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOpen && (
              <button
                onClick={() => setShowCreateVoucher(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-705 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
              >
                <PlusCircle size={18} /> Create Voucher
              </button>
            )}
            {isOpen ? (
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="flex items-center gap-2 bg-white text-emerald-700 font-bold px-6 py-3 rounded-xl hover:bg-emerald-50 transition-all shadow-lg"
              >
                <CalendarX size={18} /> Close Day
              </button>
            ) : (
              <button
                onClick={() => setShowOpenForm(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-500 transition-all shadow-lg"
              >
                <CalendarCheck size={18} /> Open Day
              </button>
            )}
          </div>
        </div>

        {/* ── Live Stats (only when open) ── */}
        {isOpen && currentAudit && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users size={22} />} label="In-House Rooms" value={checklist?.checklist?.find(c => c.key === "in_house")?.count ?? "—"} color="indigo" />
            <StatCard icon={<LogIn size={22} />} label="Check-Ins Today" value={currentAudit.new_checkins || 0} color="emerald" />
            <StatCard icon={<LogOut size={22} />} label="Check-Outs Today" value={currentAudit.new_checkouts || 0} color="amber" />
            <StatCard icon={<Banknote size={22} />} label="Payments Received" value={formatCurrency(currentAudit.total_payments_received)} color="blue" />
            <StatCard icon={<Utensils size={22} />} label="Food Revenue" value={formatCurrency(currentAudit.total_food_revenue)} color="rose" />
            <StatCard icon={<Wrench size={22} />} label="Service Revenue" value={formatCurrency(currentAudit.total_service_revenue)} color="purple" />
            <StatCard icon={<DollarSign size={22} />} label="Daily Expenses" value={formatCurrency(currentAudit.total_expenses)} color="rose" />
            <StatCard icon={<History size={22} />} label="Inv. Purchases" value={formatCurrency(currentAudit.total_purchases)} color="amber" />
          </div>
        )}

        {/* ── Cash Transactions ── */}
        {isOpen && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Banknote size={20} className="text-emerald-500" />
                Cash Transactions (Today)
              </h2>
              <span className="text-xs text-gray-500 font-medium">{cashTransactions.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Type</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Number</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Time</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Description</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Debit</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Credit</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cashTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No cash transactions recorded today.</td>
                    </tr>
                  ) : (
                    cashTransactions.map((tx) => {
                      const { debit, credit } = getDebitCredit(tx, "cash");
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                              {tx.reference_type || "General"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{tx.entry_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(tx.entry_date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={tx.description}>{tx.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">{debit > 0 ? formatCurrency(debit) : "—"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-rose-600 text-right">{credit > 0 ? formatCurrency(credit) : "—"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <button
                              onClick={() => {
                                setSelectedVoucherTx(tx);
                                setShowVoucherSlip(true);
                              }}
                              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold text-xs border border-indigo-100 hover:border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors bg-indigo-50/50"
                            >
                              <Printer size={13} /> Voucher
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Account Transactions ── */}
        {isOpen && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-500" />
                Account/Bank Transactions (Today)
              </h2>
              <span className="text-xs text-gray-500 font-medium">{accountTransactions.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Type</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Number</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Time</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Description</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Debit</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Credit</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {accountTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No bank transactions recorded today.</td>
                    </tr>
                  ) : (
                    accountTransactions.map((tx) => {
                      const { debit, credit } = getDebitCredit(tx, "bank");
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              tx.reference_type === "CHECKOUT" ? "bg-emerald-100 text-emerald-700" :
                              tx.reference_type === "purchase" ? "bg-amber-100 text-amber-700" :
                              tx.reference_type === "consumption" ? "bg-indigo-100 text-indigo-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {tx.reference_type || "General"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{tx.entry_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(tx.entry_date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={tx.description}>{tx.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 text-right">{debit > 0 ? formatCurrency(debit) : "—"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-rose-600 text-right">{credit > 0 ? formatCurrency(credit) : "—"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <button
                              onClick={() => {
                                setSelectedVoucherTx(tx);
                                setShowVoucherSlip(true);
                              }}
                              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold text-xs border border-indigo-100 hover:border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors bg-indigo-50/50"
                            >
                              <Printer size={13} /> Voucher
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Pre-close Checklist (only when open) ── */}
        {isOpen && checklist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-indigo-500" />
              Pre-Close Checklist
            </h2>
            <div className="space-y-2">
              {checklist.checklist.map(item => (
                <ChecklistItem key={item.key} item={item} />
              ))}
            </div>
            {!checklist.can_close && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-amber-800">
                  Resolve all pending items before closing the day. You can still close with warnings by proceeding.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {/* ── Tab: Audit History ── */}
    {activeTab === "history" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <History size={20} className="text-indigo-500" />
              Audit History
            </h2>
            <span className="text-xs text-gray-400">Last {history.length} days</span>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <History size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No audit history yet</p>
              <p className="text-sm">Open your first business day to begin.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((audit) => (
                <div key={audit.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${audit.status === "closed" ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-600"}`}>
                      {audit.status === "closed" ? <CalendarX size={18} /> : <CalendarCheck size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{formatDate(audit.business_date)}</p>
                      <p className="text-xs text-gray-400">
                        {audit.status === "closed"
                          ? `Closed at ${formatTime(audit.closed_at)}`
                          : `Opened at ${formatTime(audit.opened_at)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Rooms</p>
                      <p className="font-semibold text-gray-700">{audit.rooms_occupied}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${audit.status === "closed" ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-700"}`}>
                      {audit.status}
                    </span>
                    <button
                      onClick={() => handleViewReport(audit)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Detailed Report"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

        {/* ── MODAL: Detailed Report ── */}
        {showReportModal && selectedAudit && (() => {
          const processedTxList = [...historicalTransactions]
            .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
            .map(tx => {
              let bankInflow = 0;
              let cashInflow = 0;
              let bankOutflow = 0;
              let cashOutflow = 0;

              tx.lines?.forEach(line => {
                const debitName = line.debit?.toLowerCase() || "";
                const creditName = line.credit?.toLowerCase() || "";

                if (debitName.includes("cash") && !debitName.includes("bank")) {
                  cashInflow += line.amount;
                } else if (debitName.includes("bank") || debitName.includes("upi") || debitName.includes("online")) {
                  bankInflow += line.amount;
                }

                if (creditName.includes("cash") && !creditName.includes("bank")) {
                  cashOutflow += line.amount;
                } else if (creditName.includes("bank") || creditName.includes("upi") || creditName.includes("online")) {
                  bankOutflow += line.amount;
                }
              });

              let particulars = tx.description || "General Transaction";
              const debitLedger = tx.lines?.[0]?.debit;
              const creditLedger = tx.lines?.[0]?.credit;
              
              const type = tx.reference_type?.toLowerCase() || "";
              if (type === "expense" || type === "purchase_payment" || type === "vendor_payment") {
                particulars = debitLedger || tx.description || "Expense Account";
              } else if (type === "purchase") {
                particulars = debitLedger || tx.description || "Purchase Account";
              } else if (type === "checkout") {
                particulars = creditLedger || tx.description || "Sales/Room Billing";
              } else if (type === "payment") {
                particulars = creditLedger || tx.description || "Receipt Account";
              } else {
                particulars = tx.description || "Journal Entry";
              }

              return {
                id: tx.id,
                rawDate: tx.entry_date,
                date: formatDayBookDate(tx.entry_date),
                particulars: particulars.toUpperCase(),
                reference_type: tx.reference_type,
                entry_number: tx.entry_number,
                bankInflow,
                cashInflow,
                bankOutflow,
                cashOutflow,
                totalInflow: bankInflow + cashInflow,
                totalOutflow: bankOutflow + cashOutflow,
                isContra: tx.reference_type?.toLowerCase() === "contra",
                rawTx: tx
              };
            });

          const incomeTransactions = processedTxList.filter(tx => tx.totalInflow > 0);
          const totalInflowSum = incomeTransactions.reduce((sum, tx) => sum + tx.totalInflow, 0);

          const expenseTransactions = processedTxList.filter(tx => tx.totalOutflow > 0);
          const totalOutflowSum = expenseTransactions.reduce((sum, tx) => sum + tx.totalOutflow, 0);

          return (
            <>
              {/* Modal Dialog */}
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white no-print">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <History size={22} className="text-slate-300" />
                        Audit Report: {formatDate(selectedAudit.business_date)}
                        {selectedAudit.status === "open" && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-md animate-pulse">
                            LIVE
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                        Branch Code: {activeBranchId} | ID: #{selectedAudit.id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => window.print()}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer size={14} /> Print Report
                      </button>
                      <button 
                        onClick={() => setShowReportModal(false)} 
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 shadow-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/30 flex-1">
                    {/* 1. Summary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
                      {/* Revenue Breakdown */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Revenue Breakdown</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Room Revenue</span>
                            <span className="font-bold text-slate-800">{formatCurrency(selectedAudit.total_room_revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Food Revenue</span>
                            <span className="font-bold text-slate-800">{formatCurrency(selectedAudit.total_food_revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Service Revenue</span>
                            <span className="font-bold text-slate-800">{formatCurrency(selectedAudit.total_service_revenue)}</span>
                          </div>
                          <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-bold text-slate-900">
                            <span>Total Revenue</span>
                            <span>{formatCurrency((selectedAudit.total_room_revenue || 0) + (selectedAudit.total_food_revenue || 0) + (selectedAudit.total_service_revenue || 0))}</span>
                          </div>
                        </div>
                      </div>

                      {/* Balance Reconciliation */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Balance Reconciliation</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Opening</span>
                            <span className="font-bold text-slate-800">
                              {formatCurrency((selectedAudit.opening_cash_balance || 0) + (selectedAudit.opening_account_balance || 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Expected Closing</span>
                            <span className="font-bold text-slate-800">
                              {formatCurrency((selectedAudit.system_expected_cash || 0) + (selectedAudit.system_expected_account || 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Actual Closing</span>
                            <span className={`font-bold ${selectedAudit.status === 'open' ? 'text-slate-400 italic' : 'text-emerald-600'}`}>
                              {selectedAudit.status === 'open' ? 'In Progress' : formatCurrency((selectedAudit.closing_cash_balance || 0) + (selectedAudit.closing_account_balance || 0))}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-bold text-slate-900">
                            <span>Difference</span>
                            {selectedAudit.status === 'open' ? (
                              <span className="text-slate-400 italic font-normal">N/A</span>
                            ) : (
                              (() => {
                                const diff = ((selectedAudit.closing_cash_balance || 0) + (selectedAudit.closing_account_balance || 0)) - 
                                             ((selectedAudit.system_expected_cash || 0) + (selectedAudit.system_expected_account || 0));
                                return (
                                  <span className={diff === 0 ? "text-emerald-600" : "text-rose-600"}>
                                    {formatCurrency(diff)}
                                  </span>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Other Metrics */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Other Metrics</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500">GST Collected</span>
                            <span className="font-bold text-slate-800">{formatCurrency(selectedAudit.total_gst_collected)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Inv. Purchases</span>
                            <span className="font-bold text-rose-500">{formatCurrency(selectedAudit.total_purchases)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Daily Expenses</span>
                            <span className="font-bold text-rose-500">{formatCurrency(selectedAudit.total_expenses)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedAudit.override_reason && (
                      <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-100 no-print">
                        <strong>Balance Override Reason:</strong> {selectedAudit.override_reason}
                      </div>
                    )}

                    {/* CASH BOOK BANNER */}
                    <div className="bg-[#1b365d] text-white p-5 rounded-xl relative overflow-hidden no-print mb-6 border border-[#1b365d] shadow-sm">
                      <div className="absolute right-4 top-2 text-3xl font-black opacity-10 select-none pointer-events-none tracking-widest font-mono">
                        CASH BOOK
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {/* INFLOWS SUMMARY */}
                        <div>
                          <h4 className="text-[10px] font-black tracking-widest text-slate-300 uppercase mb-3 border-b border-blue-900/50 pb-1">Inflows Summary</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-blue-900/30 pb-1">
                              <span className="text-slate-200 font-medium">A/C RECEIVED</span>
                              <span className="font-mono font-bold">
                                {formatReportSum(incomeTransactions.reduce((sum, tx) => sum + tx.bankInflow, 0))}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-blue-900/30 pb-1">
                              <span className="text-slate-200 font-medium">CASH RECEIVABLES</span>
                              <span className="font-mono font-bold">
                                {formatReportSum(incomeTransactions.reduce((sum, tx) => sum + tx.cashInflow, 0))}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1.5 font-black text-sm">
                              <span className="text-white">TOTAL COLLECTION AMOUNT</span>
                              <span className="font-mono text-emerald-400">
                                {formatReportSum(totalInflowSum)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* OUTFLOWS SUMMARY */}
                        <div>
                          <h4 className="text-[10px] font-black tracking-widest text-slate-300 uppercase mb-3 border-b border-blue-900/50 pb-1">Outflows Summary</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-blue-900/30 pb-1">
                              <span className="text-slate-200 font-medium">A/C PAID</span>
                              <span className="font-mono font-bold">
                                {formatReportSum(expenseTransactions.reduce((sum, tx) => sum + tx.bankOutflow, 0))}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-blue-900/30 pb-1">
                              <span className="text-slate-200 font-medium">CASH PAID</span>
                              <span className="font-mono font-bold">
                                {formatReportSum(expenseTransactions.reduce((sum, tx) => sum + tx.cashOutflow, 0))}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1.5 font-black text-sm">
                              <span className="text-white">TOTAL EXPENSE AMOUNT</span>
                              <span className="font-mono text-rose-400">
                                {formatReportSum(totalOutflowSum)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* INCOMES Section */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden no-print">
                      <div className="bg-slate-100 text-slate-800 font-bold text-center py-2 uppercase tracking-widest text-xs border-b border-slate-200">
                        INCOMES
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-900">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                              <th className="px-4 py-2.5 w-[15%] text-left uppercase font-bold border-r border-slate-200">Date</th>
                              <th className="px-4 py-2.5 w-[40%] text-left uppercase font-bold border-r border-slate-200">Discription</th>
                              <th className="px-4 py-2.5 w-[14%] text-right uppercase font-bold border-r border-slate-200">A/C Received</th>
                              <th className="px-4 py-2.5 w-[14%] text-right uppercase font-bold border-r border-slate-200">Cash Received</th>
                              <th className="px-4 py-2.5 w-[13%] text-right uppercase font-bold border-r border-slate-200">Total Amount</th>
                              <th className="px-4 py-2.5 w-[4%] text-center uppercase font-bold no-print">Vch</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {incomeTransactions.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] border-r border-slate-200 text-slate-600">{tx.date}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200 uppercase">{tx.particulars}</td>
                                <td className="px-4 py-3 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                  {tx.bankInflow > 0 ? `₹ ${tx.bankInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                  {tx.cashInflow > 0 ? `₹ ${tx.cashInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[11px] border-r border-slate-200 font-bold text-slate-900">
                                  ₹ {tx.totalInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-center no-print">
                                  <button
                                    onClick={() => {
                                      setSelectedVoucherTx(tx.rawTx);
                                      setShowVoucherSlip(true);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors"
                                    title="View Voucher"
                                  >
                                    <Printer size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {incomeTransactions.length === 0 && (
                              <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-slate-400 italic bg-slate-50/5">No income transactions recorded on this day.</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 font-black border-t-2 border-slate-300">
                              <td colSpan="2" className="px-4 py-3 text-right uppercase tracking-wider text-slate-700 border-r border-slate-200">Total Incomes:</td>
                              <td className="px-4 py-3 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                                ₹ {incomeTransactions.reduce((sum, tx) => sum + tx.bankInflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                                ₹ {incomeTransactions.reduce((sum, tx) => sum + tx.cashInflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[12px] font-black text-emerald-700 border-r border-slate-200">
                                ₹ {totalInflowSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="no-print"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* EXPENSES Section */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden no-print">
                      <div className="bg-slate-100 text-slate-800 font-bold text-center py-2 uppercase tracking-widest text-xs border-b border-slate-200">
                        EXPENSES
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-900">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                              <th className="px-4 py-2.5 w-[15%] text-left uppercase font-bold border-r border-slate-200">Date</th>
                              <th className="px-4 py-2.5 w-[40%] text-left uppercase font-bold border-r border-slate-200">Discription</th>
                              <th className="px-4 py-2.5 w-[14%] text-right uppercase font-bold border-r border-slate-200">A/C Paid</th>
                              <th className="px-4 py-2.5 w-[14%] text-right uppercase font-bold border-r border-slate-200">Cash Paid</th>
                              <th className="px-4 py-2.5 w-[13%] text-right uppercase font-bold border-r border-slate-200">Total Amount</th>
                              <th className="px-4 py-2.5 w-[4%] text-center uppercase font-bold no-print">Vch</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {expenseTransactions.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] border-r border-slate-200 text-slate-600">{tx.date}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200 uppercase">{tx.particulars}</td>
                                <td className="px-4 py-3 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                  {tx.bankOutflow > 0 ? `₹ ${tx.bankOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                                  {tx.cashOutflow > 0 ? `₹ ${tx.cashOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[11px] border-r border-slate-200 font-bold text-slate-900">
                                  ₹ {tx.totalOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-center no-print">
                                  <button
                                    onClick={() => {
                                      setSelectedVoucherTx(tx.rawTx);
                                      setShowVoucherSlip(true);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-855 p-1 rounded hover:bg-indigo-50 transition-colors"
                                    title="View Voucher"
                                  >
                                    <Printer size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {expenseTransactions.length === 0 && (
                              <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-slate-400 italic bg-slate-50/5">No expense transactions recorded on this day.</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 font-black border-t-2 border-slate-300">
                              <td colSpan="2" className="px-4 py-3 text-right uppercase tracking-wider text-slate-700 border-r border-slate-200">Total Expenses:</td>
                              <td className="px-4 py-3 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                                ₹ {expenseTransactions.reduce((sum, tx) => sum + tx.bankOutflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                                ₹ {expenseTransactions.reduce((sum, tx) => sum + tx.cashOutflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[12px] font-black text-rose-700 border-r border-slate-200">
                                ₹ {totalOutflowSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="no-print"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* NET SUMMARY Section */}
                    <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs no-print">
                      <div className="font-black uppercase tracking-wider text-slate-300">Net Day Summary</div>
                      <div className="flex flex-wrap gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] uppercase text-slate-400 font-bold">Total Collection</span>
                          <span className="font-mono text-sm font-black text-emerald-400">
                            ₹ {totalInflowSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] uppercase text-slate-400 font-bold">Total Expenses</span>
                          <span className="font-mono text-sm font-black text-rose-400">
                            ₹ {totalOutflowSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end border-l border-slate-800 pl-6 sm:pl-8">
                          <span className="text-[9px] uppercase text-slate-200 font-black">Net Change</span>
                          <span className={`font-mono text-sm font-black ${(totalInflowSum - totalOutflowSum) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            ₹ {(totalInflowSum - totalOutflowSum).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 no-print">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden Printable Report for window.print() */}
              <div className="hidden print:block absolute inset-0 bg-white print-daybook-area text-black p-4">
                <div className="text-center py-4 border-b border-slate-200 text-slate-900">
                  <h2 className="text-lg font-black uppercase tracking-wider">{activeBranch?.name || "ORCHID RESORT"}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase">{activeBranch?.location || "Resort Premises"}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    For business date: <span className="font-bold text-slate-700">{formatDayBookDate(selectedAudit.business_date)}</span>
                  </p>
                </div>

                {/* Printable CASH BOOK BANNER */}
                <div className="bg-[#1b365d] text-white p-5 rounded-xl relative overflow-hidden border border-[#1b365d] my-4 shadow-sm">
                  <div className="absolute right-4 top-2 text-3xl font-black opacity-10 select-none pointer-events-none tracking-widest font-mono">
                    CASH BOOK
                  </div>
                  <div className="grid grid-cols-2 gap-8 relative z-10">
                    {/* INFLOWS SUMMARY */}
                    <div>
                      <h4 className="text-[10px] font-black tracking-widest text-slate-300 uppercase mb-3 border-b border-blue-900/50 pb-1">Inflows Summary</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-blue-900/30 pb-1">
                          <span className="text-slate-200 font-medium">A/C RECEIVED</span>
                          <span className="font-mono font-bold">
                            {formatReportSum(incomeTransactions.reduce((sum, tx) => sum + tx.bankInflow, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-blue-900/30 pb-1">
                          <span className="text-slate-200 font-medium">CASH RECEIVABLES</span>
                          <span className="font-mono font-bold">
                            {formatReportSum(incomeTransactions.reduce((sum, tx) => sum + tx.cashInflow, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 font-black text-sm">
                          <span className="text-white">TOTAL COLLECTION AMOUNT</span>
                          <span className="font-mono text-emerald-400">
                            {formatReportSum(totalInflowSum)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* OUTFLOWS SUMMARY */}
                    <div>
                      <h4 className="text-[10px] font-black tracking-widest text-slate-300 uppercase mb-3 border-b border-blue-900/50 pb-1">Outflows Summary</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-blue-900/30 pb-1">
                          <span className="text-slate-200 font-medium">A/C PAID</span>
                          <span className="font-mono font-bold">
                            {formatReportSum(expenseTransactions.reduce((sum, tx) => sum + tx.bankOutflow, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-blue-900/30 pb-1">
                          <span className="text-slate-200 font-medium">CASH PAID</span>
                          <span className="font-mono font-bold">
                            {formatReportSum(expenseTransactions.reduce((sum, tx) => sum + tx.cashOutflow, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 font-black text-sm">
                          <span className="text-white">TOTAL EXPENSE AMOUNT</span>
                          <span className="font-mono text-rose-400">
                            {formatReportSum(totalOutflowSum)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INCOMES Section */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
                  <div className="bg-slate-100 text-slate-800 font-bold text-center py-1.5 uppercase tracking-widest text-[10px] border-b border-slate-200">
                    INCOMES
                  </div>
                  <table className="w-full text-left text-xs text-slate-900">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="px-4 py-2 w-[15%] text-left uppercase font-bold border-r border-slate-200">Date</th>
                        <th className="px-4 py-2 w-[45%] text-left uppercase font-bold border-r border-slate-200">Discription</th>
                        <th className="px-4 py-2 w-[14%] text-right uppercase font-bold border-r border-slate-200">A/C Received</th>
                        <th className="px-4 py-2 w-[14%] text-right uppercase font-bold border-r border-slate-200">Cash Received</th>
                        <th className="px-4 py-2 w-[12%] text-right uppercase font-bold border-r border-slate-200">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incomeTransactions.map(tx => (
                        <tr key={tx.id}>
                          <td className="px-4 py-2 whitespace-nowrap font-mono text-[11px] border-r border-slate-200 text-slate-600">{tx.date}</td>
                          <td className="px-4 py-2 font-semibold text-slate-800 border-r border-slate-200 uppercase">{tx.particulars}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                            {tx.bankInflow > 0 ? `₹ ${tx.bankInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                            {tx.cashInflow > 0 ? `₹ ${tx.cashInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] border-r border-slate-200 font-bold text-slate-900">
                            ₹ {tx.totalInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {incomeTransactions.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-slate-400 italic">No income transactions recorded on this day.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black border-t border-slate-300">
                        <td colSpan="2" className="px-4 py-2 text-right uppercase tracking-wider text-xs border-r border-slate-200">Total Incomes:</td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                          ₹ {incomeTransactions.reduce((sum, tx) => sum + tx.bankInflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                          ₹ {incomeTransactions.reduce((sum, tx) => sum + tx.cashInflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-slate-900">
                          ₹ {totalInflowSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* EXPENSES Section */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
                  <div className="bg-slate-100 text-slate-800 font-bold text-center py-1.5 uppercase tracking-widest text-[10px] border-b border-slate-200">
                    EXPENSES
                  </div>
                  <table className="w-full text-left text-xs text-slate-900">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="px-4 py-2 w-[15%] text-left uppercase font-bold border-r border-slate-200">Date</th>
                        <th className="px-4 py-2 w-[45%] text-left uppercase font-bold border-r border-slate-200">Discription</th>
                        <th className="px-4 py-2 w-[14%] text-right uppercase font-bold border-r border-slate-200">A/C Paid</th>
                        <th className="px-4 py-2 w-[14%] text-right uppercase font-bold border-r border-slate-200">Cash Paid</th>
                        <th className="px-4 py-2 w-[12%] text-right uppercase font-bold border-r border-slate-200">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenseTransactions.map(tx => (
                        <tr key={tx.id}>
                          <td className="px-4 py-2 whitespace-nowrap font-mono text-[11px] border-r border-slate-200 text-slate-600">{tx.date}</td>
                          <td className="px-4 py-2 font-semibold text-slate-800 border-r border-slate-200 uppercase">{tx.particulars}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                            {tx.bankOutflow > 0 ? `₹ ${tx.bankOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] border-r border-slate-200 text-slate-600">
                            {tx.cashOutflow > 0 ? `₹ ${tx.cashOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ -"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] border-r border-slate-200 font-bold text-slate-900">
                            ₹ {tx.totalOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {expenseTransactions.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-slate-400 italic">No expense transactions recorded on this day.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black border-t border-slate-300">
                        <td colSpan="2" className="px-4 py-2 text-right uppercase tracking-wider text-xs border-r border-slate-200">Total Expenses:</td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                          ₹ {expenseTransactions.reduce((sum, tx) => sum + tx.bankOutflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-slate-900 border-r border-slate-200">
                          ₹ {expenseTransactions.reduce((sum, tx) => sum + tx.cashOutflow, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-slate-900">
                          ₹ {totalOutflowSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          );
        })()}


        {/* ── MODAL: Open Day ── */}
        {showOpenForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarCheck size={22} className="text-emerald-500" />
                  Open Business Day
                </h3>
                <button onClick={() => setShowOpenForm(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={22} />
                </button>
              </div>
              <form onSubmit={handleOpenDay} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Date *</label>
                  <input
                    type="date"
                    value={openForm.business_date}
                    onChange={e => setOpenForm({ ...openForm, business_date: e.target.value })}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Opening Cash (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openForm.opening_cash_balance}
                      onChange={e => setOpenForm({ ...openForm, opening_cash_balance: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Opening Account (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openForm.opening_account_balance}
                      onChange={e => setOpenForm({ ...openForm, opening_account_balance: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Opening Notes</label>
                  <textarea
                    value={openForm.opening_notes}
                    onChange={e => setOpenForm({ ...openForm, opening_notes: e.target.value })}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all"
                    rows={2}
                    placeholder="Any notes for this business day..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowOpenForm(false)}
                    className="flex-1 py-3 border-2 border-gray-100 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading}
                    className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CalendarCheck size={18} />}
                    Open Day
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: Close Day ── */}
        {showCloseConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarX size={22} className="text-rose-500" />
                  Close Business Day
                </h3>
                <button onClick={() => setShowCloseConfirm(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={22} />
                </button>
              </div>

              {/* Checklist summary in modal */}
              {checklist && (
                <div className="px-6 pt-4 space-y-2">
                  {checklist.checklist.map(item => (
                    <ChecklistItem key={item.key} item={item} />
                  ))}
                </div>
              )}

              <form onSubmit={handleCloseDay} className="p-6 space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 leading-relaxed">
                  <strong>Night Audit will run automatically:</strong> Room charges with GST will be posted to all in-house guests.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Closing Cash (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={closeForm.closing_cash_balance}
                      onChange={e => setCloseForm({ ...closeForm, closing_cash_balance: e.target.value })}
                      className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-4 transition-all outline-none font-bold ${
                        Math.abs(parseFloat(closeForm.closing_cash_balance || 0) - closeForm.system_expected_cash) > 0.01
                        ? "border-amber-200 bg-amber-50 focus:border-amber-400 focus:ring-amber-100"
                        : "border-gray-100 focus:border-indigo-400 focus:ring-indigo-100"
                      }`}
                    />
                    <p className="text-[10px] text-gray-400 font-medium">System expects: <span className="text-gray-600 font-bold">{formatCurrency(closeForm.system_expected_cash)}</span></p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Closing Account (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={closeForm.closing_account_balance}
                      onChange={e => setCloseForm({ ...closeForm, closing_account_balance: e.target.value })}
                      className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-4 transition-all outline-none font-bold ${
                        Math.abs(parseFloat(closeForm.closing_account_balance || 0) - closeForm.system_expected_account) > 0.01
                        ? "border-amber-200 bg-amber-50 focus:border-amber-400 focus:ring-amber-100"
                        : "border-gray-100 focus:border-indigo-400 focus:ring-indigo-100"
                      }`}
                    />
                    <p className="text-[10px] text-gray-400 font-medium">System expects: <span className="text-gray-600 font-bold">{formatCurrency(closeForm.system_expected_account)}</span></p>
                  </div>
                </div>

                {(Math.abs(parseFloat(closeForm.closing_cash_balance || 0) - closeForm.system_expected_cash) > 0.01 || 
                  Math.abs(parseFloat(closeForm.closing_account_balance || 0) - closeForm.system_expected_account) > 0.01) && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[11px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle size={12} />
                      Override Reason (Required)
                    </label>
                    <textarea
                      value={closeForm.override_reason}
                      onChange={e => setCloseForm({ ...closeForm, override_reason: e.target.value })}
                      className="w-full border-2 border-amber-200 bg-amber-50/50 rounded-xl px-4 py-3 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all text-sm"
                      rows={2}
                      placeholder="Explain the reason for the balance discrepancy..."
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Closing Notes</label>
                  <textarea
                    value={closeForm.closing_notes}
                    onChange={e => setCloseForm({ ...closeForm, closing_notes: e.target.value })}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm"
                    rows={2}
                    placeholder="End of day summary..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCloseConfirm(false)}
                    className="flex-1 py-3 border-2 border-gray-100 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading}
                    className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-rose-200">
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CalendarX size={18} />}
                    Close & Run Audit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: Create Payment Voucher ── */}
        {showCreateVoucher && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <PlusCircle size={22} className="text-emerald-500" />
                  Create Payment Voucher
                </h3>
                <button onClick={() => setShowCreateVoucher(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={22} />
                </button>
              </div>
              <form onSubmit={handleCreateVoucher} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Employee *</label>
                    <select
                      value={voucherForm.employee_id}
                      onChange={e => setVoucherForm({ ...voucherForm, employee_id: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm"
                      required
                    >
                      <option value="">Choose Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date *</label>
                    <input
                      type="date"
                      value={voucherForm.date}
                      onChange={e => setVoucherForm({ ...voucherForm, date: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category *</label>
                    <input
                      type="text"
                      placeholder="Enter Category"
                      value={voucherForm.category}
                      onChange={e => setVoucherForm({ ...voucherForm, category: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Department</label>
                    <select
                      value={voucherForm.department}
                      onChange={e => setVoucherForm({ ...voucherForm, department: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm"
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={voucherForm.amount}
                      onChange={e => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Payment Mode *</label>
                    <select
                      value={voucherForm.payment_mode}
                      onChange={e => setVoucherForm({ ...voucherForm, payment_mode: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm"
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description/Narration</label>
                  <textarea
                    value={voucherForm.description}
                    onChange={e => setVoucherForm({ ...voucherForm, description: e.target.value })}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-400 outline-none transition-all text-sm"
                    rows={2}
                    placeholder="Enter voucher narration details..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateVoucher(false)}
                    className="flex-1 py-3 border-2 border-gray-100 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading}
                    className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                    Create Voucher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: View/Print Voucher Slip ── */}
        {showVoucherSlip && selectedVoucherTx && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col no-print max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Printer size={20} className="text-indigo-600" />
                  Voucher Receipt Preview
                </h3>
                <button onClick={() => setShowVoucherSlip(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={22} />
                </button>
              </div>

              {/* Scrollable Preview Card */}
              <div className="p-6 overflow-y-auto bg-gray-100/50 flex-1 flex justify-center">
                <div className="bg-white border-2 border-gray-300 p-8 w-full max-w-xl text-black font-mono relative shadow-inner print-voucher-area">
                  
                  {/* Decorative receipt borders */}
                  <div className="border-b-4 border-double border-gray-800 pb-4 text-center">
                    <h2 className="text-xl font-black uppercase tracking-wider">{activeBranch?.name || "ORCHID RESORT"}</h2>
                    <p className="text-xs text-gray-600 mt-1">{activeBranch?.location || "Resort Premises"}</p>
                    <h3 className="text-sm font-bold border border-gray-800 px-3 py-1 w-fit mx-auto mt-3 tracking-widest bg-gray-50">
                      PAYMENT VOUCHER
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-dashed border-gray-400">
                    <div>
                      <p><span className="font-bold">Voucher No:</span> {selectedVoucherTx.entry_number}</p>
                      <p className="mt-1"><span className="font-bold">Reference:</span> {selectedVoucherTx.reference_type || "Expense"}</p>
                    </div>
                    <div className="text-right">
                      <p><span className="font-bold">Date:</span> {formatDate(selectedVoucherTx.entry_date)}</p>
                      <p className="mt-1"><span className="font-bold">Time:</span> {formatTime(selectedVoucherTx.entry_date)}</p>
                    </div>
                  </div>

                  <div className="py-4 space-y-3 text-xs border-b border-dashed border-gray-400">
                    <div className="flex justify-between">
                      <span className="font-bold">Paid To (Debit Account):</span>
                      <span className="text-right font-semibold">{selectedVoucherTx.lines?.[0]?.debit || "Expense Account"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Paid From (Credit Account):</span>
                      <span className="text-right font-semibold">{selectedVoucherTx.lines?.[0]?.credit || "Cash Account"}</span>
                    </div>
                    <div className="pt-2 flex justify-between items-center text-sm">
                      <span className="font-bold uppercase tracking-wider">Amount Paid:</span>
                      <span className="font-black text-lg border-b-2 border-gray-800 pb-0.5">{formatCurrency(selectedVoucherTx.total_amount)}</span>
                    </div>
                  </div>

                  <div className="py-4 text-xs border-b border-dashed border-gray-400 space-y-2">
                    <p><span className="font-bold">Amount in Words:</span></p>
                    <p className="italic text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                      {numberToWords(Math.floor(selectedVoucherTx.total_amount))}
                    </p>
                  </div>

                  <div className="py-4 text-xs border-b border-gray-800 space-y-2">
                    <p><span className="font-bold">Narration / Remarks:</span></p>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedVoucherTx.description || "No description provided."}
                    </p>
                  </div>

                  {/* Signature Section */}
                  <div className="grid grid-cols-3 gap-4 pt-12 text-[10px] text-center font-bold">
                    <div className="space-y-1">
                      <div className="border-t border-gray-400 mx-2 pt-1.5">Prepared By</div>
                    </div>
                    <div className="space-y-1">
                      <div className="border-t border-gray-400 mx-2 pt-1.5">Approved By</div>
                    </div>
                    <div className="space-y-1">
                      <div className="border-t border-gray-400 mx-2 pt-1.5">Receiver's Sign</div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 no-print">
                <button onClick={() => setShowVoucherSlip(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all">
                  Close Preview
                </button>
                <button onClick={() => window.print()}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                  <Printer size={18} />
                  Print Voucher
                </button>
              </div>
            </div>
            
            {/* Hidden Printable Voucher for window.print() */}
            <div className="hidden print:block absolute inset-0 bg-white p-8 font-mono text-black print-voucher-area">
              <div className="border-b-4 border-double border-gray-800 pb-4 text-center">
                <h2 className="text-xl font-black uppercase tracking-wider">{activeBranch?.name || "ORCHID RESORT"}</h2>
                <p className="text-xs text-gray-600 mt-1">{activeBranch?.location || "Resort Premises"}</p>
                <h3 className="text-sm font-bold border border-gray-800 px-3 py-1 w-fit mx-auto mt-3 tracking-widest bg-gray-50">
                  PAYMENT VOUCHER
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-dashed border-gray-400">
                <div>
                  <p><span className="font-bold">Voucher No:</span> {selectedVoucherTx.entry_number}</p>
                  <p className="mt-1"><span className="font-bold">Reference:</span> {selectedVoucherTx.reference_type || "Expense"}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Date:</span> {formatDate(selectedVoucherTx.entry_date)}</p>
                  <p className="mt-1"><span className="font-bold">Time:</span> {formatTime(selectedVoucherTx.entry_date)}</p>
                </div>
              </div>

              <div className="py-4 space-y-3 text-xs border-b border-dashed border-gray-400">
                <div className="flex justify-between">
                  <span className="font-bold">Paid To (Debit Account):</span>
                  <span className="text-right font-semibold">{selectedVoucherTx.lines?.[0]?.debit || "Expense Account"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Paid From (Credit Account):</span>
                  <span className="text-right font-semibold">{selectedVoucherTx.lines?.[0]?.credit || "Cash Account"}</span>
                </div>
                <div className="pt-2 flex justify-between items-center text-sm">
                  <span className="font-bold uppercase tracking-wider">Amount Paid:</span>
                  <span className="font-black text-lg border-b-2 border-gray-800 pb-0.5">{formatCurrency(selectedVoucherTx.total_amount)}</span>
                </div>
              </div>

              <div className="py-4 text-xs border-b border-dashed border-gray-400 space-y-2">
                <p><span className="font-bold">Amount in Words:</span></p>
                <p className="italic text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                  {numberToWords(Math.floor(selectedVoucherTx.total_amount))}
                </p>
              </div>

              <div className="py-4 text-xs border-b border-gray-800 space-y-2">
                <p><span className="font-bold">Narration / Remarks:</span></p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedVoucherTx.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-16 text-[10px] text-center font-bold">
                <div className="space-y-1">
                  <div className="border-t border-gray-400 mx-2 pt-1.5">Prepared By</div>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-gray-400 mx-2 pt-1.5">Approved By</div>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-gray-400 mx-2 pt-1.5">Receiver's Sign</div>
                </div>
              </div>
            </div>

          </div>
        )}



      </div>
    </DashboardLayout>
  );
}
