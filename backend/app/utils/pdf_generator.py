"""
PDF Bill Generation for Checkout
Generates a detailed bill PDF with all charges breakdown
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime
import os


def generate_checkout_bill_pdf(checkout, bill_details, output_path):
    """
    Generate a PDF bill for a checkout — matches the advance receipt format.

    Args:
        checkout: Checkout model instance
        bill_details: Dict containing detailed breakdown
        output_path: Full path where PDF should be saved

    Returns:
        str: Path to the generated PDF
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Support both flat and nested DB formats
    if bill_details and 'charges_breakdown' in bill_details:
        flat_details = bill_details['charges_breakdown']
        # Also copy over the arrays from nested structure if present
        if 'consumables_audit' in bill_details and isinstance(bill_details['consumables_audit'], dict):
            flat_details['consumables_items'] = bill_details['consumables_audit'].get('items', [])
        if 'asset_damages' in bill_details and isinstance(bill_details['asset_damages'], dict):
            flat_details['asset_damages'] = bill_details['asset_damages'].get('items', [])
        bill_details = flat_details

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=0.5*inch, leftMargin=0.5*inch,
                            topMargin=0.5*inch, bottomMargin=0.5*inch)

    elements = []
    styles = getSampleStyleSheet()

    # ── Styles (same as advance receipt) ────────────────────────────────────
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#059669'),
        spaceAfter=4,
        alignment=TA_CENTER
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1F2937'),
        spaceAfter=10,
        spaceBefore=0,
        alignment=TA_LEFT
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1F2937'),
        spaceAfter=10,
        spaceBefore=10
    )

    # ── Header ───────────────────────────────────────────────────────────────
    elements.append(Paragraph("ORCHID TRAILS RESORT", title_style))
    elements.append(Paragraph("Resort Invoice", subtitle_style))
    elements.append(Spacer(1, 0.2*inch))

    # ── Booking Info Grid (same layout as advance receipt) ───────────────────
    check_in_str  = getattr(checkout, 'check_in',  None)
    check_out_str = getattr(checkout, 'check_out', None)
    if hasattr(check_in_str, 'strftime'):
        check_in_str  = check_in_str.strftime('%d-%m-%Y')
    if hasattr(check_out_str, 'strftime'):
        check_out_str = check_out_str.strftime('%d-%m-%Y')

    bill_info_data = [
        ['Bill ID:',     str(checkout.id),                  'Date:',      datetime.now().strftime('%d-%m-%Y %H:%M')],
        ['Guest Name:',  checkout.guest_name or 'N/A',      'Status:',    'Checked Out'],
        ['Check-in:',    check_in_str or 'N/A',             'Check-out:', check_out_str or 'N/A'],
        ['Room:',        checkout.room_number or 'N/A',     'Payment:',   (checkout.payment_method or 'N/A').upper()],
    ]

    if checkout.invoice_number:
        bill_info_data.append(['Invoice #:', checkout.invoice_number, '', ''])

    bill_info_table = Table(bill_info_data, colWidths=[1.5*inch, 2.5*inch, 1.2*inch, 1.8*inch])
    bill_info_table.setStyle(TableStyle([
        ('FONTNAME',     (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',     (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE',     (0, 0), (-1, -1), 10),
        ('TEXTCOLOR',    (0, 0), (-1, -1), colors.HexColor('#374151')),
        ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
    ]))
    elements.append(bill_info_table)
    elements.append(Spacer(1, 0.3*inch))

    # ── Itemized Charges (green header, same style as advance receipt) ────────
    elements.append(Paragraph("Charges Breakdown", heading_style))

    charges_data = [['#', 'Description', 'Qty', 'Amount']]
    row_idx = 1

    def add_row(desc, qty, amount):
        nonlocal row_idx
        charges_data.append([str(row_idx), desc, qty, f'Rs.{amount:,.2f}'])
        row_idx += 1

    if getattr(checkout, 'room_total', 0) > 0:
        add_row('Room Charges', '-', checkout.room_total)
    if getattr(checkout, 'package_total', 0) > 0:
        add_row('Package Charges', '-', checkout.package_total)
    if getattr(checkout, 'food_total', 0) > 0:
        add_row('Food & Beverages', '-', checkout.food_total)
    if getattr(checkout, 'service_total', 0) > 0:
        add_row('Services', '-', checkout.service_total)
    if getattr(checkout, 'consumables_charges', 0) > 0:
        add_row('Consumables', '-', checkout.consumables_charges)
    if getattr(checkout, 'inventory_charges', 0) > 0:
        add_row('Inventory / Rentals', '-', checkout.inventory_charges)
    if getattr(checkout, 'asset_damage_charges', 0) > 0:
        add_row('Asset Damages', '-', checkout.asset_damage_charges)
    if getattr(checkout, 'late_checkout_fee', 0) > 0:
        add_row('Late Checkout Fee', '-', checkout.late_checkout_fee)
    if getattr(checkout, 'key_card_fee', 0) > 0:
        add_row('Key Card Fee', '-', checkout.key_card_fee)

    # Blank separator row before totals
    charges_data.append(['', '', '', ''])

    # Summary rows (right-aligned label + amount, same pattern as advance receipt)
    subtotal = (
        getattr(checkout, 'room_total', 0) +
        getattr(checkout, 'package_total', 0) +
        getattr(checkout, 'food_total', 0) +
        getattr(checkout, 'service_total', 0) +
        getattr(checkout, 'consumables_charges', 0) +
        getattr(checkout, 'inventory_charges', 0) +
        getattr(checkout, 'asset_damage_charges', 0) +
        getattr(checkout, 'late_checkout_fee', 0) +
        getattr(checkout, 'key_card_fee', 0)
    )
    tax      = getattr(checkout, 'tax_amount', 0)
    discount = getattr(checkout, 'discount_amount', 0)
    advance  = getattr(checkout, 'advance_deposit', 0)
    grand    = getattr(checkout, 'grand_total', subtotal + tax - discount)

    charges_data.append(['', '', 'SUBTOTAL',   f'Rs.{subtotal:,.2f}'])
    if tax > 0:
        charges_data.append(['', '', 'TAX (GST)', f'+Rs.{tax:,.2f}'])
    charges_data.append(['', '', 'DISCOUNT',   f'-Rs.{discount:,.2f}'])
    if advance > 0:
        charges_data.append(['', '', 'ADVANCE PAID', f'-Rs.{advance:,.2f}'])

    refund = getattr(checkout, 'refund_amount', 0)
    if refund > 0:
        charges_data.append(['', '', 'REFUND AMOUNT', f'Rs.{refund:,.2f}'])
        charges_data.append(['', '', 'NET PAYABLE',   'Rs.0.00'])
    else:
        charges_data.append(['', '', 'GRAND TOTAL',   f'Rs.{grand:,.2f}'])

    num_detail_rows = row_idx  # rows with actual items (header + items)

    charges_table = Table(charges_data, colWidths=[0.4*inch, 3.6*inch, 1.5*inch, 1.5*inch])
    charges_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND',   (0, 0), (-1, 0),          colors.HexColor('#059669')),
        ('TEXTCOLOR',    (0, 0), (-1, 0),          colors.whitesmoke),
        ('ALIGN',        (0, 0), (-1, 0),          'CENTER'),
        ('FONTNAME',     (0, 0), (-1, 0),          'Helvetica-Bold'),
        ('FONTSIZE',     (0, 0), (-1, 0),          10),
        ('BOTTOMPADDING',(0, 0), (-1, 0),          10),
        ('TOPPADDING',   (0, 0), (-1, 0),          10),
        # Data rows (items only)
        ('BACKGROUND',   (0, 1), (-1, num_detail_rows - 1), colors.white),
        ('GRID',         (0, 0), (-1, num_detail_rows - 1), 0.5, colors.grey),
        ('ALIGN',        (3, 1), (3, -1),          'RIGHT'),
        ('ALIGN',        (2, num_detail_rows), (2, -1), 'RIGHT'),
        ('ALIGN',        (3, num_detail_rows), (3, -1), 'RIGHT'),
        ('VALIGN',       (0, 0), (-1, -1),         'MIDDLE'),
        ('TOPPADDING',   (0, 1), (-1, -1),          8),
        ('BOTTOMPADDING',(0, 1), (-1, -1),          8),
        # Summary rows — bold labels
        ('FONTNAME',     (2, num_detail_rows + 1), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE',     (2, num_detail_rows + 1), (3, -1), 11),
        # Grand Total / Net Payable — green and larger
        ('FONTNAME',     (2, -1), (3, -1),         'Helvetica-Bold'),
        ('FONTSIZE',     (2, -1), (3, -1),         12),
        ('TEXTCOLOR',    (3, -1), (3, -1),
            colors.HexColor('#DC2626') if grand > 0 else colors.HexColor('#059669')),
    ]))
    elements.append(charges_table)
    elements.append(Spacer(1, 0.3*inch))

    # ── Consumables Detail (optional, same green sub-table) ───────────────────
    if bill_details and bill_details.get('consumables_items'):
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("Consumables Details", heading_style))

        consumables_data = [['Item', 'Qty', 'Rate', 'Amount']]
        for item in bill_details['consumables_items']:
            consumables_data.append([
                item.get('item_name', 'N/A'),
                str(item.get('quantity', item.get('actual_consumed', 0))),
                f"Rs.{item.get('charge_per_unit', 0):,.2f}",
                f"Rs.{item.get('total_charge', 0):,.2f}"
            ])

        consumables_table = Table(consumables_data, colWidths=[3.5*inch, 1*inch, 1.5*inch, 1*inch])
        consumables_table.setStyle(TableStyle([
            ('BACKGROUND',   (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR',    (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME',     (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID',         (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN',        (1, 1), (-1, -1), 'RIGHT'),
            ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',   (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ]))
        elements.append(consumables_table)

    # ── Asset Damages Detail (optional) ───────────────────────────────────────
    if bill_details and bill_details.get('asset_damages'):
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("Asset Damages", heading_style))

        damages_data = [['Item', 'Notes', 'Amount']]
        for item in bill_details['asset_damages']:
            damages_data.append([
                item.get('item_name', 'N/A'),
                item.get('notes', '-'),
                f"Rs.{item.get('total_charge', item.get('replacement_cost', 0)):,.2f}"
            ])

        damages_table = Table(damages_data, colWidths=[2.5*inch, 3*inch, 1.5*inch])
        damages_table.setStyle(TableStyle([
            ('BACKGROUND',   (0, 0), (-1, 0), colors.HexColor('#EF4444')),
            ('TEXTCOLOR',    (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME',     (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID',         (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN',        (2, 1), (2, -1), 'RIGHT'),
            ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',   (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ]))
        elements.append(damages_table)

    # ── Footer (identical to advance receipt) ─────────────────────────────────
    elements.append(Spacer(1, 0.6*inch))
    footer_text = f"""
    <para align=center>
    This is a computer-generated invoice for the services rendered.<br/>
    Please present this invoice for any disputes or refund requests.<br/><br/>
    <b>Orchid Trails Resort</b><br/>
    <i>Generated on {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}</i>
    </para>
    """
    elements.append(Paragraph(footer_text, styles['Normal']))

    doc.build(elements)
    return output_path

def generate_advance_payment_receipt_pdf(booking, payments, output_path):
    """
    Generate a PDF receipt for an advance payment
    
    Args:
        booking: Booking/PackageBooking instance
        payments: List of Payment model instances
        output_path: Full path where PDF should be saved
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                           rightMargin=0.5*inch, leftMargin=0.5*inch,
                           topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#059669'), # Emerald 600
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1F2937'),
        spaceAfter=10,
        spaceBefore=10
    )
    
    # Header
    elements.append(Paragraph("ORCHID TRAILS RESORT", title_style))
    elements.append(Paragraph("Advance Payment Receipt", styles['Heading2']))
    elements.append(Spacer(1, 0.2*inch))
    
    # Receipt Info
    display_id = getattr(booking, 'display_id', f"#{booking.id}")
    receipt_info_data = [
        ['Booking ID:', display_id, 'Date:', datetime.now().strftime('%d-%m-%Y %H:%M')],
        ['Guest Name:', booking.guest_name or 'N/A', 'Status:', 'Confirmed'],
        ['Check-in:', booking.check_in.strftime('%d-%m-%Y'), 'Check-out:', booking.check_out.strftime('%d-%m-%Y')],
    ]
    
    receipt_info_table = Table(receipt_info_data, colWidths=[1.5*inch, 2.5*inch, 1.2*inch, 1.8*inch])
    receipt_info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(receipt_info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Payment breakdown
    elements.append(Paragraph("Payment Breakdown", heading_style))
    
    payment_data = [['#', 'Method', 'Status', 'Amount']]
    total_paid = 0
    for idx, p in enumerate(payments, 1):
        method_label = str(p.method).upper()
        payment_data.append([str(idx), method_label, 'PAID', f'Rs.{p.amount:,.2f}'])
        total_paid += p.amount
    
    # Financial Summary
    payment_data.append(['', '', '', ''])
    payment_data.append(['', '', 'TOTAL PAID', f'Rs.{total_paid:,.2f}'])
    
    booking_total = getattr(booking, 'total_amount', 0)
    balance_due = booking_total - total_paid
    payment_data.append(['', '', 'TOTAL BOOKING VALUE', f'Rs.{booking_total:,.2f}'])
    payment_data.append(['', '', 'BALANCE DUE', f'Rs.{balance_due:,.2f}'])
    
    payment_table = Table(payment_data, colWidths=[0.5*inch, 2.5*inch, 2*inch, 2*inch])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        ('GRID', (0, 0), (-1, len(payments)), 0.5, colors.grey),
        ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
        
        ('FONTNAME', (2, -3), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (2, -3), (2, -1), 11),
        ('TEXTCOLOR', (3, -1), (3, -1), colors.HexColor('#DC2626') if balance_due > 0 else colors.HexColor('#059669')),
        ('FONTSIZE', (3, -1), (3, -1), 12),
        ('FONTNAME', (3, -1), (3, -1), 'Helvetica-Bold'),
    ]))
    elements.append(payment_table)
    
    # Notes
    if getattr(booking, 'confirmation_notes', None):
        elements.append(Spacer(1, 0.4*inch))
        elements.append(Paragraph("Confirmation Notes", heading_style))
        elements.append(Paragraph(booking.confirmation_notes, styles['Normal']))
    
    # Footer
    elements.append(Spacer(1, 0.6*inch))
    footer_text = f"""
    <para align=center>
    This is a computer-generated receipt for the advance payment received.<br/>
    Please present this receipt during check-in for verification.<br/><br/>
    <b>Orchid Trails Resort</b><br/>
    <i>Generated on {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}</i>
    </para>
    """
    elements.append(Paragraph(footer_text, styles['Normal']))
    
    doc.build(elements)
    return output_path
