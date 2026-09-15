import pandas as pd
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from flask import Flask, request, send_file, send_from_directory, jsonify
from flask_cors import CORS
import openpyxl
from io import BytesIO

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

import json
import werkzeug.security as ws

# Tắt tính năng đọc/ghi file để tránh lỗi hệ thống trên Vercel
@app.route('/api/register', methods=['POST'])
def api_register():
    return jsonify({"success": False, "message": "Tính năng đăng ký tạm thời bị đóng. Vui lòng dùng tài khoản hệ thống."})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Tài khoản hardcode cố định
    if username == "greenshiftacl2026" and password == "1234":
        return jsonify({"success": True, "company": "GreenShift ACL"})
        
    return jsonify({"success": False, "message": "Sai tài khoản hoặc mật khẩu."})



BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_PATH = os.path.join(BASE_DIR, 'excel_templates', 'CBAM Communication template for installations_en_20241213.xlsx')

def parse_num(val, default=0.0):
    if val is None or val == '':
        return float(default)
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(' ', '')
    if ',' in s and '.' not in s:
        s = s.replace(',', '.')
    elif ',' in s and '.' in s:
        s = s.replace(',', '')
    try:
        return float(s)
    except:
        return float(default)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    data = request.json
    sector = data.get('sector', '').lower()
    
    # Select master template based on sector
    master_path = TEMPLATE_PATH
        
    import os
    base_tpl_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'excel_templates')
    cement_master = os.path.join(base_tpl_dir, "1 CBAM SEE V2.1_Example Cement_final.xlsx")
    steel_master = os.path.join(base_tpl_dir, "4 CBAM SEE V2.1_Example Steel 3 Screws and nuts_final.xlsx")
    fertilizer_master = os.path.join(base_tpl_dir, "5 CBAM SEE V2.1_Example Fertilizer_final.xlsx")
    aluminum_master = os.path.join(base_tpl_dir, "6 CBAM SEE V2.1_Example Aluminium_final.xlsx")
    hydrogen_master = os.path.join(base_tpl_dir, "7 CBAM SEE V2.1_Example Hydrogen 2 processes_final.xlsx")
    
    if os.path.exists(cement_master) and sector == 'cement':
        master_path = cement_master
    elif os.path.exists(steel_master) and sector == 'steel':
        master_path = steel_master
    elif os.path.exists(fertilizer_master) and sector == 'fertilizer':
        master_path = fertilizer_master
    elif os.path.exists(aluminum_master) and sector == 'aluminum':
        master_path = aluminum_master
    elif os.path.exists(hydrogen_master) and sector == 'hydrogen':
        master_path = hydrogen_master
    
    print(f"Using template: {master_path}")
    
    if not os.path.exists(master_path):
        return jsonify({"error": f"Template not found at {master_path}"}), 404
        
    try:
        wb = openpyxl.load_workbook(master_path)
        
        # Mapping logic based on Master Template Hack
        if 'A_InstData' in wb.sheetnames:
            ws_a = wb['A_InstData']
            install_name = data.get('installName', '')
            company_name = data.get('companyName') or install_name
            ws_a['I19'] = company_name
            ws_a['I20'] = install_name
            ws_a['I27'] = data.get('locode', '')
            ws_a['I28'] = data.get('gps', '')
            ws_a['I26'] = 'Viet Nam'
            
            sector_names = {
                'cement': 'Clinker and cement',
                'steel': 'Iron & steel production',
                'aluminum': 'Aluminium production',
                'fertilizer': 'Fertilisers',
                'hydrogen': 'Hydrogen production',
                'electricity': 'Electricity'
            }
            if sector in sector_names:
                ws_a['I22'] = sector_names[sector]
            
        # Variables that need to be scoped for all sectors
        cn_code = data.get('cnCode', '').replace(" ", "")
        trade_name = data.get('tradeName', '')
        route_vn = data.get('productionRoute', '')
        cat = ""
            
        # Dọn sạch và ghi B_EmInst chung cho tất cả các ngành
        if 'B_EmInst' in wb.sheetnames:
            ws_b = wb['B_EmInst']
            fuels = data.get('fuels', [])
            if fuels:
                ws_b['F14'] = fuels[0].get('qty', 1000)
            else:
                ws_b['F14'] = None
            procs = data.get('procMaterials', [])
            if procs:
                ws_b['F15'] = procs[0].get('qty', 1000)
            else:
                ws_b['F15'] = None
            for r in range(16, 32):
                for c in ['D', 'E', 'F', 'H', 'I']:
                    cell = ws_b[f'{c}{r}']
                    if not isinstance(cell, openpyxl.cell.cell.MergedCell):
                        cell.value = None

        # Phân loại Goods Category (cat) CHUẨN XÁC THEO 18 CỤM TỪ CỦA EU (Parameters_Constants!CONST_LIST_Goods)
        if sector == 'steel':
            cat = "Iron or steel products"
            if cn_code.startswith('2601'): cat = "Sintered Ore"  # Chữ O viết hoa chuẩn EU
            elif cn_code.startswith('7201'): cat = "Pig iron"
            elif cn_code.startswith('7202'): cat = "Alloys (FeMn, FeCr, FeNi)"
            elif cn_code.startswith('7203'): cat = "Direct reduced iron"  # Chuẩn EU (thay vì DRI)
            elif cn_code.startswith('7206') or cn_code.startswith('7207') or cn_code.startswith('7218') or cn_code.startswith('7224'):
                cat = "Crude steel" 
                
        elif sector == 'aluminum':
            cat = "Aluminium products"
            if cn_code.startswith('7601'): cat = "Unwrought aluminium"

        elif sector == 'fertilizer':
            cat = "Mixed fertilisers"  # Chuẩn Anh 'fertilisers' (thay vì chữ 'z')
            if cn_code.startswith('2814'): cat = "Ammonia"
            elif cn_code.startswith('2808'): cat = "Nitric acid"
            elif cn_code.startswith('310210'): cat = "Urea"
            elif cn_code.startswith('310230'): cat = "Nitric acid"
            elif cn_code.startswith('3105'): cat = "Mixed fertilisers"

        elif sector == 'hydrogen':
            cat = "Hydrogen"
            
        elif sector == 'electricity':
            cat = "Electricity (export to EU)"  # Chuẩn EU (thay vì Electricity)
            
        elif sector == 'cement':
            cat = "Cement"
            if cn_code.startswith('25231000') or 'clinker' in trade_name.lower(): cat = "Cement clinker"
            elif cn_code.startswith('25070080') or 'sét' in trade_name.lower() or 'clay' in trade_name.lower(): cat = "Calcined clays "
            elif cn_code.startswith('25233000'): cat = "Aluminous cement"
            if not cn_code: cn_code = '25231000'
            if not trade_name: trade_name = 'Cement'
            if not route_vn: route_vn = 'Example process A'

        # COMMON WRITE BLOCK FOR ALL SECTORS
        if 'Summary_Products' in wb.sheetnames:
            ws_sum = wb['Summary_Products']
            
            # 1. Ghi sản phẩm thật của người dùng vào dòng 10 (Good #1 chuẩn EU, tương thích Summary_Communication)
            ws_sum['C10'] = 1
            ws_sum['D10'] = route_vn
            ws_sum['F10'] = cn_code
            ws_sum['H10'] = trade_name
            
            # Đảm bảo các công thức tự động của EU trên dòng 10 được kích hoạt đầy đủ:
            ws_sum['E10'] = '=IF(D10="","",INDEX(CNTR_List_ExistProdProc,MATCH(D10,CNTR_List_ExistProdProcNames,0)))'
            ws_sum['G10'] = '=IF(F10="","",INDEX(CNCodes_ListNames,MATCH(F10,CNCodes_ListKey,0)))'
            ws_sum['I10'] = '=IF(OR($D10="",$D10=CONST_NA),"",INDEX(InputOutput!$AK$71:$AK$80,MATCH($D10,InputOutput!$D$71:$D$80,0)))'
            ws_sum['J10'] = '=IF(OR($D10="",$D10=CONST_NA),"",INDEX(InputOutput!$AM$71:$AM$80,MATCH($D10,InputOutput!$D$71:$D$80,0)))'
            ws_sum['K10'] = '=IF(OR($D10="",$D10=CONST_NA),"",SUM(I10:J10))'
            ws_sum['L10'] = '=IF(E10="","",CONST_tCO2eq & "/" & INDEX(CONST_LIST_GoodsUnit,MATCH(E10,CONST_LIST_Goods,0)))'
            ws_sum['M10'] = '=IF($E10="","",INDEX(Summary_Processes!$AG$162:$AG$520,MATCH($D10,Summary_Processes!$D$162:$D$520,0)))'
            ws_sum['N10'] = '=IF(D10="","",INDEX(D_Processes!T:T,MATCH(CONST_CNTR_ElecEFMethod&D10,D_Processes!R:R,0)))'
            ws_sum['O10'] = '=IF(OR($D10="",$D10=CONST_NA),"",INDEX(InputOutput!$AO$71:$AO$80,MATCH($D10,InputOutput!$D$71:$D$80,0)))'

            # Dọn sạch các sản phẩm thừa từ dòng 11 đến 15 (nếu có dữ liệu mẫu từ các file example)
            for r_idx in range(11, 16):
                ws_sum[f'D{r_idx}'] = None
                ws_sum[f'F{r_idx}'] = None
                ws_sum[f'H{r_idx}'] = None
                for col_idx in range(16, 45):
                    cell = ws_sum.cell(row=r_idx, column=col_idx)
                    if not isinstance(cell, openpyxl.cell.cell.MergedCell):
                        cell.value = None

        if 'C_Emissions&Energy' in wb.sheetnames:
            ws_c = wb['C_Emissions&Energy']
            ws_c['G15'] = parse_num(data.get('elecMwh', 1000 if sector != 'cement' else 1100))
            
        if 'D_Processes' in wb.sheetnames:
            ws_d = wb['D_Processes']
            # 1. Gán Tổng sản lượng (AL) từ Bước 1 vào ô L16 (thay thế công thức mẫu EU)
            ws_d['L16'] = parse_num(data.get('al', 0))
            ws_d['G11'] = route_vn
            ws_d['L11'] = cat

            # 2. Gán Tổng phát thải trực tiếp (Đốt nhiên liệu + Công nghệ) vào ô L54
            comb_em = parse_num(data.get('combEm', data.get('combustionEmissions', 0)))
            if comb_em == 0 and data.get('fuels'):
                comb_em = sum(parse_num(f.get('tco2e', 0)) for f in data.get('fuels'))

            proc_em = parse_num(data.get('procEm', data.get('processEmissions', 0)))
            if proc_em == 0 and data.get('procMaterials'):
                proc_em = sum(parse_num(m.get('tco2e', 0)) for m in data.get('procMaterials'))

            dir_em_total = comb_em + proc_em
            ws_d['L54'] = dir_em_total

            # 3. Map dữ liệu Trao đổi Nhiệt đo đếm được (Import/Export Measurable Heat)
            heat_em = parse_num(data.get('heatEm', data.get('heatExchange', data.get('netHeat', 0))))
            if heat_em == 0 and data.get('heatExchanges'):
                heat_em = sum(parse_num(h.get('tco2e', 0)) for h in data.get('heatExchanges'))

            if heat_em != 0:
                ws_d['K50'] = True
                if heat_em > 0:
                    # Nhập nhiệt (Imported net measurable heat)
                    ws_d['L57'] = round(heat_em / 82.9, 4)  # Đổi tCO2e ra TJ theo hệ số 82.9
                    ws_d['L58'] = 82.9
                    ws_d['M57'] = 0  # Ghi rõ 0 để khớp hoàn toàn cờ kiểm toán EU
                    ws_d['M58'] = 0  # Ghi rõ 0 để khớp hoàn toàn cờ kiểm toán EU
                else:
                    # Xuất nhiệt (Exported net measurable heat)
                    ws_d['M57'] = round(abs(heat_em) / 82.9, 4)  # Đổi tCO2e ra TJ theo hệ số 82.9
                    ws_d['M58'] = 82.9
                    ws_d['L57'] = 0  # Ghi rõ 0 để khớp hoàn toàn cờ kiểm toán EU
                    ws_d['L58'] = 0  # Ghi rõ 0 để khớp hoàn toàn cờ kiểm toán EU
            else:
                ws_d['K50'] = False
                ws_d['L57'] = None
                ws_d['M57'] = None
                ws_d['L58'] = None
                ws_d['M58'] = None

            # 4. Gán Sản lượng điện và Hệ số phát thải điện vào D_Processes
            ws_d['L65'] = parse_num(data.get('elecMwh', 0))
            ws_d['L66'] = parse_num(data.get('elecEf', 0.7221))

        # 3. GHI TIỀN CHẤT VÀ DỌN SẠCH CÁC BLOCK TIỀN CHẤT MẪU CŨ Ở E_PURCHPREC
        precursors = data.get('precursors', [])
        if 'E_PurchPrec' in wb.sheetnames:
            ws_e = wb['E_PurchPrec']
            
            # Nếu là Hàng đơn giản: Tắt cờ và xóa sạch
            if not precursors:
                ws_e['Z14'] = True
                for r_idx in range(17, 96):
                    for col_idx in [5, 8, 12]:
                        cell = ws_e.cell(row=r_idx, column=col_idx)
                        if not isinstance(cell, openpyxl.cell.cell.MergedCell):
                            cell.value = None
            else:
                # Ghi các tiền chất người dùng nhập
                for i, p in enumerate(precursors):
                    if i >= 5: break
                    base = 14 + (i * 44)
                    ws_e[f'Z{base}'] = False
                    
                    raw = (str(p.get('name', '')) + ' ' + str(p.get('cnCode', ''))).lower()
                    pn = 'Cement clinker' # Mặc định
                    if '252310' in raw or 'clinker' in raw: pn = 'Cement clinker'
                    elif '2523' in raw or 'cement' in raw or 'xi măng' in raw: pn = 'Cement'
                    elif '2507' in raw or 'sét' in raw or 'clay' in raw: pn = 'Calcined clays '
                    elif '7203' in raw or 'direct reduced' in raw or 'dri' in raw or 'sắt xốp' in raw: pn = 'Direct reduced iron'
                    elif '7201' in raw or 'pig iron' in raw or 'gang' in raw: pn = 'Pig iron'
                    elif '7202' in raw or 'ferro' in raw or 'alloys' in raw: pn = 'Alloys (FeMn, FeCr, FeNi)'
                    elif '2601' in raw or 'sinter' in raw or 'thiêu kết' in raw: pn = 'Sintered Ore'
                    elif '7206' in raw or '7207' in raw or 'crude steel' in raw or 'phôi' in raw or 'billet' in raw or 'slab' in raw: pn = 'Crude steel'
                    elif '72' in raw or '73' in raw or 'thép' in raw or 'sắt' in raw or 'steel' in raw: pn = 'Iron or steel products'
                    elif '7601' in raw or 'unwrought' in raw or 'thỏi' in raw or 'phiến' in raw: pn = 'Unwrought aluminium'
                    elif '76' in raw or 'nhôm' in raw or 'aluminium' in raw: pn = 'Aluminium products'
                    elif '2814' in raw or 'amoniac' in raw or 'ammonia' in raw: pn = 'Ammonia'
                    elif '2808' in raw or 'nitric' in raw: pn = 'Nitric acid'
                    elif '3102' in raw or 'urea' in raw or 'urê' in raw: pn = 'Urea'
                    elif '3105' in raw or 'phân' in raw or 'fertiliser' in raw or 'fertilizer' in raw: pn = 'Mixed fertilisers'
                    elif '280410' in raw or 'hydro' in raw: pn = 'Hydrogen'
                    
                    amt = parse_num(p.get('amount', 0))
                    ws_e[f'E{base+3}'] = pn
                    ws_e[f'H{base+3}'] = 'Unknown production routes'
                    ws_e[f'L{base+3}'] = amt
                    ws_e[f'E{base+14}'] = route_vn
                    ws_e[f'L{base+14}'] = amt
                    ws_e[f'E{base+27}'] = p.get('country', 'VN')
                    ws_e[f'L{base+35}'] = parse_num(p.get('seeDir', 0))
                    ws_e[f'M{base+35}'] = 'Other'
                    ws_e[f'L{base+36}'] = parse_num(p.get('seeIndir', 0))
                    ws_e[f'M{base+36}'] = 'Other'
                    ws_e[f'L{base+37}'] = 1.0
                    ws_e[f'M{base+37}'] = 'Other'

                # Dọn các block mẫu cũ còn lại nếu người dùng nhập ít hơn số block mẫu trong file EU (ví dụ chỉ nhập 1 tiền chất)
                for empty_idx in range(len(precursors), 5):
                    empty_base = 14 + (empty_idx * 44)
                    ws_e[f'Z{empty_base}'] = True
                    if not isinstance(ws_e.cell(row=empty_base, column=7), openpyxl.cell.cell.MergedCell):
                        ws_e.cell(row=empty_base, column=7, value=None)
                    if not isinstance(ws_e.cell(row=empty_base, column=12), openpyxl.cell.cell.MergedCell):
                        ws_e.cell(row=empty_base, column=12, value=None)
                    for r_sub in range(empty_base + 3, empty_base + 44):
                        for col_sub in [5, 8, 12]:
                            c_cell = ws_e.cell(row=r_sub, column=col_sub)
                            if not isinstance(c_cell, openpyxl.cell.cell.MergedCell):
                                c_cell.value = None
                
        from io import BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"CBAM_Report_Filled_{data.get('year', 2026)}.xlsx"
        return send_file(
            output,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route('/api/generate-internal-report', methods=['POST'])
def generate_internal_report():
    data = request.json
    try:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "GreenShift_Internal_Audit"
        
        ws['A1'] = "GREENSHIFT INTERNAL AUDIT REPORT"
        ws.merge_cells('A1:F1')
        
        ws['A3'] = "Reporting Year & Period:"
        ws['B3'] = str(data.get('year', '2026')) + " - " + str(data.get('period', 'Cả năm'))
        ws['A4'] = "Installation Name:"
        ws['B4'] = data.get('installName', '')
        ws['A5'] = "UN/LOCODE:"
        ws['B5'] = data.get('locode', '')
        ws['A6'] = "GPS Coordinates:"
        ws['B6'] = data.get('gps', '')
        ws['A7'] = "CN Code:"
        ws['B7'] = data.get('cnCode', '')
        ws['A8'] = "Trade Name:"
        ws['B8'] = data.get('tradeName', '')
        ws['A9'] = "Production Route:"
        ws['B9'] = data.get('productionRoute', '')
        ws['A10'] = "Total Production AL (Tons):"
        ws['B10'] = parse_num(data.get('al', 0))
        ws['A11'] = "Exported to EU (Tons):"
        ws['B11'] = parse_num(data.get('exportQty', 0))
        ws['A12'] = "Specific Embedded Emissions (tCO2e/unit):"
        ws['B12'] = parse_num(data.get('seeTotal', 0))
        ws['A13'] = "Sector:"
        ws['B13'] = data.get('sector', '')
        
        ws['D3'] = "FINANCIAL SUMMARY"
        ws.merge_cells('D3:E3')
        ws['D4'] = "CBAM Certificates Needed:"
        ws['E4'] = parse_num(data.get('certCount', 0))
        ws['D5'] = "Gross CBAM Cost (EUR):"
        ws['E5'] = parse_num(data.get('grossCost', 0))
        ws['D6'] = "Local Carbon Tax Deduction:"
        ws['E6'] = parse_num(data.get('localDeduction', 0))
        ws['D7'] = "Total EU CBAM Cost (EUR):"
        ws['E7'] = parse_num(data.get('finalCost', 0))
        
        # TÍNH TOÁN PHÁT THẢI (CBAM BOUNDARY & GHG INVENTORY)
        total_scope1 = 0.0
        total_scope2 = 0.0
        total_scope3 = 0.0
        
        fuels = data.get('fuels', [])
        procs = data.get('procMaterials', [])
        refrigerants = data.get('refrigerants', [])
        wastewater = data.get('wastewater', [])
        heats = data.get('heatExchanges', [])
        elecMwh = parse_num(data.get('elecMwh', 0))
        # Cập nhật hệ số lưới điện VN mới nhất (0.6766 - 0.7221 tCO2/MWh)
        elecEf = parse_num(data.get('elecEf', 0.6766)) 
        precursors = data.get('precursors', [])
        al_val = parse_num(data.get('al', 0))
        
        # Cộng dồn Phát thải trực tiếp (Scope 1)
        for f in fuels: total_scope1 += parse_num(f.get('tco2e', 0))
        for p in procs: total_scope1 += parse_num(p.get('tco2e', 0))
        for r in refrigerants: total_scope1 += parse_num(r.get('tco2e', 0))
        for w in wastewater: total_scope1 += parse_num(w.get('tco2e', 0))
        
        # Cộng dồn Phát thải gián tiếp (Scope 2)
        total_scope2 += (elecMwh * elecEf)
        for h in heats: 
            h_val = parse_num(h.get('tco2e', 0))
            if h_val > 0: # Nhập nhiệt tính vào Scope 2
                total_scope2 += h_val
        
        # Cộng dồn Tiền chất (Scope 3)
        for prec in precursors:
            amt = parse_num(prec.get('amount', 0))
            cf = parse_num(prec.get('consumptionFactor', 0))
            if amt == 0 and cf > 0 and al_val > 0:
                amt = round(cf * al_val, 4)
            see_dir = parse_num(prec.get('seeDir', 0))
            see_indir = parse_num(prec.get('seeIndir', 0))
            total_scope3 += amt * (see_dir + see_indir)
            
        total_emissions = total_scope1 + total_scope2 + total_scope3
        
        # --- BẢNG TỔNG HỢP ĐỐI SOÁT CBAM ---
        current_row = 15
        ws.cell(row=current_row, column=1, value="BẢNG TỔNG HỢP ĐỐI SOÁT CBAM (CBAM EMISSIONS SUMMARY)")
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=6)
        current_row += 1
        ws.cell(row=current_row, column=1, value="Phân loại ranh giới (CBAM Boundary)")
        ws.cell(row=current_row, column=2, value="Tổng phát thải (tCO2e)")
        ws.cell(row=current_row, column=3, value="Tỷ trọng (%)")
        current_row += 1
        
        def safe_pct(part, total):
            if total <= 0:
                return "0.0%"
            return f"{(part / total) * 100:.1f}%"
            
        ws.cell(row=current_row, column=1, value="Phát thải trực tiếp (Direct Emissions - Nhiên liệu, Công nghệ, Nước thải)")
        ws.cell(row=current_row, column=2, value=round(total_scope1, 4))
        ws.cell(row=current_row, column=3, value=safe_pct(total_scope1, total_emissions))
        current_row += 1
        ws.cell(row=current_row, column=1, value="Phát thải gián tiếp (Indirect Emissions - Điện, Nhập nhiệt)")
        ws.cell(row=current_row, column=2, value=round(total_scope2, 4))
        ws.cell(row=current_row, column=3, value=safe_pct(total_scope2, total_emissions))
        current_row += 1
        ws.cell(row=current_row, column=1, value="Phát thải Tiền chất (Precursor Specific Embedded Emissions)")
        ws.cell(row=current_row, column=2, value=round(total_scope3, 4))
        ws.cell(row=current_row, column=3, value=safe_pct(total_scope3, total_emissions))
        current_row += 1
        ws.cell(row=current_row, column=1, value="TỔNG PHÁT THẢI (GROSS EMISSIONS)")
        ws.cell(row=current_row, column=2, value=round(total_emissions, 4))
        ws.cell(row=current_row, column=3, value="100.0%" if total_emissions > 0 else "0.0%")
        current_row += 3
        
        # --- CHI TIẾT SCOPE 1 ---
        ws.cell(row=current_row, column=1, value="CHI TIẾT SCOPE 1 (PHÁT THẢI TRỰC TIẾP)")
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=6)
        current_row += 1
        if fuels:
            ws.cell(row=current_row, column=1, value="- Đốt nhiên liệu (Combustion)")
            current_row += 1
            headers = ["Tên nhiên liệu", "Khối lượng", "Đơn vị", "NCV (TJ/Gg)", "Hệ số PT", "Phát thải (tCO2e)"]
            for col, header in enumerate(headers, 1): ws.cell(row=current_row, column=col, value=header)
            current_row += 1
            for fuel in fuels:
                ws.cell(row=current_row, column=1, value=fuel.get('name', ''))
                ws.cell(row=current_row, column=2, value=parse_num(fuel.get('qty', 0)))
                ws.cell(row=current_row, column=3, value=fuel.get('unit', ''))
                ws.cell(row=current_row, column=4, value=parse_num(fuel.get('ncv', 0)))
                ws.cell(row=current_row, column=5, value=parse_num(fuel.get('ef', 0)))
                ws.cell(row=current_row, column=6, value=parse_num(fuel.get('tco2e', 0)))
                current_row += 1
            current_row += 1
            
        if procs:
            ws.cell(row=current_row, column=1, value="- Quá trình công nghệ (Process Materials)")
            current_row += 1
            headers = ["Quá trình / Vật liệu", "Khối lượng", "Đơn vị", "Hệ số PT", "Ghi chú", "Phát thải (tCO2e)"]
            for col, header in enumerate(headers, 1): ws.cell(row=current_row, column=col, value=header)
            current_row += 1
            for proc in procs:
                ws.cell(row=current_row, column=1, value=proc.get('name', ''))
                ws.cell(row=current_row, column=2, value=parse_num(proc.get('qty', 0)))
                ws.cell(row=current_row, column=3, value=proc.get('unit', 'tấn'))
                ws.cell(row=current_row, column=4, value=parse_num(proc.get('ef', 0)))
                ws.cell(row=current_row, column=5, value=proc.get('note', ''))
                ws.cell(row=current_row, column=6, value=parse_num(proc.get('tco2e', 0)))
                current_row += 1
            current_row += 1
            
        if refrigerants:
            ws.cell(row=current_row, column=1, value="- Phát thải rò rỉ (Fugitive/Refrigerants)")
            current_row += 1
            headers = ["Loại Gas lạnh", "Khối lượng nạp", "Đơn vị", "GWP", "Tỷ lệ rò rỉ", "Phát thải (tCO2e)"]
            for col, header in enumerate(headers, 1): ws.cell(row=current_row, column=col, value=header)
            current_row += 1
            for ref in refrigerants:
                ws.cell(row=current_row, column=1, value=ref.get('name', ''))
                ws.cell(row=current_row, column=2, value=parse_num(ref.get('qty', 0)))
                ws.cell(row=current_row, column=3, value=ref.get('unit', 'kg'))
                ws.cell(row=current_row, column=4, value=parse_num(ref.get('gwp', 0)))
                ws.cell(row=current_row, column=5, value=ref.get('leakRate', ''))
                ws.cell(row=current_row, column=6, value=parse_num(ref.get('tco2e', 0)))
                current_row += 1
            current_row += 1
            
        if wastewater:
            ws.cell(row=current_row, column=1, value="- Nước thải & Xử lý chất thải (Wastewater & Waste)")
            current_row += 1
            headers = ["Nguồn phát sinh", "Khối lượng / Thể tích", "Đơn vị", "Hệ số phát thải", "Thu hồi CH4", "Phát thải (tCO2e)"]
            for col, header in enumerate(headers, 1): ws.cell(row=current_row, column=col, value=header)
            current_row += 1
            for w in wastewater:
                ws.cell(row=current_row, column=1, value=w.get('name', ''))
                ws.cell(row=current_row, column=2, value=parse_num(w.get('qty', 0)))
                ws.cell(row=current_row, column=3, value=w.get('unit', 'm3'))
                ws.cell(row=current_row, column=4, value=parse_num(w.get('ef', 0)))
                ws.cell(row=current_row, column=5, value=parse_num(w.get('recovered', 0)))
                ws.cell(row=current_row, column=6, value=parse_num(w.get('tco2e', 0)))
                current_row += 1
            current_row += 1
            
        # --- CHI TIẾT SCOPE 2 ---
        current_row += 1
        ws.cell(row=current_row, column=1, value="CHI TIẾT SCOPE 2 (PHÁT THẢI GIÁN TIẾP NĂNG LƯỢNG)")
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=6)
        current_row += 1
        
        ws.cell(row=current_row, column=1, value="- Tiêu thụ Điện năng (Electricity)")
        current_row += 1
        ws.cell(row=current_row, column=1, value="Sản lượng điện (MWh)")
        ws.cell(row=current_row, column=2, value=elecMwh)
        current_row += 1
        ws.cell(row=current_row, column=1, value="Hệ số điện (tCO2/MWh)")
        ws.cell(row=current_row, column=2, value=elecEf)
        current_row += 1
        ws.cell(row=current_row, column=1, value="Phát thải Điện (tCO2e)")
        ws.cell(row=current_row, column=2, value=round(elecMwh * elecEf, 4))
        current_row += 2
        
        if heats:
            ws.cell(row=current_row, column=1, value="- Trao đổi Nhiệt (Heat Import/Export)")
            current_row += 1
            headers = ["Loại hình", "Lượng nhiệt (MWh/TJ)", "Đơn vị", "Hệ số phát thải", "Ranh giới", "Phát thải (tCO2e)"]
            for col, header in enumerate(headers, 1): ws.cell(row=current_row, column=col, value=header)
            current_row += 1
            for heat in heats:
                tco2e = parse_num(heat.get('tco2e', 0))
                heat_type = "Nhập nhiệt (Tính vào Scope 2)" if tco2e > 0 else "Xuất nhiệt (Giảm trừ)"
                ws.cell(row=current_row, column=1, value=heat_type)
                ws.cell(row=current_row, column=2, value=parse_num(heat.get('qty', 0)))
                ws.cell(row=current_row, column=3, value=heat.get('unit', 'MWh'))
                ws.cell(row=current_row, column=4, value=parse_num(heat.get('ef', 0)))
                ws.cell(row=current_row, column=5, value=heat.get('boundary', 'Scope 2' if tco2e > 0 else 'Deduction'))
                ws.cell(row=current_row, column=6, value=tco2e)
                current_row += 1
            current_row += 1

        # --- CHI TIẾT SCOPE 3 ---
        current_row += 1
        ws.cell(row=current_row, column=1, value="CHI TIẾT SCOPE 3 (PHÁT THẢI GIÁN TIẾP KHÁC)")
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=6)
        current_row += 1
        if precursors:
            ws.cell(row=current_row, column=1, value="- Tiền chất (Purchased Precursors)")
            current_row += 1
            headers = ["Tên Tiền chất", "Khối lượng", "Hệ số tiêu hao", "SEE Trực tiếp", "SEE Gián tiếp", "Tổng (tCO2e)"]
            for col, header in enumerate(headers, 1): ws.cell(row=current_row, column=col, value=header)
            current_row += 1
            for prec in precursors:
                amt = parse_num(prec.get('amount', 0))
                cf = parse_num(prec.get('consumptionFactor', 0))
                if amt == 0 and cf > 0 and al_val > 0:
                    amt = round(cf * al_val, 4)
                elif cf == 0 and amt > 0 and al_val > 0:
                    cf = round(amt / al_val, 4)
                see_dir = parse_num(prec.get('seeDir', 0))
                see_indir = parse_num(prec.get('seeIndir', 0))
                ws.cell(row=current_row, column=1, value=prec.get('name', ''))
                ws.cell(row=current_row, column=2, value=amt)
                ws.cell(row=current_row, column=3, value=cf)
                ws.cell(row=current_row, column=4, value=see_dir)
                ws.cell(row=current_row, column=5, value=see_indir)
                ws.cell(row=current_row, column=6, value=round(amt * (see_dir + see_indir), 4))
                current_row += 1

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"GreenShift_Internal_Audit_{data.get('year', 2026)}.xlsx"
        return send_file(
            output,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        print("ERROR processing Internal Excel:", str(e))
        return jsonify({"error": str(e)}), 500



@app.route('/api/lookup-default', methods=['POST'])
def lookup_default():
    data = request.json
    cn_code = data.get('cnCode', '').strip()
    country = data.get('country', 'Viet Nam')
    if country == 'VN':
        country = 'Viet Nam'
    
    if not cn_code:
        return jsonify({'error': 'Missing CN Code'}), 400
        
    base_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    dv_file = os.path.join(base_data_dir, 'DV correcting act_final update_06.08.xlsx')
    if not os.path.exists(dv_file):
        return jsonify({'error': f'Database {dv_file} not found on server'}), 500
        
    try:
        # Format CN Code to match EU file (e.g., 25231000 -> 2523 10 00)
        # However, it's safer to just remove spaces from both sides for comparison
        clean_input_cn = cn_code.replace(" ", "")
        
        xl = pd.ExcelFile(dv_file)
        
        def search_in_df(df):
            # 1. Khớp chính xác (Exact match - ưu tiên cao nhất)
            for _, row in df.iterrows():
                row_cn = str(row.iloc[0]).replace(" ", "")
                if clean_input_cn == row_cn:
                    dir_val = str(row.iloc[2]).replace(',', '.').strip()
                    indir_val = str(row.iloc[3]).replace(',', '.').strip()
                    parsed_dir = float(dir_val) if dir_val.replace('.', '', 1).isdigit() else 0.0
                    parsed_indir = float(indir_val) if indir_val.replace('.', '', 1).isdigit() else 0.0
                    if parsed_dir > 0 or parsed_indir > 0:
                        return parsed_dir, parsed_indir
            
            # 2. Khớp tiền tố dài nhất (Longest prefix match)
            best_match = None
            best_len = 0
            for _, row in df.iterrows():
                row_cn = str(row.iloc[0]).replace(" ", "")
                if clean_input_cn.startswith(row_cn) or row_cn.startswith(clean_input_cn):
                    dir_val = str(row.iloc[2]).replace(',', '.').strip()
                    indir_val = str(row.iloc[3]).replace(',', '.').strip()
                    parsed_dir = float(dir_val) if dir_val.replace('.', '', 1).isdigit() else 0.0
                    parsed_indir = float(indir_val) if indir_val.replace('.', '', 1).isdigit() else 0.0
                    if (parsed_dir > 0 or parsed_indir > 0) and len(row_cn) > best_len:
                        best_match = (parsed_dir, parsed_indir)
                        best_len = len(row_cn)
            
            return best_match

        # Thử tìm theo sheet Quốc gia trước
        if country in xl.sheet_names:
            df = pd.read_excel(dv_file, sheet_name=country)
            res = search_in_df(df)
            if res:
                return jsonify({'dir': res[0], 'indir': res[1]})
                    
        # Fallback sang sheet Toàn cầu (_Other Countries and Territorie)
        global_sheet = '_Other Countries and Territorie'
        if global_sheet in xl.sheet_names:
            df = pd.read_excel(dv_file, sheet_name=global_sheet)
            res = search_in_df(df)
            if res:
                return jsonify({'dir': res[0], 'indir': res[1]})
                    
        return jsonify({'error': 'CN Code not found in database'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':

    print("==================================================")
    print("GREENSHIFT BACKEND SERVER IS RUNNING!")
    print("Open your browser and go to: http://localhost:5000")
    print("==================================================")
    app.run(host='0.0.0.0', port=5000)
