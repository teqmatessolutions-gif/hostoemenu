import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import defaultLogo from '../assets/logo.jpeg';
import { getApiBaseUrl } from './env';
import { formatDateTimeIST } from './dateUtils';

/**
 * Converts any number to words in Indian Numbering System (INR)
 * E.g., 1460 -> "Rupees One Thousand Four Hundred Sixty Only"
 */
export function numberToWordsINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "";
  const num = Math.round(Number(amount));
  if (num === 0) return "Rupees Zero Only";
  if (num < 0) return "Minus " + numberToWordsINR(-num);

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function convertGroup(val) {
    let str = "";
    if (val >= 100) {
      str += ones[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += ones[val] + " ";
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  let belowThousand = remainder % 1000;

  let words = "";
  if (crore > 0) words += convertGroup(crore) + " Crore ";
  if (lakh > 0) words += convertGroup(lakh) + " Lakh ";
  if (thousand > 0) words += convertGroup(thousand) + " Thousand ";
  if (belowThousand > 0) words += convertGroup(belowThousand) + " ";

  return `Rupees ${words.trim()} Only`;
}

/**
 * Format currency with Indian Comma separators and Rs. prefix
 */
export function formatPDFCurrency(amt) {
  const num = Number(amt) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `Rs.${formatted}`;
}

/**
 * Resolves full URL for branch or default logo
 */
export function resolveLogoUrl(branch, settings) {
  let rawUrl = branch?.image_url;
  if (!rawUrl || rawUrl === 'null' || rawUrl === 'undefined' || rawUrl === '') {
    rawUrl = settings?.branch_logo;
  }
  if (!rawUrl || rawUrl === 'null' || rawUrl === 'undefined' || rawUrl === '') {
    return null; // Signals fallback to default Hosto logo
  }
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }
  const base = getApiBaseUrl().replace(/\/api\/?$/, '');
  return `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

/**
 * Safely loads logo as Base64 PNG to prevent format errors and cross-origin PDF failures
 */
export function loadLogoForPdf(branch, settings) {
  return new Promise((resolve) => {
    const branchUrl = resolveLogoUrl(branch, settings);

    const tryLoad = (srcUrl, isHostoFallback = false) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width || 120;
          const height = img.naturalHeight || img.height || 120;
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve({
            dataUrl,
            format: 'PNG',
            width,
            height,
            aspectRatio: width / height
          });
        } catch (e) {
          // If canvas is tainted or conversion fails, fallback or return image object
          if (!isHostoFallback) {
            tryLoad(defaultLogo, true);
          } else {
            resolve({
              dataUrl: defaultLogo,
              format: 'JPEG',
              width: 120,
              height: 120,
              aspectRatio: 1
            });
          }
        }
      };

      img.onerror = () => {
        if (!isHostoFallback) {
          tryLoad(defaultLogo, true);
        } else {
          resolve(null);
        }
      };

      img.src = srcUrl;
    };

    if (branchUrl) {
      tryLoad(branchUrl, false);
    } else {
      tryLoad(defaultLogo, true);
    }
  });
}

/**
 * Calculates Room GST rate based on settings and tariff
 */
export function determineRoomGstRate(dailyRate, gstSettings) {
  if (!gstSettings || gstSettings.gst_enabled === false) return 0;
  if (gstSettings.gst_room_type === 'MANUAL') {
    return parseFloat(gstSettings.room_gst_rate || 12);
  }
  const r1 = parseFloat(gstSettings.gst_slab_rate_1 || 5);
  const r2 = parseFloat(gstSettings.gst_slab_rate_2 || 12);
  const r3 = parseFloat(gstSettings.gst_slab_rate_3 || 18);

  if (dailyRate < 5000) return r1;
  if (dailyRate <= 7500) return r2;
  return r3;
}

/**
 * Triggers PDF printing via a hidden iframe to prevent browser popup blockers,
 * or downloads directly if action === 'download'
 */
export function triggerPdfAction(doc, fileName, action = 'print') {
  if (action === 'download') {
    doc.save(fileName);
    return;
  }

  // Print mode
  try {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const iframeId = '__hosto_invoice_print_frame__';
    let iframe = document.getElementById(iframeId);
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }
    iframe.src = blobUrl;
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.warn("Hidden iframe print failed, falling back to window.open", e);
          window.open(blobUrl, '_blank');
        }
      }, 300);
    };
  } catch (err) {
    console.error("Print action failed, opening blob in new window:", err);
    try {
      window.open(doc.output('bloburl'), '_blank');
    } catch (popupErr) {
      doc.save(fileName);
    }
  }
}

/**
 * Generates an executive 5-Star Luxury Tax Invoice PDF
 */
export async function generateLuxuryInvoicePDF({
  data,             // billData or checkout details object
  settings = {},    // resortSettings
  branch = null,    // activeBranch from BranchContext
  gstSettings = {}, // GST slab & mode settings
  action = 'print', // 'print' | 'download'
  filters = { printRoom: true, printFood: true, printServices: true },
  gstType = 'CGST_SGST'
}) {
  if (!data) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Top Emerald Luxury Accent Bar
  doc.setFillColor(15, 118, 110); // Teal-700
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Load Brand Logo (Branch logo or Hosto fallback)
  let logoInfo = null;
  try {
    logoInfo = await loadLogoForPdf(branch, settings);
  } catch (err) {
    console.warn("Logo loading failed:", err);
  }

  let headerLeftX = margin;
  let headerStartY = 9;

  if (logoInfo && logoInfo.dataUrl) {
    const maxLogoW = 34;
    const maxLogoH = 20;
    let logoW = maxLogoW;
    let logoH = maxLogoH;
    if (logoInfo.aspectRatio) {
      if (logoInfo.aspectRatio > (maxLogoW / maxLogoH)) {
        logoW = maxLogoW;
        logoH = maxLogoW / logoInfo.aspectRatio;
      } else {
        logoH = maxLogoH;
        logoW = maxLogoH * logoInfo.aspectRatio;
      }
    }
    const logoY = headerStartY + ((maxLogoH - logoH) / 2);
    try {
      doc.addImage(logoInfo.dataUrl, logoInfo.format || 'PNG', margin, logoY, logoW, logoH);
      headerLeftX = margin + maxLogoW + 4;
    } catch (imgErr) {
      console.warn("doc.addImage failed:", imgErr);
    }
  }

  // 3. Property Branding & Details
  const resortName = branch?.name || settings?.branch_name || settings?.resort_name || 'HOSTO RESORT & SUITES';
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(resortName.toUpperCase(), headerLeftX, headerStartY + 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate-600

  const address = branch?.address || settings?.branch_address || settings?.resort_address || '';
  if (address) {
    const addressLines = doc.splitTextToSize(address, 78);
    doc.text(addressLines, headerLeftX, headerStartY + 10);
  }

  const phone = branch?.phone_number || settings?.branch_phone || settings?.resort_phone || '';
  const email = branch?.email || settings?.branch_email || settings?.resort_email || '';
  const gstin = branch?.gst_number || settings?.gst_number || '';

  let contactParts = [];
  if (phone) contactParts.push(`Phone: ${phone}`);
  if (email) contactParts.push(`Email: ${email}`);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(' | '), headerLeftX, headerStartY + 16);
  }

  if (gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110);
    doc.text(`GSTIN: ${gstin}`, headerLeftX, headerStartY + 20.5);
  }

  // 4. Top-Right Invoice Badge & Meta
  const badgeW = 54;
  const badgeH = 7.5;
  const badgeX = pageWidth - margin - badgeW;

  doc.setFillColor(15, 118, 110);
  doc.roundedRect(badgeX, headerStartY, badgeW, badgeH, 1.5, 1.5, 'F');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', badgeX + (badgeW / 2), headerStartY + 5.2, { align: 'center' });

  // Invoice Number & Date
  const invoiceNumber = data.invoice_number || `INV-${(data.id || data.booking_id || '0001').toString().padStart(4, '0')}`;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - margin, headerStartY + 14, { align: 'right' });

  let invoiceDate = new Date();
  if (data.created_at) {
    const parsed = new Date(data.created_at);
    if (!isNaN(parsed.getTime())) invoiceDate = parsed;
  }
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date & Time: ${formatDateTimeIST(invoiceDate)}`, pageWidth - margin, headerStartY + 18.5, { align: 'right' });

  // Recipient Copy Pill Badge
  doc.setFillColor(240, 253, 244); // Green-50
  doc.setDrawColor(187, 247, 208); // Green-200
  doc.roundedRect(pageWidth - margin - 42, headerStartY + 21, 42, 5, 1, 1, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Green-800
  doc.text('ORIGINAL FOR RECIPIENT', pageWidth - margin - 21, headerStartY + 24.5, { align: 'center' });

  // Separator Line
  const dividerY = headerStartY + 28.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // 5. Dual Info Cards (Guest Details & Reservation Details)
  const cardY = dividerY + 3.5;
  const cardW = (contentWidth - 6) / 2;
  const cardH = 34;

  // Guest Details Card (Left)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cardY, cardW, 6.5, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('BILLED TO (GUEST DETAILS)', margin + 3.5, cardY + 4.5);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  let gY = cardY + 11;

  const guestName = data.guest_name || 'Walk-in Guest';
  doc.setFont('helvetica', 'bold');
  doc.text(`Name: ${guestName}`, margin + 3.5, gY);

  doc.setFont('helvetica', 'normal');
  const guestPhone = data.guest_mobile || data.booking_details?.guest_mobile || '';
  const guestEmail = data.guest_email || data.booking_details?.guest_email || '';
  const guestPan = data.pan_number || '';
  const guestGst = data.gst_number || data.guest_gstin || '';

  if (guestPhone) {
    gY += 4.5;
    doc.text(`Mobile: ${guestPhone}`, margin + 3.5, gY);
  }
  if (guestEmail) {
    gY += 4.5;
    doc.text(`Email: ${guestEmail}`, margin + 3.5, gY);
  }
  if (guestPan) {
    gY += 4.5;
    doc.text(`PAN: ${guestPan}`, margin + 3.5, gY);
  }
  if (guestGst) {
    gY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${guestGst}`, margin + 3.5, gY);
    doc.setFont('helvetica', 'normal');
  }

  // Reservation Details Card (Right)
  const rightCardX = margin + cardW + 6;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightCardX, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(rightCardX, cardY, cardW, 6.5, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('STAY & RESERVATION DETAILS', rightCardX + 3.5, cardY + 4.5);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  let rY = cardY + 11;

  const roomNumbers = Array.isArray(data.room_numbers)
    ? data.room_numbers.join(', ')
    : (data.room_numbers || data.room_number || 'N/A');
  doc.setFont('helvetica', 'bold');
  doc.text(`Room No(s): ${roomNumbers}`, rightCardX + 3.5, rY);

  doc.setFont('helvetica', 'normal');
  const checkInDate = data.check_in || data.booking_details?.check_in;
  const checkOutDate = data.check_out || data.booking_details?.check_out;
  if (checkInDate) {
    rY += 4.5;
    doc.text(`Check-In: ${new Date(checkInDate).toLocaleDateString('en-GB')}`, rightCardX + 3.5, rY);
  }
  if (checkOutDate) {
    rY += 4.5;
    doc.text(`Check-Out: ${new Date(checkOutDate).toLocaleDateString('en-GB')}`, rightCardX + 3.5, rY);
  }

  const adults = data.booking_details?.adults || data.adults || 0;
  const children = data.booking_details?.children || data.children || 0;
  const stayNights = data.stay_nights || 1;
  rY += 4.5;
  doc.text(`Duration: ${stayNights} Night(s) | Pax: ${adults} Adults, ${children} Children`, rightCardX + 3.5, rY);

  if (data.booking_id || data.package_booking_id) {
    rY += 4.5;
    doc.text(`Folio/Booking Ref: #${data.booking_id || data.package_booking_id}`, rightCardX + 3.5, rY);
  }

  // 6. Charges Breakdown Table
  const tableStartY = cardY + cardH + 5;
  const chargesBody = [];
  let rowIdx = 1;

  const shouldPrintRoom = filters.printRoom !== false;
  const shouldPrintFood = filters.printFood !== false;
  const shouldPrintServices = filters.printServices !== false;

  const charges = data.charges || data;
  const billDetails = data.bill_details || {};

  // Room Stay Charges
  const roomTotal = data.room_total || charges.room_charges || 0;
  if (shouldPrintRoom && roomTotal > 0) {
    chargesBody.push([
      rowIdx++,
      `Room Accommodation Charges (Room ${roomNumbers})`,
      '996311',
      `${stayNights} Night(s)`,
      formatPDFCurrency(roomTotal / Math.max(1, stayNights)),
      formatPDFCurrency(roomTotal)
    ]);
  }

  // Package Charges
  const packageTotal = data.package_total || charges.package_charges || 0;
  if (shouldPrintRoom && packageTotal > 0) {
    chargesBody.push([
      rowIdx++,
      'Package Stay & Inclusions',
      '996311',
      `${stayNights} Night(s)`,
      formatPDFCurrency(packageTotal / Math.max(1, stayNights)),
      formatPDFCurrency(packageTotal)
    ]);
  }

  // Food Items
  if (shouldPrintFood) {
    const foodOrders = data.food_orders || [];
    if (foodOrders.length > 0) {
      foodOrders.forEach(order => {
        order.items?.forEach(item => {
          chargesBody.push([
            rowIdx++,
            `Dining: ${item.item_name}`,
            '996331',
            `x${item.quantity}`,
            formatPDFCurrency(item.price || (item.total / (item.quantity || 1))),
            formatPDFCurrency(item.total)
          ]);
        });
      });
    } else if (charges.food_items && charges.food_items.length > 0) {
      charges.food_items.forEach(item => {
        if (!item.is_paid || item.payment_status === "Complimentary") {
          chargesBody.push([
            rowIdx++,
            `Dining: ${item.item_name}`,
            '996331',
            `x${item.quantity}`,
            formatPDFCurrency(item.price || (item.amount / (item.quantity || 1))),
            formatPDFCurrency(item.amount)
          ]);
        }
      });
    } else if ((data.food_total || charges.food_charges) > 0) {
      chargesBody.push([
        rowIdx++,
        'Food & Beverage Charges',
        '996331',
        '-',
        formatPDFCurrency(data.food_total || charges.food_charges),
        formatPDFCurrency(data.food_total || charges.food_charges)
      ]);
    }
  }

  // Services
  if (shouldPrintServices) {
    const services = data.services || charges.service_items || [];
    if (services.length > 0) {
      services.forEach(srv => {
        if (!srv.is_paid) {
          chargesBody.push([
            rowIdx++,
            `Service: ${srv.service_name}`,
            '999799',
            '-',
            formatPDFCurrency(srv.charges),
            formatPDFCurrency(srv.charges)
          ]);
        }
      });
    } else if ((data.service_total || charges.service_charges) > 0) {
      chargesBody.push([
        rowIdx++,
        'Resort Amenities & Services',
        '999799',
        '-',
        formatPDFCurrency(data.service_total || charges.service_charges),
        formatPDFCurrency(data.service_total || charges.service_charges)
      ]);
    }

    // Consumables
    const consumables = billDetails.consumables_items || charges.consumables_items || [];
    if (consumables.length > 0) {
      consumables.forEach(c => {
        chargesBody.push([
          rowIdx++,
          `Consumable: ${c.item_name}`,
          '996331',
          `x${c.quantity || c.actual_consumed || 1}`,
          formatPDFCurrency(c.unit_price || (c.total_charge / (c.quantity || 1))),
          formatPDFCurrency(c.total_charge)
        ]);
      });
    }

    // Inventory / Rentals
    const rentals = billDetails.inventory_usage || charges.inventory_usage || [];
    if (rentals.length > 0) {
      rentals.forEach(r => {
        chargesBody.push([
          rowIdx++,
          `Rental: ${r.item_name}`,
          '997312',
          `x${r.quantity} ${r.unit || ''}`,
          formatPDFCurrency(r.rental_charge || 0),
          formatPDFCurrency(r.rental_charge || 0)
        ]);
      });
    }

    // Damages
    const damages = billDetails.asset_damages || charges.asset_damages || [];
    if (damages.length > 0) {
      damages.forEach(d => {
        chargesBody.push([
          rowIdx++,
          `Damage: ${d.item_name}${d.notes ? ` (${d.notes})` : ''}`,
          '998719',
          '-',
          formatPDFCurrency(d.total_charge || d.replacement_cost),
          formatPDFCurrency(d.total_charge || d.replacement_cost)
        ]);
      });
    }

    // Late Checkout Fee
    const lateFee = charges.late_checkout_fee || billDetails.late_checkout_fee || data.late_checkout_fee || 0;
    if (lateFee > 0) {
      chargesBody.push([
        rowIdx++,
        'Late Check-out Charge',
        '996311',
        '-',
        formatPDFCurrency(lateFee),
        formatPDFCurrency(lateFee)
      ]);
    }
  }

  // Fallback if empty
  if (chargesBody.length === 0) {
    chargesBody.push([1, 'Resort Accommodation & Charges', '996311', '1', formatPDFCurrency(data.grand_total || 0), formatPDFCurrency(data.grand_total || 0)]);
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [['Sl.', 'Particulars / Description', 'SAC/HSN', 'Qty/Nights', 'Rate', 'Amount']],
    body: chargesBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Emerald Teal
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 28 }
    },
    styles: {
      cellPadding: 2.8,
      fontSize: 8.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59]
    }
  });

  // 7. Financial Calculations & Summary
  const tableFinalY = doc.lastAutoTable.finalY;

  // Determine totals
  let grossSubtotal = 0;
  let totalDiscount = Number(data.discount_amount || data.discount || 0);
  let totalTax = Number(data.tax_amount || charges.total_gst || 0);
  let advancePaid = Number(data.advance_deposit || charges.advance_deposit || 0);
  let grandTotal = Number(data.grand_total || 0);

  // If calculating dynamically
  if (data.dynamicTotals) {
    grossSubtotal = data.dynamicTotals.subtotal;
    totalTax = data.dynamicTotals.totalGST;
    grandTotal = data.dynamicTotals.totalBill;
    advancePaid = data.dynamicTotals.advanceDeposit;
  } else {
    // Sum from charges body or data
    grossSubtotal = (
      (data.room_total || charges.room_charges || 0) +
      (data.package_total || charges.package_charges || 0) +
      (data.food_total || charges.food_charges || 0) +
      (data.service_total || charges.service_charges || 0) +
      (charges.consumables_charges || 0) +
      (charges.inventory_charges || 0) +
      (charges.asset_damage_charges || 0) +
      (charges.late_checkout_fee || 0)
    );
    if (!grossSubtotal || grossSubtotal === 0) {
      grossSubtotal = grandTotal + totalDiscount - totalTax;
    }
  }

  const taxableAmount = Math.max(0, grossSubtotal - totalDiscount);

  // Calculate daily room rate to determine GST slab percentage
  const numRooms = Array.isArray(data.room_numbers) ? data.room_numbers.length : 1;
  const dailyRatePerRoom = ((data.room_total || charges.room_charges || 0) + (data.package_total || charges.package_charges || 0)) / Math.max(1, stayNights * numRooms);
  const roomGstRate = determineRoomGstRate(dailyRatePerRoom, gstSettings);

  const summaryRows = [
    ['Gross Total', formatPDFCurrency(grossSubtotal)]
  ];

  if (totalDiscount > 0) {
    summaryRows.push(['Special Discount', `(-) ${formatPDFCurrency(totalDiscount)}`]);
  }

  summaryRows.push(['Taxable Amount', formatPDFCurrency(taxableAmount)]);

  if (totalTax > 0) {
    const isIgst = gstType === 'IGST';
    if (isIgst) {
      summaryRows.push([`IGST`, `(+) ${formatPDFCurrency(totalTax)}`]);
    } else {
      const halfTax = totalTax / 2;
      const halfRate = (roomGstRate / 2).toFixed(1).replace('.0', '');
      summaryRows.push([`CGST (${halfRate}%)`, `(+) ${formatPDFCurrency(halfTax)}`]);
      summaryRows.push([`SGST (${halfRate}%)`, `(+) ${formatPDFCurrency(halfTax)}`]);
    }
  }

  const roundOff = (grandTotal - (taxableAmount + totalTax));
  if (Math.abs(roundOff) > 0.01 && Math.abs(roundOff) < 1) {
    summaryRows.push(['Round Off', `${roundOff > 0 ? '(+)' : '(-)'} ${formatPDFCurrency(Math.abs(roundOff))}`]);
  }

  summaryRows.push(['Invoice Grand Total', formatPDFCurrency(grandTotal)]);

  if (advancePaid > 0) {
    summaryRows.push(['Advance Paid / Deposit', `(-) ${formatPDFCurrency(advancePaid)}`]);
    const balanceDue = Math.max(0, grandTotal - advancePaid);
    const refundDue = Math.max(0, advancePaid - grandTotal);
    if (refundDue > 0) {
      summaryRows.push(['Refund Amount Due', formatPDFCurrency(refundDue)]);
    } else {
      summaryRows.push(['Net Balance Due', formatPDFCurrency(balanceDue)]);
    }
  }

  const summaryTableY = tableFinalY + 5;
  const summaryWidth = 84;
  const summaryLeftMargin = pageWidth - margin - summaryWidth;

  autoTable(doc, {
    startY: summaryTableY,
    body: summaryRows,
    theme: 'plain',
    tableWidth: summaryWidth,
    margin: { left: summaryLeftMargin },
    styles: { cellPadding: 2.2, fontSize: 8.5 },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'right', cellWidth: 46 },
      1: { fontStyle: 'bold', halign: 'right', cellWidth: 38 }
    },
    didParseCell: (cellData) => {
      const rowItem = summaryRows[cellData.row.index];
      if (rowItem && rowItem[0] === 'Invoice Grand Total') {
        cellData.cell.styles.fillColor = [15, 118, 110]; // Luxury Emerald
        cellData.cell.styles.textColor = [255, 255, 255];
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fontSize = 9.5;
      } else if (rowItem && (rowItem[0] === 'Net Balance Due' || rowItem[0] === 'Refund Amount Due')) {
        cellData.cell.styles.fillColor = [241, 245, 249];
        cellData.cell.styles.textColor = [15, 23, 42];
        cellData.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // 8. Amount in Words Box (Left of Summary or below)
  const wordsBoxY = summaryTableY;
  const wordsBoxWidth = summaryLeftMargin - margin - 5;
  const wordsString = numberToWordsINR(grandTotal);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, wordsBoxY, wordsBoxWidth, 22, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('AMOUNT IN WORDS:', margin + 3.5, wordsBoxY + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const wordsLines = doc.splitTextToSize(wordsString, wordsBoxWidth - 7);
  doc.text(wordsLines, margin + 3.5, wordsBoxY + 10);

  const paymentMethod = data.payment_method || 'Card / UPI';
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Settlement Mode: ${paymentMethod}`, margin + 3.5, wordsBoxY + 18.5);

  // 9. Terms & Signatory Section
  let finalSectionY = Math.max(doc.lastAutoTable.finalY, wordsBoxY + 24) + 6;

  // Add new page if space is insufficient
  if (finalSectionY > pageHeight - 38) {
    doc.addPage();
    finalSectionY = 20;
  }

  // Terms & Conditions (Left)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('Terms & Conditions:', margin, finalSectionY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('1. All disputes are subject to local judicial jurisdiction.', margin, finalSectionY + 4.5);
  doc.text('2. Check-out time is strictly observed; late stay is subject to tariff.', margin, finalSectionY + 8.5);
  doc.text('3. Management is not responsible for valuables left in rooms.', margin, finalSectionY + 12.5);
  doc.text('4. Property damages will be assessed and billed to guest account.', margin, finalSectionY + 16.5);

  // Authorized Signatory (Right)
  const sigX = pageWidth - margin - 55;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${resortName.substring(0, 26)}`, sigX, finalSectionY);

  doc.setDrawColor(203, 213, 225);
  doc.line(sigX, finalSectionY + 15, sigX + 50, finalSectionY + 15);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory', sigX + 25, finalSectionY + 19, { align: 'center' });

  // 10. Bottom Computer Generated Note
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated tax invoice and requires no physical seal.', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Execute Action (Download or Print)
  const safeFilename = `Invoice_${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  triggerPdfAction(doc, safeFilename, action);
}
