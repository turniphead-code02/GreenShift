document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initActivityLogic, 500);

  function initActivityLogic() {
    const btnAddActivity = document.getElementById('btn-add-activity');
    const activityModal = document.getElementById('activity-modal');
    const btnCloseActivity = document.getElementById('btn-close-activity-modal');
    const btnCancelActivity = document.getElementById('btn-cancel-activity-modal');
    const btnSaveActivity = document.getElementById('btn-save-activity-modal');
    const modalTitle = document.getElementById('activity-modal-title');
    
    const activityForm = document.getElementById('activity-form');
    const sourceSelect = document.getElementById('activity-source-select');
    const tbody = document.getElementById('activity-tbody');

    const infoBox = document.getElementById('activity-source-info');
    const infoEf = document.getElementById('info-ef');
    const infoRef = document.getElementById('info-ref');
    const infoUnit = document.getElementById('info-unit');

    let currentEditingRow = null;

    // --- ACTIVITY CUSTOM CASCADING FILTER LOGIC ---
    const actFilterInput = document.getElementById('activity-custom-filter-input');
    const actFilterDropdown = document.getElementById('activity-custom-filter-dropdown');
    const actCol1 = document.getElementById('act-col-1');
    const actCol2 = document.getElementById('act-col-2');
    const actCol3 = document.getElementById('act-col-3');
    const actHiddenFilter = document.getElementById('activity-source-filter');

    let actSelectedL1 = null;
    let actSelectedL2 = null;

    if (actFilterInput) {
      actFilterInput.addEventListener('click', (e) => {
        actFilterDropdown.classList.toggle('open');
        if (actFilterDropdown.classList.contains('open')) {
          renderActCol1();
        }
        e.stopPropagation();
      });

      document.addEventListener('click', (e) => {
        if (!actFilterInput.contains(e.target) && !actFilterDropdown.contains(e.target)) {
          actFilterDropdown.classList.remove('open');
        }
      });
    }

    function getDynamicTree() {
      const tree = {};
      const sourceRows = document.querySelectorAll('#source-tbody tr:not(#no-source-row)');
      sourceRows.forEach(row => {
        const scope = row.cells[0].innerText.trim();
        const category = row.dataset.category || row.cells[1].innerText.trim();
        const type = row.dataset.type || '';
        if (!tree[scope]) tree[scope] = {};
        if (!tree[scope][category]) tree[scope][category] = new Set();
        if (type) tree[scope][category].add(type);
      });
      return tree;
    }

    function renderActCol1() {
      actCol1.innerHTML = '';
      actCol2.innerHTML = '';
      actCol3.innerHTML = '';
      
      const tree = getDynamicTree();
      const scopes = Object.keys(tree);
      if (scopes.length === 0) {
        actCol1.innerHTML = '<div style="padding:1rem;color:#888;">Chưa có Nguồn phát thải nào</div>';
        return;
      }

      const clearDiv = document.createElement('div');
      clearDiv.className = 'dropdown-item';
      clearDiv.innerHTML = '<span>-- Tất cả Nguồn --</span>';
      clearDiv.onclick = () => {
        actFilterInput.innerText = '-- Tất cả Nguồn phát thải --';
        actHiddenFilter.value = '';
        actFilterDropdown.classList.remove('open');
        applyFilter('');
      };
      actCol1.appendChild(clearDiv);

      scopes.forEach(scope => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = `<span>${scope}</span><span class="arrow">></span>`;
        div.onclick = () => {
          Array.from(actCol1.children).forEach(c => c.classList.remove('active'));
          div.classList.add('active');
          actSelectedL1 = scope;
          renderActCol2(tree[scope]);
        };
        actCol1.appendChild(div);
      });
    }

    function renderActCol2(categoriesObj) {
      actCol2.innerHTML = '';
      actCol3.innerHTML = '';
      Object.keys(categoriesObj).forEach(cat => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = `<span>${cat}</span><span class="arrow">></span>`;
        div.onclick = () => {
          Array.from(actCol2.children).forEach(c => c.classList.remove('active'));
          div.classList.add('active');
          actSelectedL2 = cat;
          renderActCol3(Array.from(categoriesObj[cat]));
        };
        actCol2.appendChild(div);
      });
    }

    function renderActCol3(typesArr) {
      actCol3.innerHTML = '';
      typesArr.forEach(type => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = `<span>${type}</span>`;
        div.onclick = () => {
          actFilterInput.innerText = type;
          actHiddenFilter.value = type;
          actFilterDropdown.classList.remove('open');
          applyFilter(type);
        };
        actCol3.appendChild(div);
      });
    }

    function applyFilter(filterType) {
      const rows = tbody.querySelectorAll('tr:not(#no-activity-row)');
      rows.forEach(row => {
        if (!filterType || row.dataset.sourceType === filterType) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    // --- ACTIVITY LOGIC ---
    function getBranchStorageKey(suffix) {
      const username = localStorage.getItem('gs_current_user') || 'guest';
      const branchEl = document.getElementById('branch-selector');
      const branchName = (branchEl && branchEl.value) ? branchEl.value : 'main';
      const branchKey = branchName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      return `gs_data_${username}_${branchKey}_${suffix}`;
    }

    function saveActivityList() {
      const rows = document.querySelectorAll('#activity-tbody tr:not(#no-activity-row)');
      const data = [];
      rows.forEach(row => {
        data.push({ ...row.dataset });
      });
      localStorage.setItem(getBranchStorageKey('activity'), JSON.stringify(data));
    }

    function loadActivityList() {
      tbody.innerHTML = '<tr id="no-activity-row"><td colspan="9" style="text-align: center; color: var(--color-text-secondary); padding: 3rem;">Chưa có dữ liệu</td></tr>';
      const stored = localStorage.getItem(getBranchStorageKey('activity'));
      if (!stored) return;
      try {
        const data = JSON.parse(stored);
        if (data && data.length > 0) {
          document.getElementById('no-activity-row')?.remove();
          data.forEach(item => renderRow(item));
        }
      } catch(e) { console.error('Error loading activity data', e); }
      // Re-apply filter after loading
      applyFilter(actHiddenFilter.value);
    }

    function populateSourceDropdowns(filterType) {
      sourceSelect.innerHTML = '';
      sourceSelect.add(new Option('Vui lòng chọn Thiết bị', '', true, true));
      sourceSelect.options[0].disabled = true;
      
      const sourceRows = document.querySelectorAll('#source-tbody tr:not(#no-source-row)');
      let needsSave = false;

      sourceRows.forEach(row => {
        let id = row.dataset.id;
        if (!id) {
            id = 'src_' + Math.random().toString(36).substr(2, 9);
            row.dataset.id = id;
            needsSave = true;
        }

        const type = row.dataset.type || '';
        
        // If a filter is applied, only show equipment matching that filter
        if (filterType && type !== filterType) return;
        
        // Skip sources that are not material (for Scope 3)
        if (row.dataset.isMaterial === 'false') return;
        
        const eq = row.dataset.eq || '';
        // Build a very clear display name: if eq is present use it, else fallback to type
        let name = type;
        if (eq) {
            name = `${type} - ${eq}`;
        }
        
        const opt = document.createElement('option');
        opt.value = id;
        opt.text = name;
        opt.dataset.ef = row.dataset.ef || '';
        opt.dataset.refrigerant = row.dataset.refrigerant || '';
        opt.dataset.efFactor = row.dataset.efFactor || '';
        opt.dataset.efUnit = row.dataset.efUnit || '';
        opt.dataset.type = type;
        opt.dataset.eq = eq;
        sourceSelect.appendChild(opt);
      });

      if (needsSave && typeof saveSourceList === 'function') {
          saveSourceList();
      }
    }

    function lookupFactor(efName, refName) {
      let factor = 0;
      let unit = '';
      const searchName = refName || efName;
      if (!searchName) return { factor, unit };
      
      // Dynamic IPCC AR lookup for refrigerants
      if (refName && window.IPCC_DB) {
          const userStr = localStorage.getItem('gs_current_user');
          let ar = 'AR5-100'; // Default
          if (userStr) {
              try {
                  const users = JSON.parse(localStorage.getItem('gs_users') || '[]');
                  const u = users.find(x => x.username === userStr);
                  if (u && u.company && u.company.ipccAR) {
                      ar = u.company.ipccAR;
                  }
              } catch (e) {}
          }
          if (window.IPCC_DB[ar] && window.IPCC_DB[ar][refName] !== undefined) {
              return { factor: window.IPCC_DB[ar][refName], unit: 'kgCO2e/kg', source: 'IPCC ' + ar };
          }
      }

      if (typeof EF_MASTER === 'undefined') return { factor, unit };
      const master = EF_MASTER || {};
      for (const stdKey in master) {
        if (typeof master[stdKey] === 'object') {
          for (const category in master[stdKey]) {
            if (typeof master[stdKey][category] === 'object') {
              for (const itemKey in master[stdKey][category]) {
                const item = master[stdKey][category][itemKey];
                if (item && item.name && (searchName.includes(item.name) || item.name.includes(searchName))) {
                  factor = item.factor || item.gwp || 0;
                  unit = item.unit || '';
                  return { factor, unit, source: item.source, fuelItem: item };
                }
              }
            }
          }
        }
      }
      return { factor, unit };
    }

    sourceSelect.addEventListener('change', () => {
      const selected = sourceSelect.options[sourceSelect.selectedIndex];
      const wwGroup = document.getElementById('activity-ww-group');
      
      if (!selected.value) {
        infoBox.style.display = 'none';
        if(wwGroup) wwGroup.style.display = 'none';
        return;
      }
      
      const typeStr = (selected.dataset.type || '').toLowerCase();
      const eqStr = (selected.text || '').toLowerCase();
      const isWW = typeStr.includes('nước thải') || typeStr.includes('tự hoại') || eqStr.includes('nước thải') || eqStr.includes('tự hoại') || eqStr.includes('hiếu khí') || eqStr.includes('kỵ khí') || eqStr.includes('bùn') || typeStr.includes('waste');
      
      if(wwGroup) {
        wwGroup.style.display = isWW ? 'block' : 'none';
        
        // Dynamically change labels for clarity
        const amountLabel = document.getElementById('label-amount') || document.querySelector('label[for="activity-amount"]');
        const unitInput = document.getElementById('activity-unit');
        const btnCalcTow = document.getElementById('btn-calc-tow');
        
        if (isWW) {
          if (amountLabel) amountLabel.innerHTML = 'Tổng chất hữu cơ (TOW) <span style="color: red;">*</span>';
          if (unitInput && !unitInput.value) unitInput.value = 'kg BOD';
          if (btnCalcTow) btnCalcTow.style.display = 'flex';
        } else {
          if (amountLabel) amountLabel.innerHTML = 'Số sử dụng <span style="color: red;">*</span>';
          if (btnCalcTow) btnCalcTow.style.display = 'none';
        }
      }
      infoBox.style.display = isWW ? 'none' : 'block';
      
      const efName = selected.dataset.ef;
      const refName = isWW ? '' : selected.dataset.refrigerant;
      const cFactor = selected.dataset.efFactor;
      const cUnit = selected.dataset.efUnit;
      
      const { factor, unit, source } = lookupFactor(efName, refName);
      
      if (cFactor) {
        infoEf.innerText = `${efName} (Hệ số tùy chỉnh: ${cFactor})`;
        infoRef.innerText = '-';
        infoUnit.innerText = cUnit || 'Chưa rõ';
      } else {
        infoEf.innerText = efName ? `${efName} (Hệ số: ${factor || 'Chưa rõ'} - ${source || '?'})` : '-';
        infoRef.innerText = refName ? `${refName} (GWP: ${factor || 'Chưa rõ'} - ${source || '?'})` : '-';
        infoUnit.innerText = unit || 'Chưa rõ';
      }
      
      const unitInput = document.getElementById('activity-unit');
      const finalUnit = cUnit || unit;
      if (finalUnit && !unitInput.value) {
        const uMatch = finalUnit.split('/')[1]; 
        if (uMatch) unitInput.value = uMatch;
      }
    });

    const openModal = () => {
      const currentFilter = actHiddenFilter.value;
      
      modalTitle.innerText = currentFilter ? `Thêm ${currentFilter}` : `Thêm Dữ liệu hoạt động`;
      populateSourceDropdowns(currentFilter);
      activityModal.classList.add('open');
      
      // Auto-select if there is only 1 device
      if (sourceSelect.options.length === 2) { // 1 disabled option + 1 actual option
        sourceSelect.selectedIndex = 1;
        sourceSelect.dispatchEvent(new Event('change'));
      }
    };

    const closeModal = () => {
      activityModal.classList.remove('open');
      activityForm.reset();
      infoBox.style.display = 'none';
      const fileNameIndicator = document.getElementById('activity-file-name');
      if (fileNameIndicator) fileNameIndicator.style.display = 'none';
      currentEditingRow = null;
    };

    if (btnAddActivity) btnAddActivity.addEventListener('click', openModal);
    if (btnCloseActivity) btnCloseActivity.addEventListener('click', closeModal);
    if (btnCancelActivity) btnCancelActivity.addEventListener('click', closeModal);

    if (btnSaveActivity) btnSaveActivity.addEventListener('click', () => {
      if (!activityForm.checkValidity()) {
        activityForm.reportValidity();
        return;
      }

      const date = document.getElementById('activity-date').value;
      const sourceId = sourceSelect.value;
      const sourceName = sourceSelect.options[sourceSelect.selectedIndex].text;
      const amount = parseFloat(document.getElementById('activity-amount').value);
      const unit = document.getElementById('activity-unit').value;
      
      const doc = document.getElementById('activity-doc').value;
      const manager = document.getElementById('activity-manager').value;
      
      const fileInput = document.getElementById('activity-file');
      const fileName = fileInput.files.length > 0 ? fileInput.files[0].name : (currentEditingRow ? currentEditingRow.dataset.fileName : '');
      
      const sourceType = sourceSelect.options[sourceSelect.selectedIndex].dataset.type;
      const efName = sourceSelect.options[sourceSelect.selectedIndex].dataset.ef;
      const refName = sourceSelect.options[sourceSelect.selectedIndex].dataset.refrigerant;
      const customFactorStr = sourceSelect.options[sourceSelect.selectedIndex].dataset.efFactor;
      const reliability = sourceSelect.options[sourceSelect.selectedIndex].dataset.reliability;
      const measure = sourceSelect.options[sourceSelect.selectedIndex].dataset.measure;
      
      const { factor, fuelItem } = lookupFactor(efName, refName);
      let finalFactor = customFactorStr ? parseFloat(customFactorStr) : factor;
      
      const typeStr = (sourceType || '').toLowerCase();
      const eqStr = (sourceName || '').toLowerCase();
      const isWW = typeStr.includes('nước thải') || typeStr.includes('tự hoại') || eqStr.includes('nước thải') || eqStr.includes('tự hoại') || eqStr.includes('hiếu khí') || eqStr.includes('kỵ khí') || eqStr.includes('bùn') || typeStr.includes('waste');
      
      // Khởi tạo GWPs (Mặc định AR5)
      let ch4Gwp = 28;
      let n2oGwp = 265;
      if (typeof window !== 'undefined' && window.IPCC_DB) {
          const userStr = localStorage.getItem('gs_current_user');
          let ar = 'AR5-100';
          if (userStr) {
              try { 
                  const users = JSON.parse(localStorage.getItem('gs_users') || '[]');
                  const u = users.find(x => x.username === userStr);
                  if (u && u.company && u.company.ipccAR) ar = u.company.ipccAR;
              } catch(e){}
          }
          if (window.IPCC_DB[ar]) {
              if (window.IPCC_DB[ar]['Methane']) ch4Gwp = window.IPCC_DB[ar]['Methane'];
              if (window.IPCC_DB[ar]['Nitrous oxide']) n2oGwp = window.IPCC_DB[ar]['Nitrous oxide'];
          }
      }

      let co2eCalc = amount * finalFactor;
      let wwS = 0, wwR = 0;
      
      if (isWW) {
        if (!finalFactor || finalFactor === 0) {
          // EF_CH4 = B0 (0.6 kg CH4/kg BOD) * MCF theo IPCC 2006
          if (eqStr.includes('tự hoại') || eqStr.includes('septic')) finalFactor = 0.18; // 0.6 * 0.3 = 0.18
          else if (eqStr.includes('hiếu khí') || eqStr.includes('aerotank')) finalFactor = 0.0; // 0.6 * 0.0 = 0.0
          else if (eqStr.includes('kỵ khí') || eqStr.includes('biogas')) finalFactor = 0.48; // 0.6 * 0.8 = 0.48
          else finalFactor = 0.18;
        }
        wwS = parseFloat(document.getElementById('activity-ww-s').value) || 0;
        wwR = parseFloat(document.getElementById('activity-ww-r').value) || 0;
        
        const ch4Emission = ((amount - wwS) * finalFactor) - wwR;
        co2eCalc = Math.max(0, ch4Emission) * ch4Gwp;
      } 
      // NẾU LÀ ĐỐT NHIÊN LIỆU HÓA THẠCH (Mô hình 1 - Có ncv)
      else if (fuelItem && fuelItem.ncv) {
        let massKg = amount;
        
        // Chuyển đổi Lít sang Kg nếu unit là lít/m3 và có tỷ trọng (density)
        // (Thường xăng, dầu DO khai báo lít. Gas LPG khai báo kg. CNG khai m3)
        const unitLower = unit.toLowerCase();
        if ((unitLower.includes('lít') || unitLower.includes('lit') || unitLower === 'l' || unitLower === 'm3') && fuelItem.density) {
            massKg = amount * fuelItem.density;
        }
        
        // Tính năng lượng TJ: Khối lượng (kg) / 10^6 * NCV (TJ/Gg)
        const energyTJ = (massKg / 1000000) * fuelItem.ncv;
        
        // Khối lượng từng loại khí (kg)
        const co2_kg = energyTJ * (fuelItem.ef_co2_tj || 0);
        const ch4_kg = energyTJ * (fuelItem.ef_ch4_tj || 0);
        const n2o_kg = energyTJ * (fuelItem.ef_n2o_tj || 0);
        
        // Tổng CO2e (kg) = CO2 + (CH4 * GWP) + (N2O * GWP)
        co2eCalc = co2_kg + (ch4_kg * ch4Gwp) + (n2o_kg * n2oGwp);
        
        // Cập nhật lại finalFactor để bảng hiển thị UI khớp với phép tính CO2e
        if (amount > 0) finalFactor = co2eCalc / amount;
      }

      
      const co2e = co2eCalc.toFixed(2);
      const now = new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 5);

      const dataObj = {
        date, sourceId, sourceType, sourceName, amount, unit, doc, manager, co2e,
        efName, refName, finalFactor, fileName, createdAt: now,
        wwS: isWW ? wwS : 0, wwR: isWW ? wwR : 0
      };

      if (currentEditingRow) {
        dataObj.createdAt = currentEditingRow.dataset.createdAt;
        Object.assign(currentEditingRow.dataset, dataObj);
        updateRowHTML(currentEditingRow, dataObj);
        currentEditingRow = null;
      } else {
        document.getElementById('no-activity-row')?.remove();
        renderRow(dataObj);
      }
      
      saveActivityList();
      closeModal();
    });

    function renderRow(data) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--color-border)';
      Object.assign(tr.dataset, data);
      updateRowHTML(tr, data);
      tbody.appendChild(tr);
      // Re-apply filter
      applyFilter(actHiddenFilter.value);
    }

    function updateRowHTML(tr, data) {
      const fileHTML = data.fileName 
        ? `<span style="display:inline-block; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #374151;" title="${data.fileName}">📎 ${data.fileName}</span>` 
        : `<span style="color: #888;">${data.doc || '—'}</span>`;

      tr.innerHTML = `
        <td style="padding:0.5rem 0.75rem;">${data.date}</td>
        <td style="padding:0.5rem 0.75rem;">${data.sourceName}</td>
        <td style="padding:0.5rem 0.75rem;">
          ${data.finalFactor ? parseFloat(Number(data.finalFactor).toFixed(4)) : '0'}
        </td>
        <td style="padding:0.5rem 0.75rem;">${data.amount}</td>
        <td style="padding:0.5rem 0.75rem;">${data.unit}</td>
        <td style="padding:0.5rem 0.75rem; font-weight: 600; color: #1a7f4b;">${data.co2e}</td>
        <td style="padding:0.5rem 0.75rem;">${fileHTML}</td>
        <td style="padding:0.5rem 0.75rem;">${data.manager || '—'}</td>
        <td style="padding:0.5rem 0.75rem;">
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="btn-edit-act" style="background:transparent;border:none;cursor:pointer;padding:0;" title="Sửa"><img src="Images/icon_edit_sticker.png" style="width:16px;height:16px;"></button>
            <button class="btn-delete-act" style="background:transparent;border:none;cursor:pointer;padding:0;" title="Xóa"><img src="Images/icon_delete_sticker.png" style="width:16px;height:16px;"></button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-edit-act').addEventListener('click', () => {
        currentEditingRow = tr;
        
        // Temporarily set filter to match this row so the modal populates correctly
        const rowType = data.sourceType || '';
        actHiddenFilter.value = rowType;
        actFilterInput.innerText = rowType || '-- Tất cả Nguồn --';
        
        openModal();
        setTimeout(() => {
          document.getElementById('activity-date').value = data.date;
          sourceSelect.value = data.sourceId;
          sourceSelect.dispatchEvent(new Event('change'));
          document.getElementById('activity-amount').value = data.amount;
          document.getElementById('activity-unit').value = data.unit;
          
          document.getElementById('activity-doc').value = data.doc || '';
          document.getElementById('activity-manager').value = data.manager || '';
          
          const fileNameIndicator = document.getElementById('activity-file-name');
          if (data.fileName) {
            fileNameIndicator.innerText = `Đã đính kèm: ${data.fileName}`;
            fileNameIndicator.style.display = 'block';
          } else {
            fileNameIndicator.style.display = 'none';
          }
        }, 50);
      });

      tr.querySelector('.btn-delete-act').addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn xóa dữ liệu này?')) {
          tr.remove();
          if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr id="no-activity-row"><td colspan="9" style="text-align: center; color: var(--color-text-secondary); padding: 3rem;">Chưa có dữ liệu</td></tr>';
          }
          saveActivityList();
        }
      });
    }

    const branchSelector = document.getElementById('branch-selector');
    if (branchSelector) {
      branchSelector.addEventListener('change', () => {
        setTimeout(() => {
          loadActivityList();
          if (actFilterInput) actFilterInput.innerText = '-- Tất cả Nguồn phát thải --';
          if (actHiddenFilter) actHiddenFilter.value = '';
        }, 100);
      });
    }

    const btnSyncIpcc = document.getElementById('btn-sync-ipcc');
    if (btnSyncIpcc) {
      btnSyncIpcc.addEventListener('click', () => {
        if (!window.IPCC_DB) return;
        
        const currentUser = localStorage.getItem('gs_current_user') || 'guest';
        const users = JSON.parse(localStorage.getItem('gs_users') || '[]');
        const userIndex = users.findIndex(u => u.username === currentUser);
        const user = userIndex !== -1 ? users[userIndex] : null;
        const currentAR = (user && user.company && user.company.ipccAR) ? user.company.ipccAR : 'AR5-100';
        
        const targetAR = currentAR;
        
        const storageKey = getBranchStorageKey('activity');
        let activities = JSON.parse(localStorage.getItem(storageKey) || '[]');
        let changed = false;
        
        activities.forEach(act => {
            const typeStr = (act.sourceType || '').toLowerCase();
            const eqStr = (act.sourceName || '').toLowerCase();
            const isWW = typeStr.includes('nước thải') || typeStr.includes('tự hoại') || eqStr.includes('nước thải') || eqStr.includes('tự hoại') || eqStr.includes('hiếu khí') || eqStr.includes('kỵ khí') || eqStr.includes('bùn') || typeStr.includes('waste');
            
            const ch4Gwp = (window.IPCC_DB[targetAR] && window.IPCC_DB[targetAR]['Methane']) ? window.IPCC_DB[targetAR]['Methane'] : 28;
            const n2oGwp = (window.IPCC_DB[targetAR] && window.IPCC_DB[targetAR]['Nitrous oxide']) ? window.IPCC_DB[targetAR]['Nitrous oxide'] : 265;
            
            if (isWW) {
                const ch4Emission = ((act.amount - (act.wwS || 0)) * act.finalFactor) - (act.wwR || 0);
                const co2eCalc = Math.max(0, ch4Emission) * ch4Gwp;
                if (act.co2e !== co2eCalc.toFixed(2)) {
                    act.co2e = co2eCalc.toFixed(2);
                    changed = true;
                }
            } else if (act.efName && window.EF_MASTER) {
                let fuelItem = null;
                for (const stdKey in EF_MASTER) {
                    for (const cat in EF_MASTER[stdKey]) {
                        for (const key in EF_MASTER[stdKey][cat]) {
                            const item = EF_MASTER[stdKey][cat][key];
                            if (item.name === act.efName || (act.efName.includes(item.name))) {
                                fuelItem = item; break;
                            }
                        }
                    }
                }
                if (fuelItem && fuelItem.ncv) {
                    let massKg = act.amount;
                    const unitLower = (act.unit || '').toLowerCase();
                    if ((unitLower.includes('lít') || unitLower.includes('lit') || unitLower === 'l' || unitLower === 'm3') && fuelItem.density) {
                        massKg = act.amount * fuelItem.density;
                    }
                    const energyTJ = (massKg / 1000000) * fuelItem.ncv;
                    const co2_kg = energyTJ * (fuelItem.ef_co2_tj || 0);
                    const ch4_kg = energyTJ * (fuelItem.ef_ch4_tj || 0);
                    const n2o_kg = energyTJ * (fuelItem.ef_n2o_tj || 0);
                    
                    const co2eCalc = co2_kg + (ch4_kg * ch4Gwp) + (n2o_kg * n2oGwp);
                    const newFactor = act.amount > 0 ? (co2eCalc / act.amount) : act.finalFactor;
                    
                    if (act.co2e !== co2eCalc.toFixed(2) || act.finalFactor !== newFactor) {
                        act.co2e = co2eCalc.toFixed(2);
                        act.finalFactor = newFactor;
                        changed = true;
                    }
                }
            }
            
            if (act.refName) {
                if (window.IPCC_DB[targetAR] && window.IPCC_DB[targetAR][act.refName] !== undefined) {
                    act.finalFactor = window.IPCC_DB[targetAR][act.refName];
                    const co2eCalc = act.amount * act.finalFactor;
                    if (act.co2e !== co2eCalc.toFixed(2)) {
                        act.co2e = co2eCalc.toFixed(2);
                        changed = true;
                    }
                }
            }
        });
        
        if (changed) {
            localStorage.setItem(storageKey, JSON.stringify(activities));
            loadActivityList();
            if (typeof updateDashboard === 'function') updateDashboard();
            alert(`Thành công! Đã cập nhật hệ thống và tính toán lại toàn bộ dữ liệu theo chuẩn ${targetAR}.`);
        } else {
            alert(`Dữ liệu đã chuẩn xác theo ${targetAR}, không có bản ghi nào cần thay đổi.`);
        }
      });
    }

    // TOW Calculator Logic
    const btnCalcTow = document.getElementById('btn-calc-tow');
    const towModal = document.getElementById('tow-modal');
    const tabTow1 = document.getElementById('tab-tow-1');
    const tabTow2 = document.getElementById('tab-tow-2');
    const towContent1 = document.getElementById('tow-content-1');
    const towContent2 = document.getElementById('tow-content-2');
    const btnCancelTow = document.getElementById('btn-cancel-tow');
    const btnApplyTow = document.getElementById('btn-apply-tow');

    let currentTowTab = 1;

    if (btnCalcTow && towModal) {
      btnCalcTow.addEventListener('click', () => {
        towModal.style.display = 'flex';
      });

      tabTow1.addEventListener('click', () => {
        currentTowTab = 1;
        tabTow1.className = 'btn btn-primary';
        tabTow1.style.background = '';
        tabTow1.style.color = '';
        
        tabTow2.className = 'btn btn-secondary';
        tabTow2.style.background = '#e5e7eb';
        tabTow2.style.color = '#374151';
        
        towContent1.style.display = 'block';
        towContent2.style.display = 'none';
      });

      tabTow2.addEventListener('click', () => {
        currentTowTab = 2;
        tabTow2.className = 'btn btn-primary';
        tabTow2.style.background = '';
        tabTow2.style.color = '';
        
        tabTow1.className = 'btn btn-secondary';
        tabTow1.style.background = '#e5e7eb';
        tabTow1.style.color = '#374151';
        
        towContent1.style.display = 'none';
        towContent2.style.display = 'block';
      });

      btnCancelTow.addEventListener('click', () => {
        towModal.style.display = 'none';
      });

      btnApplyTow.addEventListener('click', () => {
        let calculatedTow = 0;
        if (currentTowTab === 1) {
          const vol = parseFloat(document.getElementById('tow-volume').value) || 0;
          const bod = parseFloat(document.getElementById('tow-bod-concentration').value) || 0;
          calculatedTow = (vol * bod) / 1000;
        } else {
          const emp = parseFloat(document.getElementById('tow-employees').value) || 0;
          const days = parseFloat(document.getElementById('tow-days').value) || 0;
          const factor = parseFloat(document.getElementById('tow-bod-factor').value) || 0;
          calculatedTow = emp * days * factor;
        }
        
        const amountInput = document.getElementById('activity-amount');
        if (amountInput) amountInput.value = calculatedTow.toFixed(2);
        
        towModal.style.display = 'none';
      });
    }

    // S & R Calculator Logic
    const btnCalcS = document.getElementById('btn-calc-s');
    const btnCalcR = document.getElementById('btn-calc-r');
    const sModal = document.getElementById('s-modal');
    const rModal = document.getElementById('r-modal');
    
    if (btnCalcS && sModal) {
      btnCalcS.addEventListener('click', () => sModal.style.display = 'flex');
      document.getElementById('btn-cancel-s').addEventListener('click', () => sModal.style.display = 'none');
      document.getElementById('btn-apply-s').addEventListener('click', () => {
        const mass = parseFloat(document.getElementById('s-mass').value) || 0;
        const dry = (parseFloat(document.getElementById('s-dry').value) || 0) / 100;
        const organic = (parseFloat(document.getElementById('s-organic').value) || 0) / 100;
        const calcS = mass * dry * organic;
        document.getElementById('activity-ww-s').value = calcS.toFixed(2);
        sModal.style.display = 'none';
      });
    }

    if (btnCalcR && rModal) {
      btnCalcR.addEventListener('click', () => rModal.style.display = 'flex');
      document.getElementById('btn-cancel-r').addEventListener('click', () => rModal.style.display = 'none');
      document.getElementById('btn-apply-r').addEventListener('click', () => {
        const vol = parseFloat(document.getElementById('r-volume').value) || 0;
        const ch4 = (parseFloat(document.getElementById('r-ch4').value) || 0) / 100;
        const calcR = vol * ch4 * 0.657;
        document.getElementById('activity-ww-r').value = calcR.toFixed(2);
        rModal.style.display = 'none';
      });
    }

    loadActivityList();
  }
});
