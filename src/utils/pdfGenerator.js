// const PDFDocument = require('pdfkit');
// const fs = require('fs');
// const path = require('path');

// class PDFGenerator {
//   constructor() {
//     this.fonts = {
//       regular: 'Helvetica',
//       bold: 'Helvetica-Bold'
//     };
//   }

//   async generateReceipt(data, options = {}) {
//     return new Promise((resolve, reject) => {
//       try {
//         const doc = new PDFDocument({
//           size: options.size || 'A6',
//           margin: options.margin || 20
//         });

//         const chunks = [];
//         doc.on('data', chunk => chunks.push(chunk));
//         doc.on('end', () => resolve(Buffer.concat(chunks)));

//         // Header
//         doc.font(this.fonts.bold)
//            .fontSize(14)
//            .text(data.storeName || 'Store', { align: 'center' })
//            .font(this.fonts.regular)
//            .fontSize(10)
//            .text(data.title || 'Receipt', { align: 'center' })
//            .moveDown();

//         // Store details
//         doc.fontSize(8);
//         if (data.storeAddress) {
//           doc.text(data.storeAddress, { align: 'center' });
//         }
//         if (data.storePhone) {
//           doc.text(`Tel: ${data.storePhone}`, { align: 'center' });
//         }
//         doc.moveDown();

//         // Transaction details
//         doc.font(this.fonts.bold)
//            .fontSize(8);
        
//         const fields = [
//           { label: 'Date', value: data.date },
//           { label: 'Transaction', value: data.transactionNumber },
//           { label: 'Attendant', value: data.attendant }
//         ];

//         fields.forEach(field => {
//           if (field.value) {
//             doc.text(`${field.label}: ${field.value}`);
//           }
//         });

//         doc.moveDown();

//         // Items
//         if (data.items && data.items.length > 0) {
//           doc.font(this.fonts.bold);
//           doc.text('Item', 50, doc.y, { width: 150 })
//              .text('Qty', 200, doc.y, { width: 40, align: 'center' })
//              .text('Price', 250, doc.y, { width: 60, align: 'right' })
//              .text('Total', 320, doc.y, { width: 60, align: 'right' })
//              .moveDown();

//           doc.font(this.fonts.regular);
          
//           data.items.forEach(item => {
//             const y = doc.y;
//             doc.text(item.name.substring(0, 30), 50, y, { width: 150 })
//                .text(item.quantity.toString(), 200, y, { width: 40, align: 'center' })
//                .text(`$${item.unitPrice.toFixed(2)}`, 250, y, { width: 60, align: 'right' })
//                .text(`$${item.totalPrice.toFixed(2)}`, 320, y, { width: 60, align: 'right' })
//                .moveDown();
//           });
//         }

//         doc.moveDown();

//         // Totals
//         doc.font(this.fonts.bold);
//         if (data.subtotal !== undefined) {
//           doc.text(`Subtotal: $${data.subtotal.toFixed(2)}`, { align: 'right' });
//         }
//         if (data.tax !== undefined) {
//           doc.text(`Tax: $${data.tax.toFixed(2)}`, { align: 'right' });
//         }
//         if (data.total !== undefined) {
//           doc.text(`Total: $${data.total.toFixed(2)}`, { align: 'right' });
//         }

//         doc.moveDown();

//         // Payment details
//         if (data.paymentMethod) {
//           doc.font(this.fonts.regular)
//              .fontSize(8)
//              .text(`Payment Method: ${data.paymentMethod}`);
//         }
//         if (data.amountPaid !== undefined) {
//           doc.text(`Amount Paid: $${data.amountPaid.toFixed(2)}`);
//         }
//         if (data.change !== undefined) {
//           doc.text(`Change: $${data.change.toFixed(2)}`);
//         }

//         doc.moveDown();

//         // QR Code placeholder
//         if (data.qrCode) {
//           doc.text('Scan QR Code:', { align: 'center' });
//           // QR code would be added here using a QR library
//         }

//         doc.moveDown();

//         // Footer
//         doc.fontSize(7)
//            .text(data.footer || 'Thank you for your purchase!', { align: 'center' })
//            .text(data.additionalInfo || '', { align: 'center' });

//         doc.end();
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   async generateInvoice(data, options = {}) {
//     return new Promise((resolve, reject) => {
//       try {
//         const doc = new PDFDocument({
//           size: options.size || 'A4',
//           margin: options.margin || 50
//         });

//         const chunks = [];
//         doc.on('data', chunk => chunks.push(chunk));
//         doc.on('end', () => resolve(Buffer.concat(chunks)));

//         // Header with logo placeholder
//         doc.font(this.fonts.bold)
//            .fontSize(20)
//            .text(data.companyName || 'Company Name', { align: 'center' })
//            .font(this.fonts.regular)
//            .fontSize(12)
//            .text('INVOICE', { align: 'center' })
//            .moveDown();

//         // Invoice details
//         const invoiceInfo = [
//           { label: 'Invoice #', value: data.invoiceNumber },
//           { label: 'Date', value: data.date },
//           { label: 'Transaction #', value: data.transactionNumber }
//         ];

//         let y = doc.y;
//         invoiceInfo.forEach(info => {
//           doc.font(this.fonts.bold)
//              .fontSize(10)
//              .text(`${info.label}: `, 50, y, { continued: true })
//              .font(this.fonts.regular)
//              .text(info.value || '');
//           y = doc.y + 5;
//         });

//         doc.moveDown();

//         // Bill to
//         if (data.customer) {
//           doc.font(this.fonts.bold)
//              .fontSize(10)
//              .text('Bill To:');
//           doc.font(this.fonts.regular)
//              .fontSize(9)
//              .text(data.customer.name || '')
//              .text(data.customer.address || '')
//              .text(data.customer.email || '');
//           doc.moveDown();
//         }

//         // Items table header
//         const tableTop = doc.y;
//         const tableHeaders = ['#', 'Description', 'Qty', 'Unit Price', 'Total'];
//         const columnWidths = [30, 200, 50, 80, 80];
//         let x = 50;

//         doc.font(this.fonts.bold)
//            .fontSize(10);
        
//         tableHeaders.forEach((header, i) => {
//           doc.text(header, x, tableTop, { width: columnWidths[i], align: i === 0 ? 'left' : 'center' });
//           x += columnWidths[i];
//         });

//         doc.moveDown();

//         // Items
//         let rowY = doc.y;
//         doc.font(this.fonts.regular)
//            .fontSize(9);

//         data.items.forEach((item, index) => {
//           x = 50;
//           const fields = [
//             (index + 1).toString(),
//             item.name.substring(0, 30),
//             item.quantity.toString(),
//             `$${item.unitPrice.toFixed(2)}`,
//             `$${item.totalPrice.toFixed(2)}`
//           ];

//           fields.forEach((field, i) => {
//             doc.text(field, x, rowY, { 
//               width: columnWidths[i], 
//               align: i === 0 ? 'left' : 'center' 
//             });
//             x += columnWidths[i];
//           });

//           rowY = doc.y + 5;
//           if (rowY > doc.page.height - 100) {
//             doc.addPage();
//             rowY = 50;
//           }
//         });

//         doc.moveDown();

//         // Totals
//         const totalsY = doc.y;
//         const totalsX = doc.page.width - 150;
        
//         doc.font(this.fonts.bold);
//         const totals = [
//           { label: 'Subtotal:', value: data.subtotal },
//           { label: 'Tax:', value: data.tax },
//           { label: 'Total:', value: data.total }
//         ];

//         totals.forEach(total => {
//           doc.text(total.label, totalsX, totalsY, { width: 60, align: 'right' })
//              .text(`$${total.value.toFixed(2)}`, totalsX + 70, totalsY, { width: 60, align: 'right' });
//           totalsY + 15;
//         });

//         doc.moveDown(2);

//         // Footer
//         doc.font(this.fonts.regular)
//            .fontSize(8)
//            .text(data.footer || 'Thank you for your business!', { align: 'center' });

//         doc.end();
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   async savePDF(buffer, filename, directory = 'receipts') {
//     const dir = path.join(__dirname, '../../', directory);
//     if (!fs.existsSync(dir)) {
//       fs.mkdirSync(dir, { recursive: true });
//     }

//     const filepath = path.join(dir, filename);
//     fs.writeFileSync(filepath, buffer);
//     return filepath;
//   }
// }

// module.exports = new PDFGenerator();

























// utils/pdfGenerator.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { formatCurrency, formatDate, formatTime } = require('./formatters');

class PDFGenerator {
  constructor() {
    this.fonts = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique',
    };
    this.colors = {
      primary: '#2563EB',
      success: '#16A34A',
      warning: '#F59E0B',
      error: '#DC2626',
      gray: '#6B7280',
      lightGray: '#F3F4F6',
      border: '#E5E7EB',
      white: '#FFFFFF',
      black: '#111827',
    };
  }

  /**
   * Generate a sales report PDF
   */
  async generateSalesReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || 'A4',
          margin: options.margin || 50,
          info: {
            Title: 'Sales Report',
            Author: 'POS System',
            Subject: 'Sales Report',
            Keywords: 'sales, report, pos',
          },
          bufferPages: true,
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Add header with logo placeholder
        this._addReportHeader(doc, 'Sales Report', data.filters);
        
        // Add summary section
        this._addSummarySection(doc, data.summary);
        
        // Add growth metrics
        if (data.growthMetrics) {
          this._addGrowthMetrics(doc, data.growthMetrics);
        }
        
        // Add time series chart
        if (data.timeSeries && data.timeSeries.length > 0) {
          this._addTimeSeriesChart(doc, data.timeSeries);
        }
        
        // Add payment breakdown
        if (data.paymentBreakdown && data.paymentBreakdown.length > 0) {
          this._addPaymentBreakdown(doc, data.paymentBreakdown);
        }
        
        // Add top products
        if (data.topProducts && data.topProducts.length > 0) {
          this._addTopProducts(doc, data.topProducts);
        }
        
        // Add staff performance
        if (data.staffPerformance && data.staffPerformance.length > 0) {
          this._addStaffPerformance(doc, data.staffPerformance);
        }
        
        // Add customer metrics
        if (data.customerMetrics) {
          this._addCustomerMetrics(doc, data.customerMetrics);
        }
        
        // Add footer
        this._addReportFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate an inventory report PDF
   */
  async generateInventoryReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || 'A4',
          margin: options.margin || 50,
          info: {
            Title: 'Inventory Report',
            Author: 'POS System',
            Subject: 'Inventory Report',
          },
          bufferPages: true,
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        this._addReportHeader(doc, 'Inventory Report', data.filters);
        this._addInventorySummary(doc, data.summary);
        this._addCategoryBreakdown(doc, data.categoryBreakdown);
        this._addBrandBreakdown(doc, data.brandBreakdown);
        this._addStockStatus(doc, data.stockStatusDistribution);
        this._addValueDistribution(doc, data.valueDistribution);
        this._addInventoryList(doc, data.inventory);
        this._addReportFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a financial report PDF
   */
  async generateFinancialReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || 'A4',
          margin: options.margin || 50,
          info: {
            Title: 'Financial Report',
            Author: 'POS System',
            Subject: 'Financial Report',
          },
          bufferPages: true,
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        this._addReportHeader(doc, 'Financial Report', data.filters);
        this._addFinancialSummary(doc, data.summary);
        this._addFinancialRatios(doc, data.financialRatios);
        this._addProfitabilityMetrics(doc, data.metrics?.profitability);
        this._addPaymentFinancials(doc, data.paymentFinancials);
        this._addRefundAnalysis(doc, data.refundAnalysis);
        this._addCategoryProfitability(doc, data.categoryProfitability);
        this._addCashFlow(doc, data.cashFlow);
        this._addCustomerLTV(doc, data.customerLTV);
        this._addReportFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate an audit report PDF
   */
  async generateAuditReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || 'A4',
          margin: options.margin || 50,
          info: {
            Title: 'Audit Report',
            Author: 'POS System',
            Subject: 'Audit Report',
          },
          bufferPages: true,
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        this._addReportHeader(doc, 'Audit Report', data.filters);
        this._addAuditSummary(doc, data.summary);
        this._addAuditBreakdowns(doc, data.summary);
        this._addAuditLogs(doc, data.logs);
        this._addReportFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a store comparison report PDF
   */
  async generateStoreComparisonReport(data, options = {}) {
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
          bufferPages: true,
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        this._addReportHeader(doc, 'Store Comparison Report', data.filters);
        this._addStoreComparisonSummary(doc, data.comparativeSummary);
        this._addStoreComparisonDetail(doc, data.reports);
        this._addReportFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== PRIVATE SECTION METHODS ==============

  _addReportHeader(doc, title, filters) {
    // Logo placeholder
    doc.rect(50, 30, 60, 30)
       .fill(this.colors.primary);
    doc.font(this.fonts.bold)
       .fontSize(10)
       .fillColor(this.colors.white)
       .text('POS', 55, 42, { width: 50, align: 'center' });

    // Title
    doc.fillColor(this.colors.black)
       .font(this.fonts.bold)
       .fontSize(22)
       .text(title, 130, 30, { align: 'left' });

    // Metadata
    doc.font(this.fonts.regular)
       .fontSize(9)
       .fillColor(this.colors.gray)
       .text(`Generated: ${formatDate(new Date())} at ${formatTime(new Date())}`, 130, 58);

    if (filters?.period) {
      doc.text(`Period: ${formatDate(filters.period.startDate)} - ${formatDate(filters.period.endDate)}`, 130, 72);
    }
    if (filters?.storeId && filters.storeId !== 'all') {
      doc.text(`Store: ${filters.storeId}`, 130, 86);
    }

    // Divider
    this._addDivider(doc, 110);
  }

  _addReportFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.font(this.fonts.regular)
         .fontSize(8)
         .fillColor(this.colors.gray)
         .text(
           `Page ${i + 1} of ${pageCount} | ${formatDate(new Date())}`,
           50,
           doc.page.height - 30,
           { align: 'center' }
         );
      
      // Footer line
      doc.strokeColor(this.colors.border)
         .lineWidth(0.5)
         .moveTo(50, doc.page.height - 40)
         .lineTo(doc.page.width - 50, doc.page.height - 40)
         .stroke();
    }
  }

  _addDivider(doc, y) {
    doc.strokeColor(this.colors.border)
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(doc.page.width - 50, y)
       .stroke();
    return doc;
  }

  _addSectionTitle(doc, title) {
    doc.fillColor(this.colors.black)
       .font(this.fonts.bold)
       .fontSize(14)
       .text(title)
       .moveDown(0.5);
  }

  _addSummarySection(doc, summary) {
    if (!summary) return;
    
    this._addSectionTitle(doc, 'Summary');
    
    const metrics = [
      ['Total Revenue', formatCurrency(summary.totalRevenue || 0)],
      ['Total Transactions', (summary.totalTransactions || 0).toString()],
      ['Average Order Value', formatCurrency(summary.averageOrderValue || 0)],
      ['Total Items Sold', (summary.totalItemsSold || 0).toString()],
      ['Total Tax', formatCurrency(summary.totalTax || 0)],
      ['Total Discount', formatCurrency(summary.totalDiscount || 0)],
      ['Unique Customers', (summary.uniqueCustomerCount || 0).toString()],
      ['Revenue Per Customer', formatCurrency(summary.revenuePerCustomer || 0)],
      ['Max Order Value', formatCurrency(summary.maxOrderValue || 0)],
      ['Min Order Value', formatCurrency(summary.minOrderValue || 0)],
    ];

    this._addTwoColumnTable(doc, metrics, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addGrowthMetrics(doc, growthMetrics) {
    if (!growthMetrics) return;
    
    this._addSectionTitle(doc, 'Growth Metrics');
    
    const data = [
      ['Period over Period Growth', `${(growthMetrics.periodOverPeriodGrowth * 100).toFixed(1)}%`],
      ['Average Growth Rate', `${(growthMetrics.averageGrowthRate * 100).toFixed(1)}%`],
      ['Trend', growthMetrics.trend?.toUpperCase() || 'STABLE'],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addTimeSeriesChart(doc, timeSeries) {
    if (!timeSeries || timeSeries.length === 0) return;
    
    this._addSectionTitle(doc, 'Time Series Analysis');
    
    const data = timeSeries.slice(0, 20).map(item => {
      const date = item._id ? 
        `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}` :
        'N/A';
      return [
        date,
        formatCurrency(item.totalRevenue || 0),
        (item.totalTransactions || 0).toString(),
        formatCurrency(item.averageOrderValue || 0),
      ];
    });

    this._addTable(doc, data, ['Date', 'Revenue', 'Transactions', 'Avg Order']);
    doc.moveDown();
  }

  _addPaymentBreakdown(doc, paymentBreakdown) {
    if (!paymentBreakdown || paymentBreakdown.length === 0) return;
    
    this._addSectionTitle(doc, 'Payment Breakdown');
    
    const data = paymentBreakdown.map(item => [
      item._id || 'Unknown',
      (item.count || 0).toString(),
      formatCurrency(item.totalAmount || 0),
      `${(item.percentage || 0).toFixed(1)}%`,
      formatCurrency(item.averageAmount || 0),
    ]);

    this._addTable(doc, data, ['Method', 'Count', 'Total', 'Percentage', 'Average']);
    doc.moveDown();
  }

  _addTopProducts(doc, topProducts) {
    if (!topProducts || topProducts.length === 0) return;
    
    this._addSectionTitle(doc, 'Top Products');
    
    const data = topProducts.slice(0, 15).map((item, index) => [
      `#${index + 1}`,
      item.productName || 'Unknown',
      item.sku || 'N/A',
      (item.totalQuantity || 0).toString(),
      formatCurrency(item.totalRevenue || 0),
      item.inventory?.status || 'Unknown',
    ]);

    this._addTable(doc, data, ['Rank', 'Product', 'SKU', 'Quantity', 'Revenue', 'Stock']);
    doc.moveDown();
  }

  _addStaffPerformance(doc, staffPerformance) {
    if (!staffPerformance || staffPerformance.length === 0) return;
    
    this._addSectionTitle(doc, 'Staff Performance');
    
    const data = staffPerformance.slice(0, 10).map((item, index) => [
      `#${index + 1}`,
      item.staffName || 'Unknown',
      formatCurrency(item.totalSales || 0),
      (item.transactionCount || 0).toString(),
      formatCurrency(item.averageOrderValue || 0),
      (item.uniqueCustomerCount || 0).toString(),
    ]);

    this._addTable(doc, data, ['Rank', 'Staff', 'Sales', 'Transactions', 'Avg Order', 'Customers']);
    doc.moveDown();
  }

  _addCustomerMetrics(doc, customerMetrics) {
    if (!customerMetrics) return;
    
    this._addSectionTitle(doc, 'Customer Metrics');
    
    const data = [
      ['New Customers', (customerMetrics.newCustomers || 0).toString()],
      ['Returning Customers', (customerMetrics.returningCustomers || 0).toString()],
      ['Customer Retention Rate', `${(customerMetrics.customerRetentionRate || 0).toFixed(1)}%`],
      ['Avg Customer Lifetime Value', formatCurrency(customerMetrics.avgCustomerLifetimeValue || 0)],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addInventorySummary(doc, summary) {
    if (!summary) return;
    
    this._addSectionTitle(doc, 'Inventory Summary');
    
    const data = [
      ['Total Products', (summary.totalProducts || 0).toString()],
      ['Total Stock', (summary.totalStock || 0).toString()],
      ['Total Value', formatCurrency(summary.totalValue || 0)],
      ['Total Cost Value', formatCurrency(summary.totalCostValue || 0)],
      ['Low Stock Items', (summary.lowStock || 0).toString()],
      ['Out of Stock', (summary.outOfStock || 0).toString()],
      ['Over Stock', (summary.overStock || 0).toString()],
      ['Average Stock Value', formatCurrency(summary.averageStockValue || 0)],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addCategoryBreakdown(doc, categoryBreakdown) {
    if (!categoryBreakdown || Object.keys(categoryBreakdown).length === 0) return;
    
    this._addSectionTitle(doc, 'Category Breakdown');
    
    const data = Object.entries(categoryBreakdown).map(([category, data]) => [
      category,
      (data.count || 0).toString(),
      (data.totalStock || 0).toString(),
      formatCurrency(data.totalValue || 0),
      (data.lowStockItems || 0).toString(),
      (data.outOfStockItems || 0).toString(),
    ]);

    this._addTable(doc, data, ['Category', 'Products', 'Stock', 'Value', 'Low Stock', 'Out Stock']);
    doc.moveDown();
  }

  _addBrandBreakdown(doc, brandBreakdown) {
    if (!brandBreakdown || Object.keys(brandBreakdown).length === 0) return;
    
    this._addSectionTitle(doc, 'Brand Breakdown');
    
    const data = Object.entries(brandBreakdown)
      .slice(0, 15)
      .map(([brand, data]) => [
        brand,
        (data.count || 0).toString(),
        (data.totalStock || 0).toString(),
        formatCurrency(data.totalValue || 0),
      ]);

    this._addTable(doc, data, ['Brand', 'Products', 'Stock', 'Value']);
    doc.moveDown();
  }

  _addStockStatus(doc, stockStatus) {
    if (!stockStatus) return;
    
    this._addSectionTitle(doc, 'Stock Status Distribution');
    
    const data = [
      ['In Stock', (stockStatus.inStock || 0).toString()],
      ['Low Stock', (stockStatus.lowStock || 0).toString()],
      ['Out of Stock', (stockStatus.outOfStock || 0).toString()],
      ['Over Stock', (stockStatus.overStock || 0).toString()],
    ];

    this._addTwoColumnTable(doc, data, ['Status', 'Count']);
    doc.moveDown();
  }

  _addValueDistribution(doc, valueDistribution) {
    if (!valueDistribution) return;
    
    this._addSectionTitle(doc, 'Value Distribution');
    
    const data = Object.entries(valueDistribution).map(([range, count]) => [
      range,
      (count || 0).toString(),
    ]);

    this._addTwoColumnTable(doc, data, ['Range', 'Count']);
    doc.moveDown();
  }

  _addInventoryList(doc, inventory) {
    if (!inventory || inventory.length === 0) return;
    
    this._addSectionTitle(doc, `Inventory Items (${inventory.length})`);
    
    const data = inventory.slice(0, 30).map(item => [
      item.product?.name || 'Unknown',
      item.product?.sku || 'N/A',
      (item.quantity || 0).toString(),
      formatCurrency(item.value || 0),
      item.status || 'Unknown',
      item.warehouseLocation?.aisle || 'N/A',
    ]);

    this._addTable(doc, data, ['Product', 'SKU', 'Qty', 'Value', 'Status', 'Location']);
    
    if (inventory.length > 30) {
      doc.font(this.fonts.italic)
         .fontSize(8)
         .fillColor(this.colors.gray)
         .text(`* Showing first 30 of ${inventory.length} items`, { align: 'center' });
    }
    doc.moveDown();
  }

  _addFinancialSummary(doc, summary) {
    if (!summary) return;
    
    this._addSectionTitle(doc, 'Financial Summary');
    
    const data = [
      ['Total Revenue', formatCurrency(summary.totalRevenue || 0)],
      ['Net Revenue', formatCurrency(summary.netRevenue || 0)],
      ['Total Tax', formatCurrency(summary.totalTax || 0)],
      ['Total Discount', formatCurrency(summary.totalDiscount || 0)],
      ['Total Cost', formatCurrency(summary.totalCost || 0)],
      ['Gross Profit', formatCurrency(summary.grossProfit || 0)],
      ['Gross Margin', `${(summary.grossMargin || 0).toFixed(1)}%`],
      ['Net Profit', formatCurrency(summary.netProfit || 0)],
      ['Net Profit Margin', `${(summary.netProfitMargin || 0).toFixed(1)}%`],
      ['Total Transactions', (summary.transactionCount || 0).toString()],
      ['Average Order Value', formatCurrency(summary.averageOrderValue || 0)],
      ['Max Revenue', formatCurrency(summary.maxRevenue || 0)],
      ['Min Revenue', formatCurrency(summary.minRevenue || 0)],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addFinancialRatios(doc, ratios) {
    if (!ratios) return;
    
    this._addSectionTitle(doc, 'Financial Ratios');
    
    const data = [
      ['Gross Margin', `${(ratios.grossMargin || 0).toFixed(1)}%`],
      ['Tax Rate', `${(ratios.taxRate || 0).toFixed(1)}%`],
      ['Discount Rate', `${(ratios.discountRate || 0).toFixed(1)}%`],
      ['Average Transaction Value', formatCurrency(ratios.averageTransactionValue || 0)],
    ];

    this._addTwoColumnTable(doc, data, ['Ratio', 'Value']);
    doc.moveDown();
  }

  _addProfitabilityMetrics(doc, profitability) {
    if (!profitability) return;
    
    this._addSectionTitle(doc, 'Profitability Analysis');
    
    const data = [
      ['Profit per Transaction', formatCurrency(profitability.profitPerTransaction || 0)],
      ['Gross Profit', formatCurrency(profitability.grossProfit || 0)],
      ['Net Profit', formatCurrency(profitability.netProfit || 0)],
      ['Net Profit Margin', `${(profitability.netProfitMargin || 0).toFixed(1)}%`],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addPaymentFinancials(doc, paymentFinancials) {
    if (!paymentFinancials || paymentFinancials.length === 0) return;
    
    this._addSectionTitle(doc, 'Payment Method Financials');
    
    const data = paymentFinancials.map(item => [
      item._id || 'Unknown',
      (item.count || 0).toString(),
      formatCurrency(item.totalAmount || 0),
      formatCurrency(item.averageAmount || 0),
      `${(item.percentage || 0).toFixed(1)}%`,
    ]);

    this._addTable(doc, data, ['Method', 'Count', 'Total', 'Average', 'Percentage']);
    doc.moveDown();
  }

  _addRefundAnalysis(doc, refunds) {
    if (!refunds) return;
    
    this._addSectionTitle(doc, 'Refund Analysis');
    
    const data = [
      ['Total Refunded', formatCurrency(refunds.totalRefunded || 0)],
      ['Refund Count', (refunds.refundCount || 0).toString()],
      ['Average Refund', formatCurrency(refunds.averageRefund || 0)],
      ['Max Refund', formatCurrency(refunds.maxRefund || 0)],
      ['Min Refund', formatCurrency(refunds.minRefund || 0)],
      ['Refund Rate', `${(refunds.refundRate || 0).toFixed(1)}%`],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addCategoryProfitability(doc, categoryProfitability) {
    if (!categoryProfitability || categoryProfitability.length === 0) return;
    
    this._addSectionTitle(doc, 'Category Profitability');
    
    const data = categoryProfitability.slice(0, 15).map(item => [
      item._id || 'Uncategorized',
      formatCurrency(item.totalRevenue || 0),
      formatCurrency(item.totalCost || 0),
      formatCurrency(item.grossProfit || 0),
      `${(item.margin || 0).toFixed(1)}%`,
    ]);

    this._addTable(doc, data, ['Category', 'Revenue', 'Cost', 'Profit', 'Margin']);
    doc.moveDown();
  }

  _addCashFlow(doc, cashFlow) {
    if (!cashFlow || cashFlow.length === 0) return;
    
    this._addSectionTitle(doc, 'Cash Flow Analysis');
    
    const data = cashFlow.slice(0, 18).map(item => {
      const date = item._id ? 
        `${item._id.year}-${String(item._id.month).padStart(2, '0')}` :
        'N/A';
      return [
        date,
        formatCurrency(item.cashInflow || 0),
        formatCurrency(item.cashOutflow || 0),
        formatCurrency(item.netCashFlow || 0),
      ];
    });

    this._addTable(doc, data, ['Period', 'Inflow', 'Outflow', 'Net Flow']);
    doc.moveDown();
  }

  _addCustomerLTV(doc, customerLTV) {
    if (!customerLTV) return;
    
    this._addSectionTitle(doc, 'Customer Lifetime Value');
    
    const data = [
      ['Avg Customer LTV', formatCurrency(customerLTV.avgCustomerLifetimeValue || 0)],
      ['Avg Purchase Frequency', (customerLTV.avgPurchaseFrequency || 0).toFixed(1)],
      ['Customer Retention Rate', `${(customerLTV.customerRetentionRate || 0).toFixed(1)}%`],
      ['Total Customers', (customerLTV.totalCustomers || 0).toString()],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addAuditSummary(doc, summary) {
    if (!summary) return;
    
    this._addSectionTitle(doc, 'Audit Summary');
    
    const data = [
      ['Total Actions', (summary.totalCount || 0).toString()],
      ['Unique Actors', (summary.topActors?.length || 0).toString()],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addAuditBreakdowns(doc, summary) {
    if (!summary) return;
    
    // Action Breakdown
    if (summary.actionBreakdown && summary.actionBreakdown.length > 0) {
      this._addSectionTitle(doc, 'Actions by Type');
      const data = summary.actionBreakdown.map(item => [
        item._id || 'Unknown',
        (item.count || 0).toString(),
      ]);
      this._addTwoColumnTable(doc, data, ['Action', 'Count']);
      doc.moveDown();
    }

    // Severity Breakdown
    if (summary.severityBreakdown && summary.severityBreakdown.length > 0) {
      this._addSectionTitle(doc, 'Actions by Severity');
      const data = summary.severityBreakdown.map(item => [
        item._id || 'Unknown',
        (item.count || 0).toString(),
      ]);
      this._addTwoColumnTable(doc, data, ['Severity', 'Count']);
      doc.moveDown();
    }

    // Top Actors
    if (summary.topActors && summary.topActors.length > 0) {
      this._addSectionTitle(doc, 'Top Actors');
      const data = summary.topActors.map(item => [
        item.actorName || 'Unknown',
        item.actorRole || 'N/A',
        (item.actionCount || 0).toString(),
      ]);
      this._addTable(doc, data, ['Actor', 'Role', 'Actions']);
      doc.moveDown();
    }
  }

  _addAuditLogs(doc, logs) {
    if (!logs || logs.length === 0) return;
    
    this._addSectionTitle(doc, `Audit Logs (${logs.length})`);
    
    const data = logs.slice(0, 40).map(log => [
      formatDate(log.timestamp),
      formatTime(log.timestamp),
      log.action || 'Unknown',
      log.resourceType || 'Unknown',
      log.severity || 'INFO',
      log.actorId?.firstName ? `${log.actorId.firstName} ${log.actorId.lastName}` : 'Unknown',
    ]);

    this._addTable(doc, data, ['Date', 'Time', 'Action', 'Resource', 'Severity', 'Actor']);
    
    if (logs.length > 40) {
      doc.font(this.fonts.italic)
         .fontSize(8)
         .fillColor(this.colors.gray)
         .text(`* Showing first 40 of ${logs.length} audit logs`, { align: 'center' });
    }
    doc.moveDown();
  }

  _addStoreComparisonSummary(doc, summary) {
    if (!summary) return;
    
    this._addSectionTitle(doc, 'Comparative Summary');
    
    const data = [
      ['Total Revenue', formatCurrency(summary.totalRevenue || 0)],
      ['Total Transactions', (summary.totalTransactions || 0).toString()],
      ['Average Revenue per Store', formatCurrency(summary.averageRevenuePerStore || 0)],
      ['Average Transactions per Store', (summary.averageTransactionsPerStore || 0).toString()],
      ['Best Performing Store', summary.bestPerformingStore?.storeName || 'N/A'],
      ['Best Store Revenue', formatCurrency(summary.bestPerformingStore?.revenue || 0)],
      ['Number of Stores', (summary.storeCount || 0).toString()],
    ];

    this._addTwoColumnTable(doc, data, ['Metric', 'Value']);
    doc.moveDown();
  }

  _addStoreComparisonDetail(doc, reports) {
    if (!reports || reports.length === 0) return;
    
    this._addSectionTitle(doc, 'Store Performance Details');
    
    const data = reports.map((store, index) => [
      `#${index + 1}`,
      store.storeName || 'Unknown',
      store.storeCode || 'N/A',
      formatCurrency(store.keyMetrics?.revenue || 0),
      (store.keyMetrics?.transactions || 0).toString(),
      formatCurrency(store.keyMetrics?.averageOrderValue || 0),
      `${(store.keyMetrics?.profitMargin || 0).toFixed(1)}%`,
      formatCurrency(store.keyMetrics?.inventoryValue || 0),
    ]);

    this._addTable(doc, data, ['Rank', 'Store', 'Code', 'Revenue', 'Txns', 'Avg Order', 'Margin', 'Inventory']);
    doc.moveDown();

    // Performance comparison chart (text-based)
    if (reports.length > 1) {
      this._addSectionTitle(doc, 'Revenue Comparison Chart');
      const maxRevenue = Math.max(...reports.map(s => s.keyMetrics?.revenue || 0));
      
      reports.forEach((store, index) => {
        const percentage = maxRevenue > 0 ? ((store.keyMetrics?.revenue || 0) / maxRevenue) * 100 : 0;
        const barLength = Math.floor(percentage / 2);
        const bar = '█'.repeat(Math.min(barLength, 50));
        
        doc.font(this.fonts.regular)
           .fontSize(8)
           .fillColor(this.colors.black)
           .text(`${store.storeName}: ${bar} ${(percentage).toFixed(0)}%`, { continued: false });
      });
      doc.moveDown();
    }
  }

  // ============== TABLE HELPERS ==============

  _addTable(doc, data, headers) {
    if (!data || data.length === 0) return;
    
    const pageWidth = doc.page.width;
    const margin = 50;
    const availableWidth = pageWidth - (margin * 2);
    const columnCount = Math.min(headers.length, 8);
    const columnWidth = availableWidth / columnCount;
    
    // Calculate optimal font size based on content
    let fontSize = 8;
    const maxContentLength = data.reduce((max, row) => {
      const rowMax = row.reduce((rowMax, cell) => Math.max(rowMax, String(cell || '').length), 0);
      return Math.max(max, rowMax);
    }, 0);
    
    if (maxContentLength > 20) fontSize = 7;
    if (maxContentLength > 30) fontSize = 6;
    
    // Headers
    doc.font(this.fonts.bold)
       .fontSize(fontSize + 1)
       .fillColor(this.colors.primary);
    
    let y = doc.y;
    const headerY = y;
    headers.slice(0, columnCount).forEach((header, i) => {
      doc.text(header, margin + (i * columnWidth), headerY, {
        width: columnWidth,
        align: 'left',
        ellipsis: true,
      });
    });
    
    y = doc.y + 8;
    doc.strokeColor(this.colors.border)
       .lineWidth(0.5)
       .moveTo(margin, y)
       .lineTo(pageWidth - margin, y)
       .stroke();
    y += 4;
    
    // Data rows
    doc.font(this.fonts.regular)
       .fontSize(fontSize)
       .fillColor(this.colors.black);
    
    let rowCount = 0;
    for (const row of data) {
      // Check if we need a new page
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
        
        // Re-add headers on new page
        doc.font(this.fonts.bold)
           .fontSize(fontSize + 1)
           .fillColor(this.colors.primary);
        
        const newHeaderY = y;
        headers.slice(0, columnCount).forEach((header, i) => {
          doc.text(header, margin + (i * columnWidth), newHeaderY, {
            width: columnWidth,
            align: 'left',
            ellipsis: true,
          });
        });
        
        y = doc.y + 8;
        doc.strokeColor(this.colors.border)
           .lineWidth(0.5)
           .moveTo(margin, y)
           .lineTo(pageWidth - margin, y)
           .stroke();
        y += 4;
        
        doc.font(this.fonts.regular)
           .fontSize(fontSize)
           .fillColor(this.colors.black);
      }
      
      const rowY = y;
      row.slice(0, columnCount).forEach((cell, i) => {
        const text = String(cell || '').substring(0, 50);
        doc.text(text, margin + (i * columnWidth), rowY, {
          width: columnWidth,
          align: 'left',
          ellipsis: true,
        });
      });
      
      y = doc.y + 12;
      rowCount++;
      
      // Add light border between rows
      if (rowCount % 2 === 0) {
        doc.strokeColor(this.colors.lightGray)
           .lineWidth(0.3)
           .moveTo(margin, y - 2)
           .lineTo(pageWidth - margin, y - 2)
           .stroke();
      }
    }
    
    doc.moveDown(0.5);
  }

  _addTwoColumnTable(doc, data, headers) {
    // Simplified table for 2 columns
    const pageWidth = doc.page.width;
    const margin = 50;
    const availableWidth = pageWidth - (margin * 2);
    const labelWidth = availableWidth * 0.4;
    const valueWidth = availableWidth * 0.6;
    
    doc.font(this.fonts.bold)
       .fontSize(9)
       .fillColor(this.colors.primary);
    
    let y = doc.y;
    doc.text(headers[0], margin, y, { width: labelWidth, align: 'left' });
    doc.text(headers[1], margin + labelWidth, y, { width: valueWidth, align: 'left' });
    y = doc.y + 6;
    
    doc.strokeColor(this.colors.border)
       .lineWidth(0.5)
       .moveTo(margin, y)
       .lineTo(pageWidth - margin, y)
       .stroke();
    y += 4;
    
    doc.font(this.fonts.regular)
       .fontSize(8)
       .fillColor(this.colors.black);
    
    for (const [label, value] of data) {
      if (y > doc.page.height - 40) {
        doc.addPage();
        y = 50;
      }
      
      doc.text(label, margin, y, { width: labelWidth, align: 'left' });
      doc.text(value, margin + labelWidth, y, { width: valueWidth, align: 'left' });
      y = doc.y + 8;
    }
    
    doc.moveDown(0.5);
  }

  /**
   * Save PDF to file
   */
  async savePDF(buffer, filename, directory = 'reports') {
    const dir = path.join(__dirname, '../../', directory);
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storeId = filters.storeId || 'all';
    return `${type}_${storeId}_${timestamp}.pdf`;
  }
}

module.exports = new PDFGenerator();