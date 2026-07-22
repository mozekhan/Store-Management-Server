// services/pdfExportService.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { formatCurrency, formatDate } = require("../utils/formatters");

class PDFExportService {
  constructor() {
    this.tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Export sales report as PDF
   */
  async exportSalesReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || "A4",
          margin: options.margin || 50,
          info: {
            Title: "Sales Report",
            Author: "POS System",
            Subject: "Sales Report",
          },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        this._addHeader(doc, "Sales Report", data.filters);
        this._addSummarySection(doc, data.summary);

        // Add time series chart (simplified as table)
        this._addTimeSeriesSection(doc, data.timeSeries);

        // Add payment breakdown
        this._addPaymentBreakdown(doc, data.paymentBreakdown);

        // Add top products
        this._addTopProductsSection(doc, data.topProducts);

        // Add staff performance
        this._addStaffPerformanceSection(doc, data.staffPerformance);

        // Add growth metrics
        this._addGrowthMetricsSection(doc, data.growthMetrics);

        // Add footer
        this._addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export inventory report as PDF
   */
  async exportInventoryReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || "A4",
          margin: options.margin || 50,
          info: {
            Title: "Inventory Report",
            Author: "POS System",
            Subject: "Inventory Report",
          },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        this._addHeader(doc, "Inventory Report", data.filters);
        this._addInventorySummary(doc, data.summary);
        this._addCategoryBreakdown(doc, data.categoryBreakdown);
        this._addStockStatus(doc, data.stockStatusDistribution);
        this._addInventoryList(doc, data.inventory);
        this._addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export financial report as PDF
   */
  async exportFinancialReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || "A4",
          margin: options.margin || 50,
          info: {
            Title: "Financial Report",
            Author: "POS System",
            Subject: "Financial Report",
          },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        this._addHeader(doc, "Financial Report", data.filters);
        this._addFinancialSummary(doc, data.summary);
        this._addFinancialRatios(doc, data.financialRatios);
        this._addPaymentFinancials(doc, data.paymentFinancials);
        this._addRefundAnalysis(doc, data.refundAnalysis);
        this._addCashFlow(doc, data.cashFlow);
        this._addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export audit report as PDF
   */
  async exportAuditReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || "A4",
          margin: options.margin || 50,
          info: {
            Title: "Audit Report",
            Author: "POS System",
            Subject: "Audit Report",
          },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        this._addHeader(doc, "Audit Report", data.filters);
        this._addAuditSummary(doc, data.summary);
        this._addAuditLogs(doc, data.logs);
        this._addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }


/**
 * Export store comparison report as PDF
 */
async exportStoreComparisonReport(data, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: options.size || 'A4',
        margin: options.margin || 50,
        info: {
          Title: 'Store Comparison Report',
          Author: 'POS System',
          Subject: 'Store Comparison Report',
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      this._addHeader(doc, 'Store Comparison Report', data.filters);
      this._addStoreComparisonSummary(doc, data.comparativeSummary);
      this._addStoreComparisonDetail(doc, data.reports);
      this._addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Add these helper methods for store comparison
_addStoreComparisonSummary(doc, summary) {
  if (!summary) return;

  doc.font('Helvetica-Bold')
     .fontSize(16)
     .text('Comparative Summary')
     .moveDown();

  const summaryData = [
    ['Total Revenue', formatCurrency(summary.totalRevenue || 0)],
    ['Total Transactions', (summary.totalTransactions || 0).toString()],
    ['Average Revenue per Store', formatCurrency(summary.averageRevenuePerStore || 0)],
    ['Average Transactions per Store', (summary.averageTransactionsPerStore || 0).toString()],
    ['Best Performing Store', summary.bestPerformingStore?.storeName || 'N/A'],
    ['Best Store Revenue', formatCurrency(summary.bestPerformingStore?.revenue || 0)],
    ['Number of Stores', (summary.storeCount || 0).toString()],
  ];

  this._addTable(doc, summaryData, ['Metric', 'Value']);
  doc.moveDown();
}

_addStoreComparisonDetail(doc, reports) {
  if (!reports || reports.length === 0) return;

  doc.addPage();
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .text('Store Performance Details')
     .moveDown();

  const tableData = reports.map((store, index) => [
    `#${index + 1}`,
    store.storeName || 'Unknown',
    store.storeCode || 'N/A',
    formatCurrency(store.keyMetrics?.revenue || 0),
    (store.keyMetrics?.transactions || 0).toString(),
    formatCurrency(store.keyMetrics?.averageOrderValue || 0),
    `${(store.keyMetrics?.profitMargin || 0).toFixed(1)}%`,
    formatCurrency(store.keyMetrics?.inventoryValue || 0),
  ]);

  this._addTable(doc, tableData, ['Rank', 'Store', 'Code', 'Revenue', 'Txns', 'Avg Order', 'Margin', 'Inventory']);
  doc.moveDown();
}

  // ============== PRIVATE SECTION METHODS ==============

  _addHeader(doc, title, filters) {
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .text(title, { align: "center" })
      .moveDown();

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`Generated: ${formatDate(new Date())}`, { align: "center" });

    if (filters?.period) {
      doc.text(
        `Period: ${formatDate(filters.period.startDate)} - ${formatDate(filters.period.endDate)}`,
        { align: "center" },
      );
    }
    if (filters?.storeId) {
      doc.text(`Store ID: ${filters.storeId}`, { align: "center" });
    }

    doc.moveDown();
    this._addDivider(doc);
  }

  _addSummarySection(doc, summary) {
    if (!summary) return;

    doc.font("Helvetica-Bold").fontSize(16).text("Summary").moveDown();

    const summaryData = [
      ["Total Revenue", formatCurrency(summary.totalRevenue || 0)],
      ["Total Transactions", (summary.totalTransactions || 0).toString()],
      ["Average Order Value", formatCurrency(summary.averageOrderValue || 0)],
      ["Total Items Sold", (summary.totalItemsSold || 0).toString()],
      ["Total Tax", formatCurrency(summary.totalTax || 0)],
      ["Total Discount", formatCurrency(summary.totalDiscount || 0)],
      ["Unique Customers", (summary.uniqueCustomerCount || 0).toString()],
      ["Revenue Per Customer", formatCurrency(summary.revenuePerCustomer || 0)],
    ];

    this._addTable(doc, summaryData, ["Metric", "Value"]);
    doc.moveDown();
  }

  _addTimeSeriesSection(doc, timeSeries) {
    if (!timeSeries || timeSeries.length === 0) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Time Series Analysis")
      .moveDown();

    const tableData = timeSeries.slice(0, 30).map((item) => {
      const date = item._id
        ? `${item._id.year || ""}-${String(item._id.month || "").padStart(2, "0")}-${String(item._id.day || "").padStart(2, "0")}`
        : "N/A";
      return [
        date,
        formatCurrency(item.totalRevenue || 0),
        (item.totalTransactions || 0).toString(),
        formatCurrency(item.averageOrderValue || 0),
      ];
    });

    this._addTable(doc, tableData, [
      "Date",
      "Revenue",
      "Transactions",
      "Avg Order",
    ]);
    doc.moveDown();
  }

  _addPaymentBreakdown(doc, paymentBreakdown) {
    if (!paymentBreakdown || paymentBreakdown.length === 0) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Payment Breakdown")
      .moveDown();

    const tableData = paymentBreakdown.map((item) => [
      item._id || "Unknown",
      (item.count || 0).toString(),
      formatCurrency(item.totalAmount || 0),
      `${(item.percentage || 0).toFixed(1)}%`,
      formatCurrency(item.averageAmount || 0),
    ]);

    this._addTable(doc, tableData, [
      "Method",
      "Count",
      "Total",
      "Percentage",
      "Average",
    ]);
    doc.moveDown();
  }

  _addTopProductsSection(doc, topProducts) {
    if (!topProducts || topProducts.length === 0) return;

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(16).text("Top Products").moveDown();

    const tableData = topProducts
      .slice(0, 20)
      .map((item, index) => [
        `#${index + 1}`,
        item.productName || "Unknown",
        item.sku || "N/A",
        (item.totalQuantity || 0).toString(),
        formatCurrency(item.totalRevenue || 0),
      ]);

    this._addTable(doc, tableData, [
      "Rank",
      "Product",
      "SKU",
      "Quantity",
      "Revenue",
    ]);
    doc.moveDown();
  }

  _addStaffPerformanceSection(doc, staffPerformance) {
    if (!staffPerformance || staffPerformance.length === 0) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Staff Performance")
      .moveDown();

    const tableData = staffPerformance.map((item, index) => [
      `#${index + 1}`,
      item.staffName || "Unknown",
      formatCurrency(item.totalSales || 0),
      (item.transactionCount || 0).toString(),
      formatCurrency(item.averageOrderValue || 0),
    ]);

    this._addTable(doc, tableData, [
      "Rank",
      "Staff",
      "Total Sales",
      "Transactions",
      "Avg Order",
    ]);
    doc.moveDown();
  }

  _addGrowthMetricsSection(doc, growthMetrics) {
    if (!growthMetrics) return;

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(16).text("Growth Metrics").moveDown();

    const growthData = [
      [
        "Period over Period Growth",
        `${(growthMetrics.periodOverPeriodGrowth * 100).toFixed(1)}%`,
      ],
      [
        "Average Growth Rate",
        `${(growthMetrics.averageGrowthRate * 100).toFixed(1)}%`,
      ],
      ["Trend", growthMetrics.trend || "Stable"],
    ];

    this._addTable(doc, growthData, ["Metric", "Value"]);
    doc.moveDown();
  }

  _addInventorySummary(doc, summary) {
    if (!summary) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Inventory Summary")
      .moveDown();

    const summaryData = [
      ["Total Products", (summary.totalProducts || 0).toString()],
      ["Total Stock", (summary.totalStock || 0).toString()],
      ["Total Value", formatCurrency(summary.totalValue || 0)],
      ["Low Stock Items", (summary.lowStock || 0).toString()],
      ["Out of Stock", (summary.outOfStock || 0).toString()],
      ["Over Stock", (summary.overStock || 0).toString()],
      ["Average Stock Value", formatCurrency(summary.averageStockValue || 0)],
    ];

    this._addTable(doc, summaryData, ["Metric", "Value"]);
    doc.moveDown();
  }

  _addCategoryBreakdown(doc, categoryBreakdown) {
    if (!categoryBreakdown || Object.keys(categoryBreakdown).length === 0)
      return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Category Breakdown")
      .moveDown();

    const tableData = Object.entries(categoryBreakdown).map(
      ([category, data]) => [
        category,
        (data.count || 0).toString(),
        (data.totalStock || 0).toString(),
        formatCurrency(data.totalValue || 0),
        (data.lowStockItems || 0).toString(),
        (data.outOfStockItems || 0).toString(),
      ],
    );

    this._addTable(doc, tableData, [
      "Category",
      "Products",
      "Stock",
      "Value",
      "Low Stock",
      "Out Stock",
    ]);
    doc.moveDown();
  }

  _addStockStatus(doc, stockStatus) {
    if (!stockStatus) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Stock Status Distribution")
      .moveDown();

    const statusData = [
      ["In Stock", (stockStatus.inStock || 0).toString()],
      ["Low Stock", (stockStatus.lowStock || 0).toString()],
      ["Out of Stock", (stockStatus.outOfStock || 0).toString()],
      ["Over Stock", (stockStatus.overStock || 0).toString()],
    ];

    this._addTable(doc, statusData, ["Status", "Count"]);
    doc.moveDown();
  }

  _addInventoryList(doc, inventory) {
    if (!inventory || inventory.length === 0) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Inventory Details")
      .moveDown();

    const tableData = inventory
      .slice(0, 30)
      .map((item) => [
        item.product?.name || "Unknown",
        item.product?.sku || "N/A",
        (item.quantity || 0).toString(),
        formatCurrency(item.value || 0),
        item.status || "Unknown",
      ]);

    this._addTable(doc, tableData, [
      "Product",
      "SKU",
      "Quantity",
      "Value",
      "Status",
    ]);
    doc.moveDown();

    if (inventory.length > 30) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .text(`* Showing first 30 of ${inventory.length} items`, {
          align: "center",
        });
    }
  }

  _addFinancialSummary(doc, summary) {
    if (!summary) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Financial Summary")
      .moveDown();

    const summaryData = [
      ["Total Revenue", formatCurrency(summary.totalRevenue || 0)],
      ["Total Tax", formatCurrency(summary.totalTax || 0)],
      ["Total Subtotal", formatCurrency(summary.totalSubtotal || 0)],
      ["Total Discount", formatCurrency(summary.totalDiscount || 0)],
      ["Total Cost", formatCurrency(summary.totalCost || 0)],
      ["Gross Profit", formatCurrency(summary.grossProfit || 0)],
      ["Gross Margin", `${(summary.grossMargin || 0).toFixed(1)}%`],
      ["Net Profit", formatCurrency(summary.netProfit || 0)],
      ["Net Profit Margin", `${(summary.netProfitMargin || 0).toFixed(1)}%`],
      ["Total Transactions", (summary.transactionCount || 0).toString()],
      ["Average Order Value", formatCurrency(summary.averageOrderValue || 0)],
      ["Max Revenue", formatCurrency(summary.maxRevenue || 0)],
      ["Min Revenue", formatCurrency(summary.minRevenue || 0)],
    ];

    this._addTable(doc, summaryData, ["Metric", "Value"]);
    doc.moveDown();
  }

  _addFinancialRatios(doc, ratios) {
    if (!ratios) return;

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(16).text("Financial Ratios").moveDown();

    const ratioData = [
      ["Gross Margin", `${(ratios.grossMargin || 0).toFixed(1)}%`],
      ["Tax Rate", `${(ratios.taxRate || 0).toFixed(1)}%`],
      ["Discount Rate", `${(ratios.discountRate || 0).toFixed(1)}%`],
      [
        "Average Transaction Value",
        formatCurrency(ratios.averageTransactionValue || 0),
      ],
    ];

    this._addTable(doc, ratioData, ["Ratio", "Value"]);
    doc.moveDown();
  }

  _addPaymentFinancials(doc, paymentFinancials) {
    if (!paymentFinancials || paymentFinancials.length === 0) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Payment Method Financials")
      .moveDown();

    const tableData = paymentFinancials.map((item) => [
      item._id || "Unknown",
      (item.count || 0).toString(),
      formatCurrency(item.totalAmount || 0),
      formatCurrency(item.averageAmount || 0),
      `${(item.percentage || 0).toFixed(1)}%`,
    ]);

    this._addTable(doc, tableData, [
      "Method",
      "Count",
      "Total",
      "Average",
      "Percentage",
    ]);
    doc.moveDown();
  }

  _addRefundAnalysis(doc, refunds) {
    if (!refunds) return;

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(16).text("Refund Analysis").moveDown();

    const refundData = [
      ["Total Refunded", formatCurrency(refunds.totalRefunded || 0)],
      ["Refund Count", (refunds.refundCount || 0).toString()],
      ["Average Refund", formatCurrency(refunds.averageRefund || 0)],
      ["Max Refund", formatCurrency(refunds.maxRefund || 0)],
      ["Min Refund", formatCurrency(refunds.minRefund || 0)],
      ["Refund Rate", `${(refunds.refundRate || 0).toFixed(1)}%`],
    ];

    this._addTable(doc, refundData, ["Metric", "Value"]);
    doc.moveDown();
  }

  _addCashFlow(doc, cashFlow) {
    if (!cashFlow || cashFlow.length === 0) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Cash Flow Analysis")
      .moveDown();

    const tableData = cashFlow.slice(0, 24).map((item) => {
      const date = item._id
        ? `${item._id.year || ""}-${String(item._id.month || "").padStart(2, "0")}`
        : "N/A";
      return [
        date,
        formatCurrency(item.cashInflow || 0),
        formatCurrency(item.cashOutflow || 0),
        formatCurrency(item.netCashFlow || 0),
      ];
    });

    this._addTable(doc, tableData, ["Period", "Inflow", "Outflow", "Net Flow"]);
    doc.moveDown();
  }

  _addAuditSummary(doc, summary) {
    if (!summary) return;

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(16).text("Audit Summary").moveDown();

    const summaryData = [
      ["Total Actions", (summary.totalCount || 0).toString()],
      ["Unique Actors", (summary.topActors?.length || 0).toString()],
    ];

    this._addTable(doc, summaryData, ["Metric", "Value"]);
    doc.moveDown();

    // Action breakdown
    if (summary.actionBreakdown && summary.actionBreakdown.length > 0) {
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Actions by Type")
        .moveDown();

      const actionData = summary.actionBreakdown.map((item) => [
        item._id || "Unknown",
        (item.count || 0).toString(),
      ]);
      this._addTable(doc, actionData, ["Action", "Count"]);
      doc.moveDown();
    }

    // Severity breakdown
    if (summary.severityBreakdown && summary.severityBreakdown.length > 0) {
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Actions by Severity")
        .moveDown();

      const severityData = summary.severityBreakdown.map((item) => [
        item._id || "Unknown",
        (item.count || 0).toString(),
      ]);
      this._addTable(doc, severityData, ["Severity", "Count"]);
      doc.moveDown();
    }
  }

  _addAuditLogs(doc, logs) {
    if (!logs || logs.length === 0) return;

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Audit Log Details")
      .moveDown();

    const tableData = logs
      .slice(0, 30)
      .map((log) => [
        formatDate(log.timestamp),
        log.action || "Unknown",
        log.resourceType || "Unknown",
        log.severity || "INFO",
      ]);

    this._addTable(doc, tableData, [
      "Timestamp",
      "Action",
      "Resource",
      "Severity",
    ]);
    doc.moveDown();

    if (logs.length > 30) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`* Showing first 30 of ${logs.length} audit logs`, {
          align: "center",
        });
    }
  }

  _addDivider(doc) {
    doc
      .moveDown()
      .strokeColor("#cccccc")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke()
      .moveDown();
  }

  _addTable(doc, data, headers) {
    if (!data || data.length === 0) return;

    const pageWidth = doc.page.width;
    const margin = 50;
    const availableWidth = pageWidth - margin * 2;
    const columnCount = headers.length;
    const columnWidth = availableWidth / columnCount;

    // Headers
    doc.font("Helvetica-Bold").fontSize(10);

    let y = doc.y;
    headers.forEach((header, i) => {
      doc.text(header, margin + i * columnWidth, y, {
        width: columnWidth,
        align: "left",
      });
    });

    y = doc.y + 10;
    doc
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .stroke();
    y += 5;

    // Data rows
    doc.font("Helvetica").fontSize(12);

    data.forEach((row, rowIndex) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;

        // Re-add headers on new page
        doc.font("Helvetica-Bold").fontSize(10);

        headers.forEach((header, i) => {
          doc.text(header, margin + i * columnWidth, y, {
            width: columnWidth,
            align: "left",
          });
        });

        y = doc.y + 10;
        doc
          .moveTo(margin, y)
          .lineTo(pageWidth - margin, y)
          .stroke();
        y += 5;

        doc.font("Helvetica").fontSize(12);
      }

      row.forEach((cell, i) => {
        doc.text(cell || "", margin + i * columnWidth, y, {
          width: columnWidth,
          align: "left",
        });
      });

      y = doc.y + 15;
    });

    doc.moveDown();
  }

  _addFooter(doc) {
    
    const range = doc.bufferedPageRange();

    for (let page = range.start; page < range.start + range.count; page++) {
      doc.switchToPage(page);

      doc.fontSize(8);

      doc.text(
        `Page ${page - range.start + 1} of ${range.count}`,
        50,
        doc.page.height - 40,
        {
          align: "center",
          width: doc.page.width - 100,
        },
      );
    }
  }

  /**
   * Save PDF to file
   */
  async savePDF(buffer, filename, directory = "reports") {
    const dir = path.join(__dirname, "../../", directory);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }

  /**
   * Generate a unique filename for reports
   */
  generateFilename(type, filters = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const storeId = filters.storeId || "all";
    return `${type}_${storeId}_${timestamp}.pdf`;
  }
}

module.exports = new PDFExportService();
