/**
 * Reusable Restaurant Dining Bill & POS Invoice Printer
 * Compatible with Bluetooth & USB thermal receipt printers (58mm / 80mm) and standard A4 / PDF.
 */

export const connectBluetoothPrinter = async () => {
  if (typeof navigator !== 'undefined' && navigator.bluetooth) {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer service
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
        ]
      });
      if (device) {
        return { success: true, name: device.name || 'Bluetooth POS Printer', device };
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        console.warn('Bluetooth pairing cancelled or error:', err);
      }
    }
  }

  // Fallback instructions for Windows/Mac system bluetooth printers
  return {
    success: false,
    message:
      'To use your Bluetooth Thermal Printer:\n' +
      '1. Pair it in Windows Settings -> Bluetooth & Devices.\n' +
      '2. In the Print Dialog, select your Bluetooth POS Printer as the Destination.\n' +
      '3. Set Paper Size to 80mm or 58mm (Roll).'
  };
};

export const shareBillViaWhatsApp = ({ table, branch, paymentMethod = 'Cash', isPaid = false, phone = '' }) => {
  if (!table) return;

  const branchTitle = branch?.name || 'HOSTO EMENU RESTAURANT';
  const branchAddr = branch?.address || '';
  const branchPhone = branch?.phone || '';
  const branchGst = branch?.gst_number || '';
  const tableNum = table.table_number || table.id;
  const guest = table.guest_name || 'Valued Dining Guest';
  const items = table.items || [];
  const billAmount = Number(table.current_bill_amount) || 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  let itemsSummary = '';
  if (items.length > 0) {
    itemsSummary = items.map((it, idx) => `  ${idx + 1}. *${it.name}* × ${it.quantity || 1}`).join('\n');
  } else {
    itemsSummary = `  • Dining Service (Table ${tableNum})`;
  }

  const message =
`🍽️ *${branchTitle.toUpperCase()}*
🧾 *DIGITAL DINING BILL RECEIPT*
━━━━━━━━━━━━━━━━━━━━
📍 *Table:* Table ${tableNum}
👤 *Guest:* ${guest}
📅 *Date:* ${dateStr} | ${timeStr}
💳 *Payment:* ${paymentMethod.toUpperCase()} (${isPaid ? 'PAID ✔️' : 'PENDING ⏳'})
${branchGst ? `🏛️ *GSTIN:* ${branchGst}\n` : ''}${branchPhone ? `📞 *Tel:* ${branchPhone}\n` : ''}${branchAddr ? `🏢 *Address:* ${branchAddr}\n` : ''}━━━━━━━━━━━━━━━━━━━━
*ORDERED DISHES:*
${itemsSummary}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL PAYABLE: ₹${billAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*
━━━━━━━━━━━━━━━━━━━━
${isPaid ? '✅ *Status:* Bill Settled & Paid' : '⏳ *Status:* Pre-Bill / Payment Due'}

🙏 *Thank you for dining with us!*
We hope you enjoyed your meal. Visit us again soon!
_Hosto eMenu Smart POS & Dining_`;

  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
};

export const printTableBill = ({ table, branch, paymentMethod = 'Cash', isPaid = false, paperWidth = '80mm' }) => {
  if (!table) return;

  const branchTitle = branch?.name || 'HOSTO EMENU RESTAURANT';
  const branchGst = branch?.gst_number || '';
  const branchAddr = branch?.address || '';
  const branchPhone = branch?.phone || '';
  const tableNum = table.table_number || table.id;
  const guest = table.guest_name || 'Walk-in Dining Guest';
  const items = table.items || [];
  const billAmount = Number(table.current_bill_amount) || 0;

  // Approximate 5% GST calculation if not pre-calculated
  const hasGst = Boolean(branchGst);
  const gstRate = 0.05;
  const subtotal = hasGst ? Number((billAmount / (1 + gstRate)).toFixed(2)) : billAmount;
  const gstAmount = hasGst ? Number((billAmount - subtotal).toFixed(2)) : 0;
  const cgst = (gstAmount / 2).toFixed(2);
  const sgst = (gstAmount / 2).toFixed(2);

  const printWindow = window.open('', '_blank', 'width=450,height=700');
  if (!printWindow) {
    alert('Please allow popups to print restaurant bills.');
    return;
  }

  const itemsHtml = items.length > 0 ? items.map((it) => {
    const qty = it.quantity || 1;
    return `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-weight: 600; color: #0f172a;">${it.name}</td>
        <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; text-align: center; font-weight: 700;">${qty}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="2" style="padding: 8px 0; color: #64748b; font-style: italic;">Dining Order (Table ${tableNum})</td>
    </tr>
  `;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dining Bill - Table ${tableNum} - ${branchTitle}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            padding: 16px;
            color: #0f172a;
            max-width: 380px;
            margin: auto;
            font-size: 13px;
            line-height: 1.4;
            background: #f8fafc;
          }
          .receipt {
            border: 1px dashed #94a3b8;
            padding: 18px;
            border-radius: 12px;
            background: #ffffff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .brand {
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-type {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #475569;
            margin-top: 2px;
          }
          .sub-info {
            font-size: 11px;
            color: #64748b;
            margin-top: 3px;
          }
          .meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #cbd5e1;
          }
          .meta-col {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .table-badge {
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          th {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #0f172a;
            padding-bottom: 4px;
            color: #475569;
          }
          .totals {
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
          }
          .row {
            display: flex;
            justify-content: space-between;
          }
          .grand-total {
            font-size: 18px;
            font-weight: 900;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            padding: 8px 0;
            margin-top: 6px;
          }
          .status-tag {
            text-align: center;
            margin-top: 14px;
            padding: 6px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 11px;
            letter-spacing: 1px;
            text-transform: uppercase;
            background: ${isPaid ? '#dcfce7' : '#fef3c7'};
            color: ${isPaid ? '#15803d' : '#b45309'};
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #64748b;
            margin-top: 14px;
            line-height: 1.5;
          }
          @media print {
            body { 
              padding: 0mm; 
              margin: 0mm; 
              width: ${paperWidth}; 
              background: #ffffff;
            }
            .receipt { 
              border: none !important; 
              padding: 2mm 3mm !important; 
              border-radius: 0 !important;
              max-width: 100% !important;
            }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="no-print" style="margin-bottom: 14px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 12px;">
              🖨️ Print Receipt
            </button>
            <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 12px;" title="Choose Destination -> Save as PDF in print dialog">
              📄 Save as PDF
            </button>
          </div>

          <div class="header">
            <div class="brand">${branchTitle}</div>
            <div class="doc-type">${hasGst ? 'TAX INVOICE' : 'DINING BILL RECEIPT'}</div>
            ${branchAddr ? `<div class="sub-info">${branchAddr}</div>` : ''}
            ${branchPhone ? `<div class="sub-info">Tel: ${branchPhone}</div>` : ''}
            ${branchGst ? `<div class="sub-info">GSTIN: ${branchGst}</div>` : ''}
          </div>

          <div class="meta">
            <div class="meta-col">
              <span class="table-badge">TABLE ${tableNum}</span>
              <span>Guest: <strong>${guest}</strong></span>
            </div>
            <div class="meta-col" style="text-align: right;">
              <span>Date: ${dateStr}</span>
              <span>Time: ${timeStr}</span>
              <span>Pay Mode: <strong>${paymentMethod.toUpperCase()}</strong></span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Dish Item</th>
                <th style="text-align: center;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            ${hasGst ? `
              <div class="row">
                <span style="color: #64748b;">Subtotal (excl. GST):</span>
                <span>₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="row">
                <span style="color: #64748b;">CGST (2.5%):</span>
                <span>₹${cgst}</span>
              </div>
              <div class="row">
                <span style="color: #64748b;">SGST (2.5%):</span>
                <span>₹${sgst}</span>
              </div>
            ` : ''}
            <div class="row grand-total">
              <span>TOTAL AMOUNT:</span>
              <span>₹${billAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="status-tag">
            ${isPaid ? '✔ PAID & SETTLED' : '⏳ PENDING PAYMENT / BILLED'}
          </div>

          <div class="footer">
            <p>Thank you for dining with us!</p>
            <p>Powered by Hosto eMenu Smart Dining POS</p>
          </div>
        </div>

        <script>
          // Auto prompt print dialog for quick thermal receipt printing
          setTimeout(() => {
            window.print();
          }, 350);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
