
// controllers/reportController.js
const ReportService = require('../services/reportService');
const PDFExportService = require('../services/pdfExportService');
const { AppError } = require('../middleware/errorHandler');
const AuditLog = require('../models/AuditLog');

const normalizeObjectId = (value) => {
    if (!value || value === "undefined" || value === "null") {
        return undefined;
    }
    return value;
};

/**
 * Generate sales report with advanced filters
 */
exports.salesReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day',
      paymentMethods,
      minAmount,
      maxAmount,
      productIds,
      category,
      salesAttendantId,
      sortBy,
      sortOrder,
      limit = 100,
      offset = 0,
    } = req.query;

    const storeId = normalizeObjectId(req.query.storeId);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      startDate,
      endDate,
      groupBy,
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (paymentMethods) filters.paymentMethods = paymentMethods.split(',');
    if (minAmount) filters.minAmount = parseFloat(minAmount);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount);
    if (productIds) filters.productIds = productIds.split(',');
    if (category) filters.category = category;
    if (salesAttendantId) filters.salesAttendantId = salesAttendantId;

    const report = await ReportService.generateSalesReport(filters);

    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'READ',
      resourceType: 'Report',
      resourceId: req.user._id,
      storeId: storeFilter,
      details: {
        metadata: {
          type: 'sales_report',
          filters
        }
      }
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Download sales report as PDF
 */
exports.downloadSalesReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day',
      paymentMethods,
      minAmount,
      maxAmount,
      productIds,
      category,
      salesAttendantId,
      sortBy,
      sortOrder,
      limit = 100,
      offset = 0,
    } = req.query;

    const storeId = normalizeObjectId(req.query.storeId);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      startDate,
      endDate,
      groupBy,
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (paymentMethods) filters.paymentMethods = paymentMethods.split(',');
    if (minAmount) filters.minAmount = parseFloat(minAmount);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount);
    if (productIds) filters.productIds = productIds.split(',');
    if (category) filters.category = category;
    if (salesAttendantId) filters.salesAttendantId = salesAttendantId;

    const report = await ReportService.generateSalesReport(filters);
    const pdfBuffer = await PDFExportService.exportSalesReport(report);
    const filename = PDFExportService.generateFilename('sales', { storeId: storeFilter || 'all' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download sales report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate inventory report with advanced filters
 */
exports.inventoryReport = async (req, res) => {
  try {
    const {
      storeId,
      lowStockOnly = false,
      outOfStockOnly = false,
      sortBy = 'quantity',
      sortOrder = 'asc',
      limit = 100,
      offset = 0,
    } = req.query;

    const category = normalizeObjectId(req.query.category);
    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      category,
      lowStockOnly: lowStockOnly === 'true',
      outOfStockOnly: outOfStockOnly === 'true',
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const report = await ReportService.generateInventoryReport(filters);

    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'READ',
      resourceType: 'Report',
      resourceId: req.user._id,
      storeId: storeFilter,
      details: {
        metadata: {
          type: 'inventory_report',
          filters
        }
      }
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Download inventory report as PDF
 */
exports.downloadInventoryReport = async (req, res) => {
  try {
    const {
      storeId,
      lowStockOnly = false,
      outOfStockOnly = false,
      sortBy = 'quantity',
      sortOrder = 'asc',
      limit = 100,
      offset = 0,
    } = req.query;

    const category = normalizeObjectId(req.query.category);
    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      category,
      lowStockOnly: lowStockOnly === 'true',
      outOfStockOnly: outOfStockOnly === 'true',
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const report = await ReportService.generateInventoryReport(filters);
    const pdfBuffer = await PDFExportService.exportInventoryReport(report);
    const filename = PDFExportService.generateFilename('inventory', { storeId: storeFilter || 'all' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download inventory report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate financial report with advanced filters
 */
exports.financialReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day',
      includeBreakdown = true,
    } = req.query;

    const storeId = normalizeObjectId(req.query.storeId);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      startDate,
      endDate,
      groupBy,
      includeBreakdown: includeBreakdown === 'true'
    };

    const report = await ReportService.generateFinancialReport(filters);

    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'READ',
      resourceType: 'Report',
      resourceId: req.user._id,
      storeId: storeFilter,
      details: {
        metadata: {
          type: 'financial_report',
          filters
        }
      }
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Download financial report as PDF
 */
exports.downloadFinancialReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day',
      includeBreakdown = true,
    } = req.query;

    const storeId = normalizeObjectId(req.query.storeId);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      startDate,
      endDate,
      groupBy,
      includeBreakdown: includeBreakdown === 'true'
    };

    const report = await ReportService.generateFinancialReport(filters);
    const pdfBuffer = await PDFExportService.exportFinancialReport(report);
    const filename = PDFExportService.generateFilename('financial', { storeId: storeFilter || 'all' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download financial report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate audit report
 */
exports.auditReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      storeId,
      actorId,
      action,
      resourceType,
      severity,
      limit = 100,
      offset = 0,
    } = req.query;

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      startDate,
      endDate,
      actorId,
      action,
      resourceType,
      severity,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const report = await ReportService.generateAuditReport(filters);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Audit report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Download audit report as PDF
 */
exports.downloadAuditReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      storeId,
      actorId,
      action,
      resourceType,
      severity,
      limit = 100,
      offset = 0,
    } = req.query;

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const filters = {
      storeId: storeFilter,
      startDate,
      endDate,
      actorId,
      action,
      resourceType,
      severity,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const report = await ReportService.generateAuditReport(filters);
    const pdfBuffer = await PDFExportService.exportAuditReport(report);
    const filename = PDFExportService.generateFilename('audit', { storeId: storeFilter || 'all' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download audit report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate store comparison report
 */
exports.storeComparisonReport = async (req, res) => {
  try {
    const { storeIds, startDate, endDate, metrics } = req.query;

    if (!storeIds || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Store IDs, start date and end date are required'
      });
    }

    const ids = storeIds.split(',');

    if (req.user.role !== 'SUPER_ADMIN') {
      const filteredIds = ids.filter(id => id === req.user.storeId.toString());
      if (filteredIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to these stores'
        });
      }
    }

    const filters = {
      storeIds: ids,
      startDate,
      endDate,
      metrics: metrics ? metrics.split(',') : ['revenue', 'transactions', 'inventory']
    };

    const report = await ReportService.generateStoreComparisonReport(filters);

    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'READ',
      resourceType: 'Report',
      resourceId: req.user._id,
      details: {
        metadata: {
          type: 'store_comparison_report',
          filters
        }
      }
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Store comparison error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Download store comparison report as PDF
 */
exports.downloadStoreComparisonReport = async (req, res) => {
  try {
    const { storeIds, startDate, endDate, metrics } = req.query;

    if (!storeIds || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Store IDs, start date and end date are required'
      });
    }

    const ids = storeIds.split(',');

    if (req.user.role !== 'SUPER_ADMIN') {
      const filteredIds = ids.filter(id => id === req.user.storeId.toString());
      if (filteredIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to these stores'
        });
      }
    }

    const filters = {
      storeIds: ids,
      startDate,
      endDate,
      metrics: metrics ? metrics.split(',') : ['revenue', 'transactions', 'inventory']
    };

    const report = await ReportService.generateStoreComparisonReport(filters);
    const pdfBuffer = await PDFExportService.exportStoreComparisonReport(report);
    const filename = PDFExportService.generateFilename('store_comparison');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download store comparison error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate user performance report
 */
exports.userPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const report = await ReportService.generateUserPerformanceReport(
      storeFilter,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('User performance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Download user performance report as PDF
 */
exports.downloadUserPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const report = await ReportService.generateUserPerformanceReport(
      storeFilter,
      startDate,
      endDate
    );
    
    // Use the sales report PDF export for user performance
    const pdfBuffer = await PDFExportService.exportSalesReport(report);
    const filename = PDFExportService.generateFilename('user_performance', { storeId: storeFilter || 'all' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download user performance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate product performance report
 */
exports.productPerformanceReport = async (req, res) => {

  try {
    // const { startDate, endDate, storeId } = req.query;
    const {
    startDate,
    endDate,
    storeId,
    category,
    limit
} = req.query;



    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    
    const report =
    await ReportService.generateProductPerformanceReport(
        storeFilter,
        startDate,
        endDate,
        {
            category,
            limit: Number(limit) || 100
        }
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Download product performance report as PDF
 */
exports.downloadProductPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const storeFilter = req.user.role === 'SUPER_ADMIN' ? storeId : req.user.storeId;

    const report = await ReportService.generateProductPerformanceReport(
      storeFilter,
      startDate,
      endDate
    );
    
    // Use the sales report PDF export for product performance
    const pdfBuffer = await PDFExportService.exportSalesReport(report);
    const filename = PDFExportService.generateFilename('product_performance', { storeId: storeFilter || 'all' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download product performance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};