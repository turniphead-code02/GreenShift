/**
 * GreenShift v2.0 — Storage Module
 * Stores company data and annual entry data in localStorage
 */

const Storage = {
  getCompany() {
    return JSON.parse(localStorage.getItem('gs_v2_company')) || null;
  },
  
  saveCompany(data) {
    localStorage.setItem('gs_v2_company', JSON.stringify(data));
  },

  getAnnualData() {
    return JSON.parse(localStorage.getItem('gs_v2_annual_data')) || {};
  },

  saveAnnualData(data) {
    localStorage.setItem('gs_v2_annual_data', JSON.stringify(data));
  },

  clearAll() {
    localStorage.removeItem('gs_v2_company');
    localStorage.removeItem('gs_v2_annual_data');
    // Also clear old v1 data
    localStorage.removeItem('gs_company');
    localStorage.removeItem('gs_records');
  }
};

window.Storage = Storage;
