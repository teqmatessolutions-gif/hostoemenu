/**
 * Reusable Restaurant Dining Bill & POS Invoice Printer
 * Compatible with thermal receipt printers (80mm) and standard A4 / Letter.
 */
export const printTableBill = ({ table, branch, paymentMethod = 'Cash', isPaid = false }) => {
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

  const printWindow = window.open('', '_blank', 'width=450,height=650');
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
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            padding: 24px;
            color: #0f172a;
            max-width: 380px;
            margin: auto;
            font-size: 13px;
            line-height: 1.4;
          }
          .receipt {
            border: 1px dashed #94a3b8;
            padding: 20px;
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
            body { padding: 0; }
            .receipt { border: none; padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
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

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 24px; background: #0f172a; color: white; border: none; font-weight: 800; border-radius: 10px; cursor: pointer; font-size: 13px;">
              🖨️ Print Receipt (80mm)
            </button>
          </div>
        </div>
        <script>
          // Automatically prompt print dialog
          setTimeout(() => {
            window.print();
          }, 350);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
