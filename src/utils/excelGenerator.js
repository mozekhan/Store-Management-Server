// utils/excelGenerator.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { formatCurrency, formatDate, formatTime } = require('./formatters');

class ExcelGenerator {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate sales report Excel
   */
  async generateSalesReport(data, options = {}) {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = this._prepareSummarySheet(data);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: Time Series
    if (data.timeSeries && data.timeSeries.length > 0) {
      const timeSeriesData = this._prepareTimeSeriesSheet(data.timeSeries);
      const timeSeriesSheet = XLSX.utils.json_to_sheet(timeSeriesData);
      XLSX.utils.book_append_sheet(workbook, timeSeriesSheet, 'Time Series');
    }

    // Sheet 3: Payment Breakdown
    if (data.paymentBreakdown && data.paymentBreakdown.length > 0) {
      const paymentData = this._preparePaymentSheet(data.paymentBreakdown);
      const paymentSheet = XLSX.utils.json_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payment Methods');
    }

    // Sheet 4: Top Products
    if (data.topProducts && data.topProducts.length > 0) {
      const productData = this._prepareProductSheet(data.topProducts);
      const productSheet = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(workbook, productSheet, 'Top Products');
    }

    // Sheet 5: Staff Performance
    if (data.staffPerformance && data.staffPerformance.length > 0) {
      const staffData = this._prepareStaffSheet(data.staffPerformance);
      const staffSheet = XLSX.utils.json_to_sheet(staffData);
      XLSX.utils.book_append_sheet(workbook, staffSheet, 'Staff Performance');
    }

    // Sheet 6: Customer Metrics
    if (data.customerMetrics) {
      const customerData = this._prepareCustomerSheet(data.customerMetrics);
      const customerSheet = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Metrics');
    }

    return this._writeWorkbook(workbook);
  }

  /**
   * Generate inventory report Excel
   */
  async generateInventoryReport(data, options = {}) {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = this._prepareInventorySummarySheet(data);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: Category Breakdown
    if (data.categoryBreakdown) {
      const categoryData = this._prepareCategorySheet(data.categoryBreakdown);
      const categorySheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
    }

    // Sheet 3: Brand Breakdown
    if (data.brandBreakdown) {
      const brandData = this._prepareBrandSheet(data.brandBreakdown);
      const brandSheet = XLSX.utils.json_to_sheet(brandData);
      XLSX.utils.book_append_sheet(workbook, brandSheet, 'Brands');
    }

    // Sheet 4: Inventory Items
    if (data.inventory && data.inventory.length > 0) {
      const inventoryData = this._prepareInventoryItemsSheet(data.inventory);
      const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);
      XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');
    }

    return this._writeWorkbook(workbook);
  }

  /**
   * Generate financial report Excel
   */
  async generateFinancialReport(data, options = {}) {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Financial Summary
    const summaryData = this._prepareFinancialSummarySheet(data);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Financial Summary');

    // Sheet 2: Financial Ratios
    if (data.financialRatios) {
      const ratiosData = this._prepareRatiosSheet(data.financialRatios);
      const ratiosSheet = XLSX.utils.json_to_sheet(ratiosData);
      XLSX.utils.book_append_sheet(workbook, ratiosSheet, 'Ratios');
    }

    // Sheet 3: Cash Flow
    if (data.cashFlow && data.cashFlow.length > 0) {
      const cashFlowData = this._prepareCashFlowSheet(data.cashFlow);
      const cashFlowSheet = XLSX.utils.json_to_sheet(cashFlowData);
      XLSX.utils.book_append_sheet(workbook, cashFlowSheet, 'Cash Flow');
    }

    // Sheet 4: Payment Financials
    if (data.paymentFinancials && data.paymentFinancials.length > 0) {
      const paymentData = this._preparePaymentFinancialSheet(data.paymentFinancials);
      const paymentSheet = XLSX.utils.json_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payment Financials');
    }

    // Sheet 5: Category Profitability
    if (data.categoryProfitability && data.categoryProfitability.length > 0) {
      const categoryData = this._prepareCategoryProfitSheet(data.categoryProfitability);
      const categorySheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Profit');
    }

    return this._writeWorkbook(workbook);
  }

  /**
   * Generate audit report Excel
   */
  async generateAuditReport(data, options = {}) {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = this._prepareAuditSummarySheet(data);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: Audit Logs
    if (data.logs && data.logs.length > 0) {
      const logsData = this._prepareAuditLogsSheet(data.logs);
      const logsSheet = XLSX.utils.json_to_sheet(logsData);
      XLSX.utils.book_append_sheet(workbook, logsSheet, 'Audit Logs');
    }

    // Sheet 3: Breakdowns
    if (data.summary) {
      const breakdownData = this._prepareAuditBreakdownSheet(data.summary);
      const breakdownSheet = XLSX.utils.json_to_sheet(breakdownData);
      XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Breakdowns');
    }

    return this._writeWorkbook(workbook);
  }

  /**
   * Generate store comparison report Excel
   */
  async generateStoreComparisonReport(data, options = {}) {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Comparison Summary
    const summaryData = this._prepareStoreComparisonSummary(data);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Comparison Summary');

    // Sheet 2: Store Details
    if (data.reports && data.reports.length > 0) {
      const detailsData = this._prepareStoreDetailsSheet(data.reports);
      const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
      XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Store Details');
    }

    return this._writeWorkbook(workbook);
  }

  // ============== PRIVATE PREPARATION METHODS ==============

  _prepareSummarySheet(data) {
    const summary = data.summary || {};
    return [
      { Metric: 'Total Revenue', Value: formatCurrency(summary.totalRevenue || 0) },
      { Metric: 'Total Transactions', Value: (summary.totalTransactions || 0).toString() },
      { Metric: 'Average Order Value', Value: formatCurrency(summary.averageOrderValue || 0) },
      { Metric: 'Total Items Sold', Value: (summary.totalItemsSold || 0).toString() },
      { Metric: 'Total Tax', Value: formatCurrency(summary.totalTax || 0) },
      { Metric: 'Total Discount', Value: formatCurrency(summary.totalDiscount || 0) },
      { Metric: 'Unique Customers', Value: (summary.uniqueCustomerCount || 0).toString() },
      { Metric: 'Revenue Per Customer', Value: formatCurrency(summary.revenuePerCustomer || 0) },
      { Metric: 'Max Order Value', Value: formatCurrency(summary.maxOrderValue || 0) },
      { Metric: 'Min Order Value', Value: formatCurrency(summary.minOrderValue || 0) },
    ];
  }

  _prepareTimeSeriesSheet(timeSeries) {
    return timeSeries.map(item => ({
      Date: item._id ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}` : 'N/A',
      Revenue: formatCurrency(item.totalRevenue || 0),
      Transactions: item.totalTransactions || 0,
      'Avg Order Value': formatCurrency(item.averageOrderValue || 0),
      'Total Items': item.totalItems || 0,
    }));
  }

  _preparePaymentSheet(paymentBreakdown) {
    return paymentBreakdown.map(item => ({
      Method: item._id || 'Unknown',
      Count: item.count || 0,
      'Total Amount': formatCurrency(item.totalAmount || 0),
      'Average Amount': formatCurrency(item.averageAmount || 0),
      'Min Amount': formatCurrency(item.minAmount || 0),
      'Max Amount': formatCurrency(item.maxAmount || 0),
      'Percentage': `${(item.percentage || 0).toFixed(1)}%`,
    }));
  }

  _prepareProductSheet(topProducts) {
    return topProducts.map((item, index) => ({
      Rank: index + 1,
      Product: item.productName || 'Unknown',
      SKU: item.sku || 'N/A',
      Category: item.category || 'N/A',
      Brand: item.brand || 'N/A',
      Quantity: item.totalQuantity || 0,
      Revenue: formatCurrency(item.totalRevenue || 0),
      'Avg Price': formatCurrency(item.averagePrice || 0),
      Transactions: item.transactionCount || 0,
      'Stock Status': item.inventory?.status || 'Unknown',
      'Stock Qty': item.inventory?.quantity || 0,
    }));
  }

  _prepareStaffSheet(staffPerformance) {
    return staffPerformance.map((item, index) => ({
      Rank: index + 1,
      Staff: item.staffName || 'Unknown',
      Email: item.staffEmail || 'N/A',
      'Total Sales': formatCurrency(item.totalSales || 0),
      Transactions: item.transactionCount || 0,
      'Avg Order Value': formatCurrency(item.averageOrderValue || 0),
      'Total Items': item.totalItems || 0,
      'Items per Transaction': (item.itemsPerTransaction || 0).toFixed(1),
      'Max Transaction': formatCurrency(item.maxTransaction || 0),
      'Min Transaction': formatCurrency(item.minTransaction || 0),
      'Unique Customers': item.uniqueCustomerCount || 0,
    }));
  }

  _prepareCustomerSheet(customerMetrics) {
    return [
      { Metric: 'New Customers', Value: customerMetrics.newCustomers || 0 },
      { Metric: 'Returning Customers', Value: customerMetrics.returningCustomers || 0 },
      { Metric: 'Total Customers', Value: customerMetrics.totalCustomers || 0 },
      { Metric: 'Customer Retention Rate', Value: `${(customerMetrics.customerRetentionRate || 0).toFixed(1)}%` },
      { Metric: 'Avg Customer Lifetime Value', Value: formatCurrency(customerMetrics.avgCustomerLifetimeValue || 0) },
    ];
  }

  _prepareInventorySummarySheet(data) {
    const summary = data.summary || {};
    return [
      { Metric: 'Total Products', Value: (summary.totalProducts || 0).toString() },
      { Metric: 'Total Stock', Value: (summary.totalStock || 0).toString() },
      { Metric: 'Total Value', Value: formatCurrency(summary.totalValue || 0) },
      { Metric: 'Total Cost Value', Value: formatCurrency(summary.totalCostValue || 0) },
      { Metric: 'Low Stock Items', Value: (summary.lowStock || 0).toString() },
      { Metric: 'Out of Stock', Value: (summary.outOfStock || 0).toString() },
      { Metric: 'Over Stock', Value: (summary.overStock || 0).toString() },
      { Metric: 'Average Stock Value', Value: formatCurrency(summary.averageStockValue || 0) },
      { Metric: 'Stock Turnover Rate', Value: (summary.stockTurnoverRate || 0).toFixed(2) },
      { Metric: 'Days of Inventory', Value: (summary.daysOfInventoryOutstanding || 0).toFixed(0) },
    ];
  }

  _prepareCategorySheet(categoryBreakdown) {
    return Object.entries(categoryBreakdown).map(([category, data]) => ({
      Category: category,
      Products: data.count || 0,
      'Total Stock': data.totalStock || 0,
      'Total Value': formatCurrency(data.totalValue || 0),
      'Low Stock Items': data.lowStockItems || 0,
      'Out of Stock Items': data.outOfStockItems || 0,
      'Avg Unit Price': formatCurrency(data.averageUnitPrice || 0),
      'Avg Item Value': formatCurrency(data.averageItemValue || 0),
    }));
  }

  _prepareBrandSheet(brandBreakdown) {
    return Object.entries(brandBreakdown).map(([brand, data]) => ({
      Brand: brand,
      Products: data.count || 0,
      'Total Stock': data.totalStock || 0,
      'Total Value': formatCurrency(data.totalValue || 0),
    }));
  }

  _prepareInventoryItemsSheet(inventory) {
    return inventory.map(item => ({
      Product: item.product?.name || 'Unknown',
      SKU: item.product?.sku || 'N/A',
      Category: item.product?.category || 'N/A',
      Brand: item.product?.brand || 'N/A',
      Quantity: item.quantity || 0,
      'Reserved Qty': item.reservedQuantity || 0,
      'Available Qty': (item.quantity || 0) - (item.reservedQuantity || 0),
      'Reorder Point': item.reorderPoint || 0,
      'Unit Price': formatCurrency(item.product?.unitPrice || 0),
      'Total Value': formatCurrency(item.value || 0),
      'Status': item.status || 'Unknown',
      'Location': item.warehouseLocation?.aisle || 'N/A',
      'Last Counted': item.lastCounted ? formatDate(item.lastCounted) : 'N/A',
    }));
  }

  _prepareFinancialSummarySheet(data) {
    const summary = data.summary || {};
    return [
      { Metric: 'Total Revenue', Value: formatCurrency(summary.totalRevenue || 0) },
      { Metric: 'Net Revenue', Value: formatCurrency(summary.netRevenue || 0) },
      { Metric: 'Total Tax', Value: formatCurrency(summary.totalTax || 0) },
      { Metric: 'Total Discount', Value: formatCurrency(summary.totalDiscount || 0) },
      { Metric: 'Total Cost', Value: formatCurrency(summary.totalCost || 0) },
      { Metric: 'Gross Profit', Value: formatCurrency(summary.grossProfit || 0) },
      { Metric: 'Gross Margin', Value: `${(summary.grossMargin || 0).toFixed(1)}%` },
      { Metric: 'Net Profit', Value: formatCurrency(summary.netProfit || 0) },
      { Metric: 'Net Profit Margin', Value: `${(summary.netProfitMargin || 0).toFixed(1)}%` },
      { Metric: 'Total Transactions', Value: (summary.transactionCount || 0).toString() },
      { Metric: 'Average Order Value', Value: formatCurrency(summary.averageOrderValue || 0) },
      { Metric: 'Max Revenue', Value: formatCurrency(summary.maxRevenue || 0) },
      { Metric: 'Min Revenue', Value: formatCurrency(summary.minRevenue || 0) },
      { Metric: 'Median Revenue', Value: formatCurrency(summary.medianRevenue || 0) },
    ];
  }

  _prepareRatiosSheet(ratios) {
    return [
      { Ratio: 'Gross Margin', Value: `${(ratios.grossMargin || 0).toFixed(1)}%` },
      { Ratio: 'Tax Rate', Value: `${(ratios.taxRate || 0).toFixed(1)}%` },
      { Ratio: 'Discount Rate', Value: `${(ratios.discountRate || 0).toFixed(1)}%` },
      { Ratio: 'Average Transaction Value', Value: formatCurrency(ratios.averageTransactionValue || 0) },
    ];
  }

  _prepareCashFlowSheet(cashFlow) {
    return cashFlow.map(item => ({
      Period: item._id ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}` : 'N/A',
      'Cash Inflow': formatCurrency(item.cashInflow || 0),
      'Cash Outflow': formatCurrency(item.cashOutflow || 0),
      'Net Cash Flow': formatCurrency(item.netCashFlow || 0),
    }));
  }

  _preparePaymentFinancialSheet(paymentFinancials) {
    return paymentFinancials.map(item => ({
      Method: item._id || 'Unknown',
      Count: item.count || 0,
      'Total Amount': formatCurrency(item.totalAmount || 0),
      'Average Amount': formatCurrency(item.averageAmount || 0),
      'Min Amount': formatCurrency(item.minAmount || 0),
      'Max Amount': formatCurrency(item.maxAmount || 0),
      'Percentage': `${(item.percentage || 0).toFixed(1)}%`,
    }));
  }

  _prepareCategoryProfitSheet(categoryProfitability) {
    return categoryProfitability.map(item => ({
      Category: item._id || 'Uncategorized',
      Revenue: formatCurrency(item.totalRevenue || 0),
      Cost: formatCurrency(item.totalCost || 0),
      'Gross Profit': formatCurrency(item.grossProfit || 0),
      Margin: `${(item.margin || 0).toFixed(1)}%`,
      Quantity: item.totalQuantity || 0,
      Transactions: item.transactionCount || 0,
    }));
  }

  _prepareAuditSummarySheet(data) {
    const summary = data.summary || {};
    return [
      { Metric: 'Total Actions', Value: (summary.totalCount || 0).toString() },
      { Metric: 'Unique Actors', Value: (summary.topActors?.length || 0).toString() },
    ];
  }

  _prepareAuditLogsSheet(logs) {
    return logs.map(log => ({
      Date: formatDate(log.timestamp),
      Time: formatTime(log.timestamp),
      Action: log.action || 'Unknown',
      Resource: log.resourceType || 'Unknown',
      Severity: log.severity || 'INFO',
      Actor: log.actorId?.firstName ? `${log.actorId.firstName} ${log.actorId.lastName}` : 'Unknown',
      Role: log.actorId?.role || 'Unknown',
      'Resource ID': log.resourceId || 'N/A',
      'Store ID': log.storeId || 'N/A',
      'IP Address': log.details?.metadata?.ipAddress || 'N/A',
      Reason: log.details?.metadata?.reason || 'N/A',
    }));
  }

  _prepareAuditBreakdownSheet(summary) {
    const rows = [];
    
    // Action breakdown
    if (summary.actionBreakdown) {
      summary.actionBreakdown.forEach(item => {
        rows.push({
          Type: 'Action',
          Name: item._id || 'Unknown',
          Count: item.count || 0,
        });
      });
    }
    
    // Severity breakdown
    if (summary.severityBreakdown) {
      summary.severityBreakdown.forEach(item => {
        rows.push({
          Type: 'Severity',
          Name: item._id || 'Unknown',
          Count: item.count || 0,
        });
      });
    }
    
    // Resource breakdown
    if (summary.resourceBreakdown) {
      summary.resourceBreakdown.forEach(item => {
        rows.push({
          Type: 'Resource',
          Name: item._id || 'Unknown',
          Count: item.count || 0,
        });
      });
    }
    
    return rows;
  }

  _prepareStoreComparisonSummary(data) {
    const summary = data.comparativeSummary || {};
    return [
      { Metric: 'Total Revenue', Value: formatCurrency(summary.totalRevenue || 0) },
      { Metric: 'Total Transactions', Value: (summary.totalTransactions || 0).toString() },
      { Metric: 'Average Revenue per Store', Value: formatCurrency(summary.averageRevenuePerStore || 0) },
      { Metric: 'Average Transactions per Store', Value: (summary.averageTransactionsPerStore || 0).toString() },
      { Metric: 'Best Performing Store', Value: summary.bestPerformingStore?.storeName || 'N/A' },
      { Metric: 'Best Store Revenue', Value: formatCurrency(summary.bestPerformingStore?.revenue || 0) },
      { Metric: 'Number of Stores', Value: (summary.storeCount || 0).toString() },
    ];
  }

  _prepareStoreDetailsSheet(reports) {
    return reports.map((store, index) => ({
      Rank: index + 1,
      Store: store.storeName || 'Unknown',
      Code: store.storeCode || 'N/A',
      Revenue: formatCurrency(store.keyMetrics?.revenue || 0),
      Transactions: store.keyMetrics?.transactions || 0,
      'Avg Order Value': formatCurrency(store.keyMetrics?.averageOrderValue || 0),
      'Total Items': store.keyMetrics?.totalItems || 0,
      'Inventory Value': formatCurrency(store.keyMetrics?.inventoryValue || 0),
      'Low Stock Items': store.keyMetrics?.lowStockItems || 0,
      'Profit Margin': `${(store.keyMetrics?.profitMargin || 0).toFixed(1)}%`,
    }));
  }

  // ============== UTILITY METHODS ==============

  _writeWorkbook(workbook) {
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Save Excel to file
   */
  async saveExcel(buffer, filename, directory = 'reports') {
    const dir = path.join(__dirname, '../../', directory);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }

  /**
   * Generate a unique filename for Excel reports
   */
  generateFilename(type, filters = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storeId = filters.storeId || 'all';
    return `${type}_${storeId}_${timestamp}.xlsx`;
  }
}

module.exports = new ExcelGenerator();