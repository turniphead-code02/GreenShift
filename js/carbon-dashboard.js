// Dashboard logic for GreenShift

let chartScopeObj = null;
let chartMonthlyObj = null;
let chartCategoryObj = null;
let chartEquipmentObj = null;

function renderDashboard() {
  const username = localStorage.getItem('gs_current_user') || 'guest';
  const branchEl = document.getElementById('branch-selector');
  const branchName = (branchEl && branchEl.value) ? branchEl.value : 'main';
  const branchKey = branchName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const storageKey = `gs_data_${username}_${branchKey}_activity`;
  
  const yearEl = document.getElementById('dash-year-select');
  const selectedYear = (yearEl && yearEl.value) ? yearEl.value : new Date().getFullYear().toString();
  
  const activities = JSON.parse(localStorage.getItem(storageKey) || '[]');
  
  // Filter by year
  const filtered = activities.filter(act => act.date && act.date.startsWith(selectedYear));
  
  // 1. Calculate Total tCO2e
  let totalKg = 0;
  const scopeData = { 'Scope 1': 0, 'Scope 2': 0, 'Scope 3': 0 };
  const categoryData = {};
  const equipmentData = {};
  const monthlyScopeData = { 1: Array(12).fill(0), 2: Array(12).fill(0), 3: Array(12).fill(0) };
  const catScopeMap = {};
  const eqScopeMap = {};
  
  // Load sources to get correct Scope mappings
  const sources = JSON.parse(localStorage.getItem(`gs_data_${username}_${branchKey}_sources`) || '[]');
  const sourceMap = {};
  const sourceTypeMap = {};
  sources.forEach(src => {
    if (src.id) {
      sourceMap[src.id] = src.category || 'Khác';
    }
    if (src.type && src.category) {
      sourceTypeMap[src.type] = src.category;
    }
  });

  const CATEGORY_SCOPE = {
    'Đốt cháy cố định': 1, 'Đốt cháy di động': 1, 'Đốt cháy động': 1, 'Phát thải thất thoát': 1, 'Các quá trình công nghiệp': 1, 'Sử dụng đất, thay đổi sử dụng đất và lâm nghiệp (LULUCF)': 1,
    'Điện mua vào': 2, 'Năng lượng mua vào (hơi, nhiệt)': 2,
    'Vận chuyển phân phối thượng nguồn': 3, 'Vận chuyển phân phối hạ nguồn': 3, 'Đi lại của nhân viên': 3, 'Đi công tác': 3,
    'Sản phẩm dịch vụ đã mua': 3, 'Hoạt động liên quan nhiên liệu ngoài loại 1, 2': 3, 'Hàng hóa vốn mua vào': 3, 'Xử lý chất thải phát sinh': 3,
    'Tài sản cho thuê thượng nguồn': 3, 'Sử dụng các dịch vụ': 3, 'Chế biến sản phẩm đã bán': 3, 'Sử dụng sản phẩm dịch vụ đã bán': 3,
    'Xử lý cuối vòng đời sản phẩm': 3, 'Tài sản cho thuê hạ nguồn': 3, 'Danh mục đầu tư': 3, 'Các nguồn phát thải gián tiếp đặc thù khác': 3
  };
  
  filtered.forEach(act => {
    const co2e = parseFloat(act.co2e) || 0;
    totalKg += co2e;
    
    // Exact category lookup via sourceId
    let trueCategory = 'Khác';
    if (act.sourceId && sourceMap[act.sourceId]) {
      trueCategory = sourceMap[act.sourceId];
    } else if (act.sourceType && sourceTypeMap[act.sourceType]) {
      trueCategory = sourceTypeMap[act.sourceType];
    }
    
    // Accurate Scope based on true category
    const scopeNum = CATEGORY_SCOPE[trueCategory] || 3;
    const scope = 'Scope ' + scopeNum;
    
    scopeData[scope] += co2e;
    
    // Monthly
    if (act.date) {
      const monthStr = act.date.split('-')[1];
      if (monthStr) {
        const monthIdx = parseInt(monthStr, 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyScopeData[scopeNum][monthIdx] += co2e;
        }
      }
    }
    
    // Category label for charts
    const cat = trueCategory;
    categoryData[cat] = (categoryData[cat] || 0) + co2e;
    catScopeMap[cat] = scopeNum;
    
    const eq = act.sourceName || 'Chưa rõ';
    equipmentData[eq] = (equipmentData[eq] || 0) + co2e;
    eqScopeMap[eq] = scopeNum;
  });
  
  const totalEmissionsEl = document.getElementById('dash-total-emissions');
  if (totalEmissionsEl) {
    totalEmissionsEl.innerText = (totalKg / 1000).toFixed(2);
  }
  
  // --- YoY Comparison Logic ---
  const yoyContainer = document.getElementById('yoy-comparison-container');
  if (yoyContainer) {
    const targetYear = parseInt(selectedYear) || new Date().getFullYear();
    const years = [targetYear - 2, targetYear - 1, targetYear];
    
    // Structure: yoyData[scopeNum][catName][year] = total tCO2e
    const yoyData = {
      1: {}, 2: {}, 3: {}
    };
    
    // Aggregation
    activities.forEach(act => {
      if (!act.date) return;
      const y = parseInt(act.date.split('-')[0]);
      if (years.includes(y)) {
        const co2e = parseFloat(act.co2e) || 0;
        let trueCat = 'Khác';
        if (act.sourceId && sourceMap[act.sourceId]) trueCat = sourceMap[act.sourceId];
        else if (act.sourceType && sourceTypeMap[act.sourceType]) trueCat = sourceTypeMap[act.sourceType];
        
        const scNum = CATEGORY_SCOPE[trueCat] || 3;
        if (!yoyData[scNum][trueCat]) {
          yoyData[scNum][trueCat] = { [years[0]]: 0, [years[1]]: 0, [years[2]]: 0 };
        }
        yoyData[scNum][trueCat][y] += co2e;
      }
    });

    let html = `
    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
      <thead>
        <tr style="border-bottom: 2px solid #eee; text-align: center; color: #666;">
          <th style="text-align: left; padding: 10px; width: 30%;">Loại khí thải</th>
          <th style="padding: 10px; width: 15%;">${years[0]}Năm</th>
          <th style="padding: 10px; width: 15%;">${years[1]}Năm</th>
          <th style="padding: 10px; width: 15%;">${years[2]}Năm</th>
          <th style="padding: 10px; width: 25%;">So sánh hàng năm</th>
        </tr>
      </thead>
      <tbody>
    `;

    // Totals across all scopes
    let grandTotals = { [years[0]]: 0, [years[1]]: 0, [years[2]]: 0 };

    [1, 2, 3].forEach(scNum => {
      const cats = Object.keys(yoyData[scNum]);
      let scopeTotals = { [years[0]]: 0, [years[1]]: 0, [years[2]]: 0 };
      
      cats.forEach(cat => {
        years.forEach(y => {
          scopeTotals[y] += yoyData[scNum][cat][y];
        });
      });
      
      years.forEach(y => {
        grandTotals[y] += scopeTotals[y];
      });

      // Calculate YoY changes for the scope
      let diff1 = scopeTotals[years[0]] === 0 ? (scopeTotals[years[1]] > 0 ? 100 : 0) : ((scopeTotals[years[1]] - scopeTotals[years[0]]) / scopeTotals[years[0]] * 100);
      let diff2 = scopeTotals[years[1]] === 0 ? (scopeTotals[years[2]] > 0 ? 100 : 0) : ((scopeTotals[years[2]] - scopeTotals[years[1]]) / scopeTotals[years[1]] * 100);
      
      const formatDiff = (diff) => {
        if (diff === 0) return `<span style="color:#aaa;">-</span>`;
        if (diff > 0) return `<span style="color:#ef4444; font-size:0.75rem;">▲ +${diff.toFixed(1)}%</span>`;
        return `<span style="color:#10b981; font-size:0.75rem;">▼ ${diff.toFixed(1)}%</span>`;
      };
      
      const t1 = (scopeTotals[years[0]]/1000).toFixed(2);
      const t2 = (scopeTotals[years[1]]/1000).toFixed(2);
      const t3 = (scopeTotals[years[2]]/1000).toFixed(2);

      html += `
        <tr style="border-bottom: 1px solid #eee; background: #fafafa; cursor: pointer;" onclick="document.getElementById('yoy-scope-${scNum}').style.display = document.getElementById('yoy-scope-${scNum}').style.display === 'none' ? 'table-row-group' : 'none'">
          <td style="padding: 12px 10px; font-weight: 600; text-align: left;">
            <svg width="12" height="12" style="margin-right:6px; display:inline-block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            Loại ${scNum}
          </td>
          <td style="padding: 12px 10px; text-align: center;">${t1 === '0.00' ? '0' : t1}</td>
          <td style="padding: 12px 10px; text-align: center;">${t2 === '0.00' ? '0' : t2}</td>
          <td style="padding: 12px 10px; text-align: center;">${t3 === '0.00' ? '0' : t3}</td>
          <td style="padding: 12px 10px; text-align: center;">
            <div style="display:flex; justify-content:center; gap: 10px;">
              ${formatDiff(diff1)} ${formatDiff(diff2)}
            </div>
          </td>
        </tr>
      `;

      html += `<tbody id="yoy-scope-${scNum}" style="display: none;">`;
      cats.forEach(cat => {
        let v1 = yoyData[scNum][cat][years[0]];
        let v2 = yoyData[scNum][cat][years[1]];
        let v3 = yoyData[scNum][cat][years[2]];
        
        let d1 = v1 === 0 ? (v2 > 0 ? 100 : 0) : ((v2 - v1) / v1 * 100);
        let d2 = v2 === 0 ? (v3 > 0 ? 100 : 0) : ((v3 - v2) / v2 * 100);
        
        const f1 = (v1/1000).toFixed(2);
        const f2 = (v2/1000).toFixed(2);
        const f3 = (v3/1000).toFixed(2);
        
        html += `
          <tr style="border-bottom: 1px solid #f5f5f5;">
            <td style="padding: 8px 10px 8px 30px; color: #555;">${cat}</td>
            <td style="padding: 8px 10px; text-align: center; color: #555;">${f1 === '0.00' ? '0' : f1}</td>
            <td style="padding: 8px 10px; text-align: center; color: #555;">${f2 === '0.00' ? '0' : f2}</td>
            <td style="padding: 8px 10px; text-align: center; color: #555;">${f3 === '0.00' ? '0' : f3}</td>
            <td style="padding: 8px 10px; text-align: center;">
              <div style="display:flex; justify-content:center; gap: 10px;">
                ${formatDiff(d1)} ${formatDiff(d2)}
              </div>
            </td>
          </tr>
        `;
      });
      // Add empty rows to pad if no categories exist for this scope, matching the software's UI
      if (cats.length === 0) {
        html += `
          <tr style="border-bottom: 1px solid #f5f5f5;">
            <td style="padding: 8px 10px 8px 30px; color: #aaa; font-style: italic;">Không có dữ liệu</td>
            <td style="padding: 8px 10px; text-align: center; color: #aaa;">0</td>
            <td style="padding: 8px 10px; text-align: center; color: #aaa;">0</td>
            <td style="padding: 8px 10px; text-align: center; color: #aaa;">0</td>
            <td style="padding: 8px 10px; text-align: center;">-</td>
          </tr>
        `;
      }
      html += `</tbody>`;
    });
    
    // Grand totals
    let gt1 = (grandTotals[years[0]]/1000).toFixed(2);
    let gt2 = (grandTotals[years[1]]/1000).toFixed(2);
    let gt3 = (grandTotals[years[2]]/1000).toFixed(2);
    
    let gDiff1 = grandTotals[years[0]] === 0 ? (grandTotals[years[1]] > 0 ? 100 : 0) : ((grandTotals[years[1]] - grandTotals[years[0]]) / grandTotals[years[0]] * 100);
    let gDiff2 = grandTotals[years[1]] === 0 ? (grandTotals[years[2]] > 0 ? 100 : 0) : ((grandTotals[years[2]] - grandTotals[years[1]]) / grandTotals[years[1]] * 100);
    
    const formatDiffTotal = (diff) => {
      if (diff === 0) return `<span style="color:#aaa;">-</span>`;
      if (diff > 0) return `<span style="color:#ef4444; font-size:0.75rem;">▲ +${diff.toFixed(1)}%</span>`;
      return `<span style="color:#10b981; font-size:0.75rem;">▼ ${diff.toFixed(1)}%</span>`;
    };

    html += `
      <tbody>
        <tr style="border-top: 2px solid #eee; font-weight: bold; background: #fff;">
          <td style="padding: 12px 10px; text-align: center;">Tổng cộng</td>
          <td style="padding: 12px 10px; text-align: center;">${gt1 === '0.00' ? '0' : gt1}</td>
          <td style="padding: 12px 10px; text-align: center;">${gt2 === '0.00' ? '0' : gt2}</td>
          <td style="padding: 12px 10px; text-align: center;">${gt3 === '0.00' ? '0' : gt3}</td>
          <td style="padding: 12px 10px; text-align: center;">
            <div style="display:flex; justify-content:center; gap: 10px;">
              ${formatDiffTotal(gDiff1)} ${formatDiffTotal(gDiff2)}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    `;
    yoyContainer.innerHTML = html;
  }

  // Prepare colors
  const primaryColor = '#1a7f4b';
  const scopeColors = ['#4cb5f5', '#b7d7e8', '#10b981'];
  
  // Chart: Scope
  const ctxScope = document.getElementById('chartScope');
  if (chartScopeObj) chartScopeObj.destroy();
  if (ctxScope) {
    chartScopeObj = new Chart(ctxScope, {
      type: 'doughnut',
      data: {
        labels: ['Scope 1', 'Scope 2', 'Scope 3'],
        datasets: [{
          data: [scopeData['Scope 1'], scopeData['Scope 2'], scopeData['Scope 3']],
          backgroundColor: scopeColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        cutout: '70%'
      }
    });
  }
  
  // Chart: Monthly
  const ctxMonthly = document.getElementById('chartMonthly');
  if (chartMonthlyObj) chartMonthlyObj.destroy();
  if (ctxMonthly) {
    chartMonthlyObj = new Chart(ctxMonthly, {
      type: 'bar',
      data: {
        labels: ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'],
        datasets: [
          { label: 'Scope 1', data: monthlyScopeData[1], backgroundColor: scopeColors[0], borderRadius: 4 },
          { label: 'Scope 2', data: monthlyScopeData[2], backgroundColor: scopeColors[1], borderRadius: 4 },
          { label: 'Scope 3', data: monthlyScopeData[3], backgroundColor: scopeColors[2], borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { stacked: true, beginAtZero: true, grid: { color: '#f3f4f6' } },
          x: { stacked: true, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
  
  // Sort Category and Equipment data for horizontal bars
  const sortData = (obj) => {
    return Object.keys(obj).map(k => ({ label: k, value: obj[k] })).sort((a, b) => b.value - a.value).slice(0, 5);
  };
  
  const catSorted = sortData(categoryData);
  const eqSorted = sortData(equipmentData);
  
  // Chart: Category
  const ctxCategory = document.getElementById('chartCategory');
  if (chartCategoryObj) chartCategoryObj.destroy();
  if (ctxCategory) {
    chartCategoryObj = new Chart(ctxCategory, {
      type: 'bar',
      data: {
        labels: catSorted.map(d => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label),
        datasets: [{
          data: catSorted.map(d => d.value),
          backgroundColor: catSorted.map(d => scopeColors[(catScopeMap[d.label] || 3) - 1]),
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, grid: { color: '#f3f4f6' } },
          y: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
  
  // Chart: Equipment
  const ctxEquipment = document.getElementById('chartEquipment');
  if (chartEquipmentObj) chartEquipmentObj.destroy();
  if (ctxEquipment) {
    chartEquipmentObj = new Chart(ctxEquipment, {
      type: 'bar',
      data: {
        labels: eqSorted.map(d => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label),
        datasets: [{
          data: eqSorted.map(d => d.value),
          backgroundColor: eqSorted.map(d => scopeColors[(eqScopeMap[d.label] || 3) - 1]),
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, grid: { color: '#f3f4f6' } },
          y: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

// Hook up events
document.addEventListener('DOMContentLoaded', () => {
  const branchEl = document.getElementById('branch-selector');
  if (branchEl) {
    branchEl.addEventListener('change', () => {
      setTimeout(renderDashboard, 100);
    });
  }
  
  const yearSelect = document.getElementById('dash-year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', renderDashboard);
  }
  
  // Render on view switch to dashboard
  const navItems = document.querySelectorAll('.nav-item-ci');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.innerText.trim() === 'Bảng điều khiển') {
        setTimeout(renderDashboard, 50);
      }
    });
  });
  
  // Re-render when Activity Data is saved
  const btnSaveActivity = document.getElementById('btn-save-activity-modal');
  if (btnSaveActivity) {
    btnSaveActivity.addEventListener('click', () => {
      setTimeout(renderDashboard, 200);
    });
  }
  
  // Initial render
  setTimeout(renderDashboard, 500);
});
