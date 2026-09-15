/**
 * ==============================================================================
 * MASTER EMISSION FACTORS (EF) DATABASE & CALCULATION ENGINE
 * Hệ sinh thái Cơ sở dữ liệu Hệ số Phát thải Toàn diện:
 * 1. Chuẩn Quốc gia Việt Nam: QĐ 2626/QĐ-BTNMT, QĐ 42/2026/QĐ-TTg, NĐ 06/2022/NĐ-CP
 * 2. Chuẩn Quốc tế: GHG Protocol, IPCC AR5, EU CBAM Regulation 2023/1773, GLEC/DEFRA
 * ==============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EF_MASTER = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // ============================================================================
  // PHẦN 1: CHUẨN QUỐC GIA VIỆT NAM (QĐ 2626/QĐ-BTNMT & CỤC BIẾN ĐỔI KHÍ HẬU)
  // ============================================================================
  const VIETNAM_STANDARD = {
    // 1.1 Điện lưới quốc gia (Scope 2) - Cục Biến đổi khí hậu
    electricity: {
      grid_kwh: {
        id: 'grid_kwh',
        name: 'Điện lưới Việt Nam (EVN)',
        factor: 0.6766,
        unit: 'kgCO2e/kWh',
        source: 'Cục Biến đổi khí hậu - Bộ TN&MT'
      },
      grid_mwh: {
        id: 'grid_mwh',
        name: 'Điện lưới Việt Nam (EVN)',
        factor: 0.6766,
        unit: 'tCO2e/MWh',
        source: 'Cục Biến đổi khí hậu - Bộ TN&MT'
      }
    },

    // 1.2 Nhiên liệu đốt cố định & Di động (Phụ lục I - QĐ 2626)
    fuels: {
      diesel: {
        id: 'diesel',
        name: 'Dầu Diesel (DO)',
        factor: 2.686,
        unit: 'kgCO2e/lít',
        ncv: 43.0, // TJ/10^3 tấn
        density: 0.84, // kg/lít
        ef_co2_tj: 74100, // kg CO2/TJ
        ef_ch4_tj: 3.0,
        ef_n2o_tj: 0.6
      },
      petrol: {
        id: 'petrol',
        name: 'Xăng thương phẩm (Gasoline)',
        factor: 2.271,
        unit: 'kgCO2e/lít',
        ncv: 44.3,
        density: 0.74,
        ef_co2_tj: 69300,
        ef_ch4_tj: 33.0,
        ef_n2o_tj: 3.2
      },
      fuel_oil: {
        id: 'fuel_oil',
        name: 'Dầu Mazut (FO - Fuel Oil)',
        factor: 3.107,
        unit: 'kgCO2e/kg',
        ncv: 40.4,
        density: 0.95,
        ef_co2_tj: 77400,
        ef_ch4_tj: 3.0,
        ef_n2o_tj: 0.6
      },
      kerosene: {
        id: 'kerosene',
        name: 'Dầu Hỏa (Kerosene)',
        factor: 2.450,
        unit: 'kgCO2e/lít',
        ncv: 43.8,
        density: 0.80,
        ef_co2_tj: 71900,
        ef_ch4_tj: 10.0,
        ef_n2o_tj: 0.6
      },
      jet_a1: {
        id: 'jet_a1',
        name: 'Nhiên liệu bay (Jet A1)',
        factor: 2.504,
        unit: 'kgCO2e/lít',
        ncv: 44.1,
        density: 0.80,
        ef_co2_tj: 71500,
        ef_ch4_tj: 0.5,
        ef_n2o_tj: 2.0
      },
      lpg: {
        id: 'lpg',
        name: 'Khí dầu mỏ hóa lỏng (LPG)',
        factor: 2.983,
        unit: 'kgCO2e/kg',
        ncv: 47.3,
        density: 0.54,
        ef_co2_tj: 63100,
        ef_ch4_tj: 1.0,
        ef_n2o_tj: 0.1
      },
      natural_gas: {
        id: 'natural_gas',
        name: 'Khí tự nhiên (NG/CNG)',
        factor: 2.023,
        unit: 'kgCO2e/m3',
        ncv: 48.0,
        density: 0.72,
        ef_co2_tj: 56100,
        ef_ch4_tj: 1.0,
        ef_n2o_tj: 0.1
      },
      coal_anthracite: {
        id: 'coal_anthracite',
        name: 'Than Antraxit (Việt Nam)',
        factor: 2.625,
        unit: 'kgCO2e/kg',
        ncv: 26.7,
        ef_co2_tj: 98300,
        ef_ch4_tj: 1.0,
        ef_n2o_tj: 1.5
      },
      coal_subbituminous: {
        id: 'coal_subbituminous',
        name: 'Than Á bitum / Nhập khẩu',
        factor: 2.410,
        unit: 'kgCO2e/kg',
        ncv: 25.1,
        ef_co2_tj: 96100,
        ef_ch4_tj: 1.0,
        ef_n2o_tj: 1.5
      },
      coal_coke: {
        id: 'coal_coke',
        name: 'Than Cốc (Coke)',
        factor: 3.015,
        unit: 'kgCO2e/kg',
        ncv: 28.2,
        ef_co2_tj: 107000,
        ef_ch4_tj: 1.0,
        ef_n2o_tj: 1.5
      },
      biomass_wood: {
        id: 'biomass_wood',
        name: 'Củi / Dăm gỗ / Mùn cưa',
        factor: 0.038,
        unit: 'kgCO2e/kg',
        ncv: 15.6,
        isBiogenic: true, // CO2 sinh học tính riêng
        ef_ch4_tj: 300.0,
        ef_n2o_tj: 4.0
      },
      biomass_pellet: {
        id: 'biomass_pellet',
        name: 'Viên nén gỗ / Mùn cưa ép',
        factor: 0.035,
        unit: 'kgCO2e/kg',
        ncv: 17.5,
        isBiogenic: true,
        ef_ch4_tj: 300.0,
        ef_n2o_tj: 4.0
      },
      charcoal: {
        id: 'charcoal',
        name: 'Than củi',
        factor: 0.335,
        unit: 'kgCO2e/kg',
        ncv: 29.5,
        isBiogenic: true,
        ef_ch4_tj: 200.0,
        ef_n2o_tj: 1.0
      },
      biogas: {
        id: 'biogas',
        name: 'Khí sinh học (Biogas)',
        factor: 0.058,
        unit: 'kgCO2e/m3',
        ncv: 20.0,
        isBiogenic: true
      }
    },

    // 1.3 Quá trình công nghiệp & Luyện kim (Phụ lục II - QĐ 2626)
    industrial_processes: {
      clinker_cement: { id: 'clinker_cement', name: 'Sản xuất Clinker xi măng', factor: 0.525, unit: 'tCO2/tấn clinker' },
      lime_high_calcium: { id: 'lime_high_calcium', name: 'Sản xuất Vôi sống cao canxi (93-98%)', factor: 0.750, unit: 'tCO2/tấn vôi' },
      lime_dolomitic: { id: 'lime_dolomitic', name: 'Sản xuất Vôi sống Đôlômit', factor: 0.770, unit: 'tCO2/tấn vôi' },
      glass_production: { id: 'glass_production', name: 'Sản xuất Kính nổi / Thủy tinh', factor: 0.210, unit: 'tCO2/tấn kính' },
      ammonia_nh3: { id: 'ammonia_nh3', name: 'Sản xuất Amoniac (NH3)', factor: 2.100, unit: 'tCO2/tấn NH3' },
      nitric_acid_hno3: { id: 'nitric_acid_hno3', name: 'Sản xuất Axit Nitric (HNO3)', factor: 8.000, unit: 'kgN2O/tấn HNO3' },
      steel_bof: { id: 'steel_bof', name: 'Thép lò thổi Oxy (BOF)', factor: 2.470, unit: 'tCO2/tấn thép thô' },
      steel_eaf: { id: 'steel_eaf', name: 'Thép lò hồ quang điện (EAF)', factor: 0.060, unit: 'tCO2/tấn thép thô' },
      primary_aluminum: { id: 'primary_aluminum', name: 'Nhôm nguyên sinh (Điện phân)', factor: 1.600, unit: 'tCO2/tấn nhôm' }
    },

    // 1.4 Nông nghiệp & Chăn nuôi (Phụ lục III - QĐ 2626)
    agriculture: {
      dairy_cattle_enteric: { id: 'dairy_cattle_enteric', name: 'Tiêu hóa bò sữa', factor: 78, unit: 'kgCH4/con/năm' },
      beef_cattle_enteric: { id: 'beef_cattle_enteric', name: 'Tiêu hóa bò thịt', factor: 54, unit: 'kgCH4/con/năm' },
      buffalo_enteric: { id: 'buffalo_enteric', name: 'Tiêu hóa đàn trâu', factor: 76, unit: 'kgCH4/con/năm' },
      swine_enteric: { id: 'swine_enteric', name: 'Tiêu hóa đàn lợn', factor: 1, unit: 'kgCH4/con/năm' },
      dairy_manure_ch4: { id: 'dairy_manure_ch4', name: 'Phân chuồng bò sữa (CH4)', factor: 27.0, unit: 'kgCH4/con/năm' },
      swine_manure_ch4: { id: 'swine_manure_ch4', name: 'Phân chuồng đàn lợn (CH4)', factor: 7.0, unit: 'kgCH4/con/năm' },
      rice_north_summer: { id: 'rice_north_summer', name: 'Lúa vụ Hè Thu / Mùa (Miền Bắc)', factor: 3.43, unit: 'kgCH4/ha/ngày' },
      rice_south_winter: { id: 'rice_south_winter', name: 'Lúa vụ Đông Xuân (Miền Nam)', factor: 1.95, unit: 'kgCH4/ha/ngày' },
      fertilizer_n2o_rubber: { id: 'fertilizer_n2o_rubber', name: 'Đất trồng Cao su (N2O)', factor: 0.0202, unit: 'kgN2O-N/kg N bón' },
      fertilizer_n2o_coffee: { id: 'fertilizer_n2o_coffee', name: 'Đất trồng Cà phê (N2O)', factor: 0.0176, unit: 'kgN2O-N/kg N bón' },
      fertilizer_n2o_tea: { id: 'fertilizer_n2o_tea', name: 'Đất trồng Chè (N2O)', factor: 0.0171, unit: 'kgN2O-N/kg N bón' },
      fertilizer_n2o_sugarcane: { id: 'fertilizer_n2o_sugarcane', name: 'Đất trồng Mía (N2O)', factor: 0.0140, unit: 'kgN2O-N/kg N bón' }
    },

    // 1.5 Quản lý chất thải & Nước thải (Phụ lục IV - QĐ 2626)
    waste_and_wastewater: {
      composting_ch4: { id: 'composting_ch4', name: 'Ủ phân compost (CH4)', factor: 0.004, unit: 'kgCH4/kg rác ướt' },
      composting_n2o: { id: 'composting_n2o', name: 'Ủ phân compost (N2O)', factor: 0.00024, unit: 'kgN2O/kg rác ướt' },
      open_burning_ch4: { id: 'open_burning_ch4', name: 'Đốt rác lộ thiên (CH4)', factor: 6.5, unit: 'kgCH4/tấn rác' },
      open_burning_n2o: { id: 'open_burning_n2o', name: 'Đốt rác lộ thiên (N2O)', factor: 0.15, unit: 'kgN2O/tấn rác' },
      domestic_ww_b0: { id: 'domestic_ww_b0', name: 'Khả năng sinh CH4 nước thải sinh hoạt (B0)', factor: 0.60, unit: 'kgCH4/kgBOD' },
      industrial_ww_b0: { id: 'industrial_ww_b0', name: 'Khả năng sinh CH4 nước thải công nghiệp (B0)', factor: 0.25, unit: 'kgCH4/kgCOD' },
      mcf_septic: { id: 'mcf_septic', name: 'MCF Bể tự hoại', factor: 0.50, unit: 'hệ số' },
      mcf_aerobic: { id: 'mcf_aerobic', name: 'MCF Bể hiếu khí Aerotank', factor: 0.30, unit: 'hệ số' },
      mcf_anaerobic: { id: 'mcf_anaerobic', name: 'MCF Bể kỵ khí UASB / hồ sâu', factor: 0.80, unit: 'hệ số' }
    }
  };

  // ============================================================================
  // PHẦN 2: CHUẨN QUỐC TẾ (IPCC AR5, GHG PROTOCOL, EU CBAM & DEFRA/GLEC)
  // ============================================================================
  const INTERNATIONAL_STANDARD = {
    // 2.1 Tiềm năng nóng lên toàn cầu (IPCC AR5 GWP 100-year)
    gwp: {
      CO2: 1,
      CH4: 28,
      N2O: 265,
      R134a: 1430,
      R410A: 2088,
      R22: 1810,
      R32: 675,
      R404A: 3922,
      R407C: 1774,
      SF6: 23500,
      NF3: 16100,
      FM200: 3220, // HFC-227ea
      CF4: 7390,
      C2F6: 12200
    },

    // 2.2 Môi chất lạnh F-Gas rò rỉ (Scope 1 Fugitive)
    refrigerants: {
      r134a: { id: 'r134a', name: 'R-134a (Chiller / Xe hơi)', gwp: 1430, unit: 'kgCO2e/kg' },
      r410a: { id: 'r410a', name: 'R-410A (Điều hòa trung tâm VRV/VRF)', gwp: 2088, unit: 'kgCO2e/kg' },
      r22: { id: 'r22', name: 'R-22 / HCFC-22 (Kho lạnh cũ)', gwp: 1810, unit: 'kgCO2e/kg' },
      r32: { id: 'r32', name: 'R-32 (Điều hòa mới Daikin/Panasonic)', gwp: 675, unit: 'kgCO2e/kg' },
      r404a: { id: 'r404a', name: 'R-404A (Cấp đông âm sâu)', gwp: 3922, unit: 'kgCO2e/kg' },
      r407c: { id: 'r407c', name: 'R-407C (Chiller công nghiệp)', gwp: 1774, unit: 'kgCO2e/kg' },
      sf6: { id: 'sf6', name: 'SF6 (Trạm biến áp / Tủ máy cắt trung thế)', gwp: 23500, unit: 'kgCO2e/kg' },
      fm200: { id: 'fm200', name: 'FM-200 / HFC-227ea (Chữa cháy Data Center)', gwp: 3220, unit: 'kgCO2e/kg' }
    },

    // 2.3 Hơi nước & Nhiệt mua ngoài (Scope 2 Purchased Steam/Heat)
    purchased_steam: {
      coal_fired: { id: 'coal_fired', name: 'Hơi nước mua ngoài (Lò than)', factor: 0.320, unit: 'kgCO2e/kg hơi' },
      biomass_fired: { id: 'biomass_fired', name: 'Hơi nước mua ngoài (Lò sinh khối/trấu)', factor: 0.025, unit: 'kgCO2e/kg hơi' },
      gas_fired: { id: 'gas_fired', name: 'Hơi nước mua ngoài (Lò khí CNG/LPG)', factor: 0.200, unit: 'kgCO2e/kg hơi' }
    },

    // 2.4 Suất phát thải mặc định EU CBAM (EU Regulation 2023/1773)
    cbam_benchmarks: {
      hot_rolled_steel: { hs_code: '7208', name: 'Thép cuộn cán nóng (Hot-rolled)', factor: 1.546, unit: 'tCO2e/tấn SP' },
      cold_rolled_steel: { hs_code: '7209', name: 'Thép cuộn cán nguội (Cold-rolled)', factor: 1.546, unit: 'tCO2e/tấn SP' },
      rebar: { hs_code: '7214', name: 'Thép thanh vằn xây dựng (Rebar)', factor: 1.546, unit: 'tCO2e/tấn SP' },
      wire_rod: { hs_code: '7213', name: 'Thép cuộn dây (Wire Rod)', factor: 1.546, unit: 'tCO2e/tấn SP' },
      galvanized_steel: { hs_code: '7210', name: 'Tôn mạ kẽm / Thép mạ phủ', factor: 1.856, unit: 'tCO2e/tấn SP' },
      steel_pipes: { hs_code: '7306', name: 'Ống thép hàn (Steel Pipes)', factor: 2.188, unit: 'tCO2e/tấn SP' },
      steel_fasteners: { hs_code: '7318', name: 'Ốc vít, bu lông thép (Fasteners)', factor: 2.300, unit: 'tCO2e/tấn SP' },
      primary_aluminum: { hs_code: '7601', name: 'Nhôm nguyên sinh', factor: 6.745, unit: 'tCO2e/tấn nhôm' },
      aluminum_extrusions: { hs_code: '7604', name: 'Nhôm đùn ép định hình', factor: 8.059, unit: 'tCO2e/tấn nhôm' },
      clinker: { hs_code: '2523', name: 'Clinker xi măng', factor: 0.826, unit: 'tCO2e/tấn clinker' },
      cement_portland: { hs_code: '2523', name: 'Xi măng Portland', factor: 0.766, unit: 'tCO2e/tấn xi măng' }
    },

    // 2.5 Vận tải & Logistics Scope 3 (Cat. 4, Cat. 6, Cat. 9 - GLEC / DEFRA)
    logistics: {
      sea_container: { id: 'sea_container', name: 'Tàu biển chở Container quốc tế', factor: 0.013, unit: 'kgCO2e/tấn.km' },
      sea_bulk: { id: 'sea_bulk', name: 'Tàu biển chở hàng rời (Bulk Carrier)', factor: 0.008, unit: 'kgCO2e/tấn.km' },
      heavy_truck: { id: 'heavy_truck', name: 'Xe tải nặng đầu kéo (>20 tấn / Container)', factor: 0.062, unit: 'kgCO2e/tấn.km' },
      medium_truck: { id: 'medium_truck', name: 'Xe tải vừa (7-20 tấn)', factor: 0.082, unit: 'kgCO2e/tấn.km' },
      light_truck: { id: 'light_truck', name: 'Xe tải nhỏ (<7 tấn)', factor: 0.135, unit: 'kgCO2e/tấn.km' },
      air_freight: { id: 'air_freight', name: 'Vận chuyển hàng không (Air Freight)', factor: 1.020, unit: 'kgCO2e/tấn.km' },
      domestic_flight: { id: 'domestic_flight', name: 'Bay công tác nội địa (Hành khách)', factor: 0.255, unit: 'kgCO2e/hành khách.km' },
      international_flight: { id: 'international_flight', name: 'Bay công tác quốc tế (Economy)', factor: 0.195, unit: 'kgCO2e/hành khách.km' },
      passenger_car: { id: 'passenger_car', name: 'Xe ô tô / Taxi / Grab', factor: 0.170, unit: 'kgCO2e/km' }
    },

    // 2.6 Nguyên vật liệu Scope 3 (Cat. 1 Purchased Goods - Higg FEM & Ecoinvent)
    raw_materials: {
      polyester_virgin: { id: 'polyester_virgin', name: 'Vải Polyester nguyên sinh', factor: 5.55, unit: 'kgCO2e/kg' },
      polyester_recycled: { id: 'polyester_recycled', name: 'Vải Polyester tái chế (rPET)', factor: 2.20, unit: 'kgCO2e/kg' },
      cotton_virgin: { id: 'cotton_virgin', name: 'Vải Cotton (Bông tự nhiên)', factor: 3.80, unit: 'kgCO2e/kg' },
      nylon_fabric: { id: 'nylon_fabric', name: 'Vải Nylon (Polyamide 6)', factor: 7.20, unit: 'kgCO2e/kg' },
      pet_resin: { id: 'pet_resin', name: 'Hạt nhựa PET', factor: 2.50, unit: 'kgCO2e/kg' },
      pp_hdpe_resin: { id: 'pp_hdpe_resin', name: 'Hạt nhựa PP / HDPE', factor: 2.10, unit: 'kgCO2e/kg' },
      carton_box: { id: 'carton_box', name: 'Thùng Carton / Bao bì giấy Kraft', factor: 0.94, unit: 'kgCO2e/kg' },
      textile_chemicals: { id: 'textile_chemicals', name: 'Hóa chất trợ nhuộm dệt may', factor: 2.10, unit: 'kgCO2e/kg' },
      water_supply: { id: 'water_supply', name: 'Nước máy sinh hoạt / Thủy cục', factor: 0.344, unit: 'kgCO2e/m3' }
    }
  };

  // ============================================================================
  // PHẦN 3: CÁC HÀM TIỆN ÍCH TÍNH TOÁN (CALCULATION ENGINES)
  // ============================================================================
  const CALCULATORS = {
    /**
     * Tính phát thải Đốt nhiên liệu Scope 1
     * @param {string} fuelId - Mã nhiên liệu (diesel, petrol, fuel_oil, lpg, natural_gas, coal_anthracite...)
     * @param {number} quantity - Lượng tiêu thụ vật lý (lít, kg, m3)
     * @returns {number} Tổng phát thải (tCO2e)
     */
    calculateScope1Fuel: function (fuelId, quantity) {
      const fuel = VIETNAM_STANDARD.fuels[fuelId];
      if (!fuel) throw new Error(`Không tìm thấy nhiên liệu: ${fuelId}`);
      const kgCO2e = quantity * fuel.factor;
      return kgCO2e / 1000; // Đổi sang tấn CO2e
    },

    /**
     * Tính phát thải Điện lưới Scope 2
     * @param {number} kwh - Sản lượng điện tiêu thụ (kWh)
     * @returns {number} Tổng phát thải (tCO2e)
     */
    calculateScope2Electricity: function (kwh) {
      const kgCO2e = kwh * VIETNAM_STANDARD.electricity.grid_kwh.factor;
      return kgCO2e / 1000; // Đổi sang tấn CO2e
    },

    /**
     * Tính phát thải Hơi nước mua ngoài Scope 2
     * @param {string} boilerType - Loại lò hơi (coal_fired, biomass_fired, gas_fired)
     * @param {number} kgSteam - Khối lượng hơi tiêu thụ (kg)
     * @returns {number} Tổng phát thải (tCO2e)
     */
    calculateScope2Steam: function (boilerType, kgSteam) {
      const steam = INTERNATIONAL_STANDARD.purchased_steam[boilerType] || INTERNATIONAL_STANDARD.purchased_steam.coal_fired;
      return (kgSteam * steam.factor) / 1000;
    },

    /**
     * Tính phát thải Rò rỉ môi chất lạnh HVAC / Chiller / F-Gas
     * @param {string} gasKey - Mã môi chất (r134a, r410a, r22, r32, r404a, sf6, fm200...)
     * @param {number} kgRefilled - Lượng gas nạp bổ sung (kg)
     * @returns {number} Tổng phát thải (tCO2e)
     */
    calculateFugitiveGas: function (gasKey, kgRefilled) {
      const gwp = INTERNATIONAL_STANDARD.gwp[gasKey.toUpperCase()] || (INTERNATIONAL_STANDARD.refrigerants[gasKey.toLowerCase()] ? INTERNATIONAL_STANDARD.refrigerants[gasKey.toLowerCase()].gwp : 0);
      if (!gwp) throw new Error(`Không tìm thấy chỉ số GWP cho gas: ${gasKey}`);
      return (kgRefilled * gwp) / 1000;
    },

    /**
     * Tính phát thải Vận tải Logistics Scope 3
     * @param {string} transportType - Loại phương tiện (sea_container, heavy_truck, medium_truck, air_freight...)
     * @param {number} payloadTons - Khối lượng hàng hóa (tấn)
     * @param {number} distanceKm - Quãng đường di chuyển (km)
     * @returns {number} Tổng phát thải (tCO2e)
     */
    calculateLogistics: function (transportType, payloadTons, distanceKm) {
      const mode = INTERNATIONAL_STANDARD.logistics[transportType];
      if (!mode) throw new Error(`Không tìm thấy phương thức vận tải: ${transportType}`);
      const tonKm = payloadTons * distanceKm;
      return (tonKm * mode.factor) / 1000;
    },

    /**
     * Tính phát thải Tiền chất & Nguyên vật liệu Scope 3 Cat 1
     * @param {string} materialId - Mã nguyên vật liệu (polyester_virgin, cotton_virgin, pet_resin, carton_box...)
     * @param {number} quantityKg - Lượng nguyên vật liệu mua vào (kg hoặc m3 đối với nước)
     * @returns {number} Tổng phát thải (tCO2e)
     */
    calculatePurchasedGoods: function (materialId, quantityKg) {
      const mat = INTERNATIONAL_STANDARD.raw_materials[materialId];
      if (!mat) throw new Error(`Không tìm thấy nguyên vật liệu: ${materialId}`);
      return (quantityKg * mat.factor) / 1000;
    },

    /**
     * Tính phát thải Mặc định theo Quy định CBAM Châu Âu
     * @param {string} cbamKey - Mã sản phẩm CBAM (rebar, hot_rolled_steel, primary_aluminum, clinker...)
     * @param {number} productionTons - Khối lượng sản phẩm sản xuất/xuất khẩu (tấn)
     * @returns {number} Tổng phát thải CBAM (tCO2e)
     */
    calculateCBAMDefault: function (cbamKey, productionTons) {
      const item = INTERNATIONAL_STANDARD.cbam_benchmarks[cbamKey];
      if (!item) throw new Error(`Không tìm thấy sản phẩm CBAM: ${cbamKey}`);
      return productionTons * item.factor;
    }
  };

  // ============================================================================
  // EXPORT TOÀN BỘ ĐỐI TƯỢNG MASTER DATABASE
  // ============================================================================
  return {
    VN: VIETNAM_STANDARD,
    INTL: INTERNATIONAL_STANDARD,
    CALC: CALCULATORS
  };
}));
