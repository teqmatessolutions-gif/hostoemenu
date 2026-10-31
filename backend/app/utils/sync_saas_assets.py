import os
import sys
import re
import json
import logging
import subprocess

logger = logging.getLogger("hosto.sync_assets")

def format_currency_in(amount):
    try:
        amount = int(float(amount))
    except Exception:
        amount = 0
    s = str(amount)
    if len(s) <= 3:
        return s
    last3 = s[-3:]
    remaining = s[:-3]
    parts = []
    while len(remaining) > 2:
        parts.insert(0, remaining[-2:])
        remaining = remaining[:-2]
    if remaining:
        parts.insert(0, remaining)
    return ",".join(parts) + "," + last3

FEATURE_LABELS_BROCHURE = {
    "dashboard": "Front Office PMS & Visual Interactive Matrix",
    "room_management": "<strong>Unlimited Rooms</strong> & Dynamic Seasonal Rates",
    "unlimited_rooms": "<strong>Unlimited Rooms</strong> & Zero Per-Room Fees",
    "staff_management": "<strong>Unlimited Staff Logins</strong> & Granular Roles",
    "unlimited_users": "<strong>Unlimited Staff Logins</strong> & Granular Roles",
    "booking_engine": "Direct Guest Booking Engine & Advance Folios",
    "pos": "Restaurant POS & Tableside KOT Ordering",
    "qr_menu": "Contactless Guest QR Dining & Real-time KDS",
    "inventory": "Recipe Costing & Raw Material Stock Controls",
    "housekeeping": "Housekeeping Live Turnover & Maintenance Logs",
    "guest_portal": "Guest Invoicing, Folio Billing & Petty Cash",
    "basic_reports": "Continuous Future Updates & Technical Support",
    "multibranch_hq": "<strong>Multi-Branch Central HQ Command Console</strong>",
    "unlimited_branches": "<strong>Cross-Branch Real-Time Auditing & Stock Sync</strong>",
    "channel_manager": "2-Way OTA Channel Manager Parity (MMT, Agoda, Booking)",
    "accounting": "Double-Entry Accounting (Balance Sheet, P&L, General Ledger)",
    "gst_invoicing": "Indian GST Tax Invoicing (Auto SAC/HSN Codes & GSTR)",
    "hr_payroll": "HR & Payroll Engine (Attendance, Salary Slips, PF/ESI)",
    "custom_domain": "Whitelabel Custom Domain with Dedicated SSL",
    "dedicated_support": "Priority 24/7 Dedicated Account Manager & Phone Support",
}

FEATURE_LABELS_LANDING = {
    "dashboard": "Front Office PMS & Visual Interactive Room Timeline",
    "room_management": "Unlimited Rooms & Flexible Tariff Rate Config",
    "unlimited_rooms": "Unlimited Rooms with Zero Per-Room Fees",
    "staff_management": "Unlimited Staff Logins with Granular Role Permissions",
    "unlimited_users": "Unlimited Staff Users & Anytime Anywhere Access",
    "booking_engine": "Direct Guest Booking Engine & Advance Folios",
    "pos": "Tableside Restaurant POS & Kitchen Order Tickets (KOT)",
    "qr_menu": "Contactless Guest QR Dining & Real-time KDS",
    "inventory": "F&B Recipe Costing & Raw Material Stock Controls",
    "housekeeping": "Housekeeping Live Turnover & Maintenance Logs",
    "guest_portal": "Guest Invoicing, Folio Billing & Petty Cash",
    "basic_reports": "Continuous Future Updates & Technical Support",
    "multibranch_hq": "Multi-Branch Central HQ Command (Consolidated Property Management)",
    "unlimited_branches": "Cross-Branch Real-Time Auditing & Central Analytics",
    "channel_manager": "2-Way OTA Channel Manager Parity (MMT, Agoda, Booking.com)",
    "accounting": "Double-Entry Accounting (Balance Sheet, Profit & Loss, General Ledger)",
    "gst_invoicing": "Indian GST Tax Invoicing (Auto SAC/HSN Codes & GSTR Filing Exports)",
    "hr_payroll": "HR & Payroll Engine (Employee Attendance, Salary Slips, PF/ESI)",
    "custom_domain": "Custom Domain Whitelabel with Dedicated SSL Certificate",
    "dedicated_support": "Priority 24/7 Dedicated Account Manager & Phone Support",
}

def generate_brochure_cards_html(plans):
    num_cols = min(max(len(plans), 1), 3)
    cards = []
    for plan in plans:
        max_branches = plan.get("max_branches", 1) or 1
        is_featured = max_branches > 1 or "enterprise" in str(plan.get("code", "")).lower()
        tag_class = "tag-enterprise" if is_featured else "tag-starter"
        ribbon_html = f'<div class="popular-ribbon">{plan.get("badge") or "MULTI-BRANCH CHAIN"}</div>' if is_featured else ''
        card_class = "plan-card plan-card-featured" if is_featured else "plan-card"
        price_val = format_currency_in(plan.get("price_monthly", 0))
        price_style = 'style="color: #4f46e5;"' if is_featured else ''
        limits_style = 'style="background: #eef2ff;"' if is_featured else ''
        
        if max_branches >= 999:
            scope_label = "Multi-Branch"
            scope_val = "Unlimited Branches"
            scope_style = 'style="color: #b45309;"'
            infra_label = "Infrastructure"
            infra_val = "Central HQ + Domain"
            infra_style = 'style="color: #4338ca;"'
        elif max_branches > 1:
            scope_label = "Multi-Branch"
            scope_val = f"{max_branches} Branches"
            scope_style = 'style="color: #b45309;"'
            infra_label = "Infrastructure"
            infra_val = "Central HQ + Domain"
            infra_style = 'style="color: #4338ca;"'
        else:
            scope_label = "Property Scope"
            scope_val = "1 Branch"
            scope_style = ''
            infra_label = "Anywhere Access"
            infra_val = "Mobile + Web"
            infra_style = 'style="color: var(--primary);"'
            
        max_rooms = plan.get("max_rooms", 9999) or 9999
        rooms_val = "Unlimited" if max_rooms >= 999 else f"{max_rooms} Rooms"
        max_staff = plan.get("max_staff_users", 9999) or 9999
        staff_val = "Unlimited" if max_staff >= 999 else f"{max_staff} Users"
        
        features = plan.get("features", [])
        if isinstance(features, str):
            try:
                features = json.loads(features)
            except Exception:
                features = [f.strip() for f in features.split("\n") if f.strip()]
        if not isinstance(features, list):
            features = []
            
        features_li = []
        if is_featured and not any("starter" in str(f).lower() for f in features):
            features_li.append('<li><span class="chk">&#10003;</span> <strong>All Starter Plan Capabilities Included</strong></li>')
            
        for f in features:
            f_clean = str(f).strip()
            if not f_clean:
                continue
            label = FEATURE_LABELS_BROCHURE.get(f_clean, f_clean.replace('_', ' ').title())
            features_li.append(f'<li><span class="chk">&#10003;</span> {label}</li>')
            
        features_html = "\n                            ".join(features_li)
        badge_tag = f'{plan.get("name")} &bull; {"Multi-Branch" if max_branches > 1 else "Single Property"}'
        
        card = f"""                <!-- {plan.get('name')} Card -->
                <div class="{card_class}">
                    {ribbon_html}
                    <div>
                        <div class="plan-card-header">
                            <span class="plan-tag {tag_class}">{badge_tag}</span>
                            <span class="plan-status">● Active</span>
                        </div>
                        <div class="plan-title">{plan.get('name')}</div>
                        <div class="plan-price" {price_style}>&#8377;{price_val} <span class="plan-period">/ month</span></div>
                        <p class="plan-desc">{plan.get('description', '')}</p>
                        
                        <div class="plan-limits-box" {limits_style}>
                            <div class="limit-col">
                                <span class="limit-label">{scope_label}</span>
                                <span class="limit-val" {scope_style}>{scope_val}</span>
                            </div>
                            <div class="limit-col">
                                <span class="limit-label">Max Rooms</span>
                                <span class="limit-val" style="color: #059669;">{rooms_val}</span>
                            </div>
                            <div class="limit-col">
                                <span class="limit-label">Staff Users</span>
                                <span class="limit-val" style="color: #059669;">{staff_val}</span>
                            </div>
                            <div class="limit-col">
                                <span class="limit-label">{infra_label}</span>
                                <span class="limit-val" {infra_style}>{infra_val}</span>
                            </div>
                        </div>

                        <div class="plan-features-label">FEATURES ({len(features_li)})</div>
                        <ul class="plan-features-list">
                            {features_html}
                        </ul>
                    </div>
                </div>"""
        cards.append(card)
        
    return f"""<div class="plans-cards-grid" id="brochure-plans-container" style="grid-template-columns: repeat({num_cols}, 1fr);">
{chr(10).join(cards)}
            </div>"""

def generate_landing_cards_html(plans):
    cards = []
    num_cols = min(max(len(plans), 1), 3)
    grid_class = f"grid grid-cols-1 md:grid-cols-{num_cols} gap-8 max-w-5xl mx-auto items-stretch"
    
    for plan in plans:
        max_branches = plan.get("max_branches", 1) or 1
        is_featured = max_branches > 1 or "enterprise" in str(plan.get("code", "")).lower()
        price_val = format_currency_in(plan.get("price_monthly", 0))
        
        if max_branches >= 999:
            scope_badge = "Multi-Branch Chain"
            scope_badge_class = "bg-indigo-50 text-indigo-700 border border-indigo-200"
            ribbon = f'<div class="absolute -top-3.5 right-6 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md">{plan.get("badge") or "Multi-Branch Architecture"}</div>'
            card_wrap = "glass-card rounded-3xl p-8 sm:p-10 flex flex-col justify-between border-2 border-indigo-600 shadow-xl shadow-indigo-600/10 relative z-10 bg-white"
            price_class = "text-5xl font-black text-indigo-600 font-display"
            quota_box = "grid grid-cols-2 gap-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 mb-6 text-xs"
            scope_title = "Multi-Branch"
            scope_val_text = "Unlimited Branches"
            scope_val_class = "text-amber-900 text-sm"
            infra_title = "Infrastructure"
            infra_val = "Central HQ + Domain"
            infra_val_class = "text-indigo-900 text-sm"
            feat_header = "Enterprise Multi-Branch Suite"
            btn_class = "w-full block text-center py-3.5 text-xs font-extrabold uppercase tracking-wider rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all"
        elif max_branches > 1:
            scope_badge = f"{max_branches} Branches Chain"
            scope_badge_class = "bg-indigo-50 text-indigo-700 border border-indigo-200"
            ribbon = f'<div class="absolute -top-3.5 right-6 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md">{plan.get("badge") or "Multi-Branch Chain"}</div>'
            card_wrap = "glass-card rounded-3xl p-8 sm:p-10 flex flex-col justify-between border-2 border-indigo-600 shadow-xl shadow-indigo-600/10 relative z-10 bg-white"
            price_class = "text-5xl font-black text-indigo-600 font-display"
            quota_box = "grid grid-cols-2 gap-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 mb-6 text-xs"
            scope_title = "Multi-Branch"
            scope_val_text = f"{max_branches} Branches"
            scope_val_class = "text-amber-900 text-sm"
            infra_title = "Infrastructure"
            infra_val = "Central HQ + Domain"
            infra_val_class = "text-indigo-900 text-sm"
            feat_header = "Enterprise Multi-Branch Suite"
            btn_class = "w-full block text-center py-3.5 text-xs font-extrabold uppercase tracking-wider rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all"
        else:
            scope_badge = "Single Property"
            scope_badge_class = "bg-emerald-50 text-emerald-800 border border-emerald-200"
            ribbon = ""
            card_wrap = "glass-card rounded-3xl p-8 sm:p-10 flex flex-col justify-between border-slate-200 hover:border-indigo-300 transition-all bg-white relative"
            price_class = "text-5xl font-black text-slate-900 font-display"
            quota_box = "grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-xs"
            scope_title = "Property Scope"
            scope_val_text = "1 Property"
            scope_val_class = "text-slate-900 text-sm"
            infra_title = "Anywhere Access"
            infra_val = "Mobile + Web App"
            infra_val_class = "text-indigo-700 text-sm"
            feat_header = f"Included Capabilities ({len(plan.get('features', []))})"
            btn_class = "w-full block text-center py-3.5 text-xs font-extrabold uppercase tracking-wider rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm"

        max_rooms = plan.get("max_rooms", 9999) or 9999
        rooms_val = "Unlimited Rooms" if max_rooms >= 999 else f"{max_rooms} Rooms"
        max_staff = plan.get("max_staff_users", 9999) or 9999
        staff_val = "Unlimited Users" if max_staff >= 999 else f"{max_staff} Staff Users"
        
        features = plan.get("features", [])
        if isinstance(features, str):
            try:
                features = json.loads(features)
            except Exception:
                features = [f.strip() for f in features.split("\n") if f.strip()]
        if not isinstance(features, list):
            features = []
                
        features_li = []
        if is_featured and not any("starter" in str(f).lower() for f in features):
            features_li.append('<li class="flex items-center gap-2.5"><span class="text-emerald-600 font-bold text-sm">✓</span> <strong class="text-slate-900">Everything in Starter Plan Included</strong></li>')
            
        for f in features:
            f_clean = str(f).strip()
            if not f_clean:
                continue
            label = FEATURE_LABELS_LANDING.get(f_clean, f_clean.replace('_', ' ').title())
            features_li.append(f'<li class="flex items-center gap-2.5"><span class="text-emerald-600 font-bold text-sm">✓</span> {label}</li>')
            
        features_html = "\n                            ".join(features_li)
        
        card = f"""                <!-- {plan.get('name')} Tier -->
                <div class="{card_wrap}">
                    {ribbon}
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <span class="px-3.5 py-1 text-xs font-black uppercase tracking-wider rounded-md {scope_badge_class}">{scope_badge}</span>
                            <span class="text-xs font-bold text-emerald-700 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Plan</span>
                        </div>
                        <h3 class="text-3xl font-black text-slate-900 mb-1">{plan.get('name')}</h3>
                        <div class="flex items-baseline gap-1 my-3">
                            <span class="{price_class}">₹{price_val}</span>
                            <span class="text-sm font-semibold text-slate-500">/ month</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                            {plan.get('description', '')}
                        </p>

                        <div class="{quota_box}">
                            <div><span class="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">{scope_title}</span><strong class="{scope_val_class}">{scope_val_text}</strong></div>
                            <div><span class="text-[10px] text-emerald-700 uppercase font-bold block tracking-wider">Max Rooms</span><strong class="text-emerald-700 text-sm">{rooms_val}</strong></div>
                            <div><span class="text-[10px] text-emerald-700 uppercase font-bold block tracking-wider">Staff Users</span><strong class="text-emerald-700 text-sm">{staff_val}</strong></div>
                            <div><span class="text-[10px] text-indigo-700 uppercase font-bold block tracking-wider">{infra_title}</span><strong class="{infra_val_class}">{infra_val}</strong></div>
                        </div>

                        <div class="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-3">{feat_header}</div>
                        <ul class="space-y-2.5 text-xs text-slate-700">
                            {features_html}
                        </ul>
                    </div>

                    <div class="mt-8 pt-6 border-t border-slate-200">
                        <a href="tel:9961239861" class="{btn_class}">Get Started with {plan.get('name')} &bull; Call Now</a>
                    </div>
                </div>"""
        cards.append(card)
        
    return f"""<div id="saas-plans-container" class="{grid_class}">
{chr(10).join(cards)}
            </div>"""

def sync_all_saas_assets(plans_dict_list=None):
    """
    Regenerates brochure HTML & vector PDF, and updates landing page HTML
    with active plans from database or passed plans list.
    """
    try:
        if plans_dict_list is None:
            # Query from DB
            from app.database import SessionLocal
            from app.models.tenant import SaaSPlan
            db = SessionLocal()
            try:
                active_plans = db.query(SaaSPlan).filter(SaaSPlan.is_active == True).order_by(SaaSPlan.price_monthly.asc()).all()
                plans_dict_list = []
                for p in active_plans:
                    plans_dict_list.append({
                        "id": p.id,
                        "name": p.name,
                        "code": p.code,
                        "price_monthly": p.price_monthly,
                        "price_yearly": p.price_yearly,
                        "max_branches": p.max_branches,
                        "max_rooms": p.max_rooms,
                        "max_staff_users": p.max_staff_users,
                        "description": p.description,
                        "badge": p.badge,
                        "features": p.features_list
                    })
            finally:
                db.close()

        if not plans_dict_list:
            logger.warning("No active plans found to sync.")
            return

        userend_dir = "/var/www/hosto/userend/build"
        dasboard_dir = "/var/www/hosto/dasboard/build"
        
        # 1. Update Brochure HTML
        brochure_cards = generate_brochure_cards_html(plans_dict_list)
        brochure_path = os.path.join(userend_dir, "hosto_executive_brochure.html")
        if os.path.exists(brochure_path):
            with open(brochure_path, "r", encoding="utf-8") as f:
                b_html = f.read()
            
            # Replace brochure grid
            pattern = r'<div class="plans-cards-grid"[^>]*>[\s\S]*?</div>\s*<!-- Value Metric'
            replacement = brochure_cards + "\n\n            <!-- Value Metric"
            new_b_html = re.sub(pattern, replacement, b_html, count=1)
            
            with open(brochure_path, "w", encoding="utf-8") as f:
                f.write(new_b_html)
            logger.info("Updated brochure HTML at %s", brochure_path)
            
            if os.path.exists(dasboard_dir):
                import shutil
                shutil.copy2(brochure_path, os.path.join(dasboard_dir, "hosto_executive_brochure.html"))

            # 2. Compile Vector PDF with Google Chrome Headless
            pdf_path = os.path.join(userend_dir, "hosto_executive_brochure.pdf")
            chrome_bin = "/usr/bin/google-chrome"
            if not os.path.exists(chrome_bin):
                chrome_bin = "/usr/bin/chromium-browser"
            if not os.path.exists(chrome_bin):
                chrome_bin = "google-chrome"

            cmd = [
                chrome_bin,
                "--headless=new",
                "--no-sandbox",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--print-to-pdf={pdf_path}",
                f"file://{brochure_path}"
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if os.path.exists(pdf_path):
                logger.info("Successfully compiled vector PDF at %s (size: %d bytes)", pdf_path, os.path.getsize(pdf_path))
                if os.path.exists(dasboard_dir):
                    shutil.copy2(pdf_path, os.path.join(dasboard_dir, "hosto_executive_brochure.pdf"))
            else:
                logger.error("Failed to compile PDF: %s", res.stderr)

        # 3. Update Landing Page HTML
        landing_cards = generate_landing_cards_html(plans_dict_list)
        landing_path = os.path.join(userend_dir, "index.html")
        if os.path.exists(landing_path):
            with open(landing_path, "r", encoding="utf-8") as f:
                l_html = f.read()
                
            l_pattern = r'<div id="saas-plans-container"[^>]*>[\s\S]*?</div>\s*</div>\s*</section>'
            l_replacement = landing_cards + "\n        </div>\n    </section>"
            new_l_html = re.sub(l_pattern, l_replacement, l_html, count=1)
            
            with open(landing_path, "w", encoding="utf-8") as f:
                f.write(new_l_html)
            logger.info("Updated landing page static cards at %s", landing_path)

        logger.info("SaaS Assets sync completed successfully.")
    except Exception as e:
        logger.exception("Error syncing SaaS assets: %s", e)
