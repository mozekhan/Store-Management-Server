// services/reportService.js
const Transaction = require("../models/Transaction");
const TransactionItem = require("../models/TransactionItem");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Store = require("../models/Store");
const BaseService = require("./baseService");
const PDFGenerator = require("../utils/pdfGenerator");
const ExcelGenerator = require("../utils/excelGenerator");
const { AppError } = require("../middleware/errorHandler");

class ReportService extends BaseService {
  /**
   * Generate comprehensive sales report with advanced metrics
   */
  async generateSalesReport(filters) {
    const {
      storeId,
      startDate,
      endDate,
      groupBy = "day", // day, week, month, quarter, year
      paymentMethods = [],
      minAmount,
      maxAmount,
      productIds = [],
      category,
      salesAttendantId,
      sortBy = "date", // date, revenue, transactions, avgOrderValue
      sortOrder = "desc",
      limit = 100,
      offset = 0,
    } = filters;

    const query = this._buildSalesQuery(filters);

    // Get date range aggregation based on groupBy
    const dateGroup = this._getDateGrouping(groupBy);

    // Main sales aggregation with advanced metrics
    const salesData = await Transaction.aggregate([
      { $match: query },
      {
        $facet: {
          // Time series data
          timeSeries: [
            {
              $group: {
                _id: dateGroup,
                totalRevenue: { $sum: "$totalAmount" },
                totalTransactions: { $sum: 1 },
                averageOrderValue: { $avg: "$totalAmount" },
                totalItems: { $sum: { $size: "$items" } },
                totalTax: { $sum: "$taxTotal" },
                totalDiscount: { $sum: "$discountTotal" },
                uniqueCustomers: { $addToSet: "$customerId" },
                paymentMethods: {
                  $push: {
                    method: "$paymentMethod",
                    amount: "$paymentAmount",
                  },
                },
                attendants: { $addToSet: "$salesAttendantId" },
              },
            },
            {
              $addFields: {
                uniqueCustomerCount: { $size: "$uniqueCustomers" },
                attendantCount: { $size: "$attendants" },
              },
            },
            { $sort: { _id: sortOrder === "desc" ? -1 : 1 } },
          ],

          // Summary statistics
          summary: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalTransactions: { $sum: 1 },
                averageOrderValue: { $avg: "$totalAmount" },
                maxOrderValue: { $max: "$totalAmount" },
                minOrderValue: { $min: "$totalAmount" },
                totalTax: { $sum: "$taxTotal" },
                totalDiscount: { $sum: "$discountTotal" },
                totalItemsSold: { $sum: { $size: "$items" } },
                uniqueCustomers: { $addToSet: "$customerId" },
                uniqueAttendants: { $addToSet: "$salesAttendantId" },
              },
            },
            {
              $addFields: {
                uniqueCustomerCount: { $size: "$uniqueCustomers" },
                uniqueAttendantCount: { $size: "$uniqueAttendants" },
                averageItemsPerTransaction: {
                  $cond: [
                    { $eq: ["$totalTransactions", 0] },
                    0,
                    { $divide: ["$totalItemsSold", "$totalTransactions"] },
                  ],
                },
                revenuePerCustomer: {
                  $cond: [
                    { $eq: ["$uniqueCustomerCount", 0] },
                    0,
                    { $divide: ["$totalRevenue", "$uniqueCustomerCount"] },
                  ],
                },
              },
            },
          ],

          // Payment method breakdown with detailed metrics
          paymentBreakdown: [
            {
              $group: {
                _id: "$paymentMethod",
                count: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
                averageAmount: { $avg: "$totalAmount" },
                minAmount: { $min: "$totalAmount" },
                maxAmount: { $max: "$totalAmount" },
                percentage: { $sum: 1 },
              },
            },
            {
              $addFields: {
                percentage: {
                  $multiply: [
                    { $divide: ["$percentage", { $sum: "$percentage" }] },
                    100,
                  ],
                },
              },
            },
          ],

          // Top products with detailed metrics
          topProducts: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.productId",
                totalQuantity: { $sum: "$items.quantity" },
                totalRevenue: { $sum: "$items.totalPrice" },
                averagePrice: { $avg: "$items.unitPrice" },
                transactionCount: { $sum: 1 },
                maxPrice: { $max: "$items.unitPrice" },
                minPrice: { $min: "$items.unitPrice" },
              },
            },
            {
              $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product",
              },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                productId: "$_id",
                productName: "$product.name",
                sku: "$product.sku",
                category: "$product.category",
                brand: "$product.brand",
                totalQuantity: 1,
                totalRevenue: 1,
                averagePrice: 1,
                transactionCount: 1,
                maxPrice: 1,
                minPrice: 1,
              },
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 20 },
          ],

          // Staff performance with advanced metrics
          staffPerformance: [
            {
              $group: {
                _id: "$salesAttendantId",
                totalSales: { $sum: "$totalAmount" },
                transactionCount: { $sum: 1 },
                averageOrderValue: { $avg: "$totalAmount" },
                totalItems: { $sum: { $size: "$items" } },
                maxTransaction: { $max: "$totalAmount" },
                minTransaction: { $min: "$totalAmount" },
                uniqueCustomers: { $addToSet: "$customerId" },
              },
            },
            {
              $addFields: {
                uniqueCustomerCount: { $size: "$uniqueCustomers" },
                itemsPerTransaction: {
                  $cond: [
                    { $eq: ["$transactionCount", 0] },
                    0,
                    { $divide: ["$totalItems", "$transactionCount"] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "staff",
              },
            },
            { $unwind: { path: "$staff", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                staffId: "$_id",
                staffName: {
                  $concat: ["$staff.firstName", " ", "$staff.lastName"],
                },
                staffEmail: "$staff.email",
                totalSales: 1,
                transactionCount: 1,
                averageOrderValue: 1,
                totalItems: 1,
                itemsPerTransaction: 1,
                maxTransaction: 1,
                minTransaction: 1,
                uniqueCustomerCount: 1,
              },
            },
            { $sort: { totalSales: -1 } },
          ],

          // Hourly distribution
          hourlyDistribution: [
            {
              $group: {
                _id: { hour: { $hour: "$createdAt" } },
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
            { $sort: { "_id.hour": 1 } },
          ],

          // Day of week distribution
          dayOfWeekDistribution: [
            {
              $group: {
                _id: { dayOfWeek: { $dayOfWeek: "$createdAt" } },
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
                avgOrderValue: { $avg: "$totalAmount" },
              },
            },
            { $sort: { "_id.dayOfWeek": 1 } },
          ],

          customerMetrics: [
            {
              $group: {
                _id: "$customerId",
                purchaseCount: { $sum: 1 },
                totalSpent: { $sum: "$totalAmount" },
              },
            },
            {
              $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                newCustomers: {
                  $sum: {
                    $cond: [{ $eq: ["$purchaseCount", 1] }, 1, 0],
                  },
                },
                returningCustomers: {
                  $sum: {
                    $cond: [{ $gt: ["$purchaseCount", 1] }, 1, 0],
                  },
                },
                avgCustomerLifetimeValue: {
                  $avg: "$totalSpent",
                },
              },
            },
          ],
        },
      },
    ]);

    // Process and format the results
    const result = salesData[0] || {};

    // Get inventory for top products
    const topProductIds =
      result.topProducts?.map((p) => p.productId).filter((id) => id) || [];
    const inventoryData = await Inventory.find({
      productId: { $in: topProductIds },
      storeId: storeId,
    });

    // Enrich products with inventory data
    const enrichedProducts = (result.topProducts || []).map((product) => {
      const inventory = inventoryData.find(
        (inv) => inv.productId.toString() === product.productId?.toString(),
      );
      return {
        ...product,
        inventory: inventory
          ? {
              quantity: inventory.quantity,
              reorderPoint: inventory.reorderPoint,
              status:
                inventory.quantity === 0
                  ? "OUT_OF_STOCK"
                  : inventory.quantity <= inventory.reorderPoint
                    ? "LOW_STOCK"
                    : "IN_STOCK",
            }
          : null,
      };
    });

    // Calculate growth metrics
    const growthMetrics = this._calculateGrowthMetrics(result.timeSeries || []);

    return {
      summary: {
        ...(result.summary?.[0] || {}),
        totalRevenue: result.summary?.[0]?.totalRevenue || 0,
        totalTransactions: result.summary?.[0]?.totalTransactions || 0,
        averageOrderValue: result.summary?.[0]?.averageOrderValue || 0,
        maxOrderValue: result.summary?.[0]?.maxOrderValue || 0,
        minOrderValue: result.summary?.[0]?.minOrderValue || 0,
        totalTax: result.summary?.[0]?.totalTax || 0,
        totalDiscount: result.summary?.[0]?.totalDiscount || 0,
        totalItemsSold: result.summary?.[0]?.totalItemsSold || 0,
        uniqueCustomerCount: result.summary?.[0]?.uniqueCustomerCount || 0,
        uniqueAttendantCount: result.summary?.[0]?.uniqueAttendantCount || 0,
        averageItemsPerTransaction:
          result.summary?.[0]?.averageItemsPerTransaction || 0,
        revenuePerCustomer: result.summary?.[0]?.revenuePerCustomer || 0,
      },
      timeSeries: result.timeSeries || [],
      paymentBreakdown: result.paymentBreakdown || [],
      topProducts: enrichedProducts,
      staffPerformance: result.staffPerformance || [],
      hourlyDistribution: result.hourlyDistribution || [],
      dayOfWeekDistribution: result.dayOfWeekDistribution || [],
      customerMetrics: this._processCustomerMetrics(
        result.customerMetrics || [],
      ),
      growthMetrics,
      filters: {
        period: { startDate, endDate },
        groupBy,
        storeId,
        paymentMethods,
        minAmount,
        maxAmount,
        category,
        salesAttendantId,
      },
    };
  }

  /**
   * Generate comprehensive inventory report with analytics
   */
  async generateInventoryReport(filters) {
    const {
      storeId,
      category,
      lowStockOnly = false,
      outOfStockOnly = false,
      sortBy = "quantity", // quantity, value, reorderPoint, name
      sortOrder = "asc",
      limit = 100,
      offset = 0,
    } = filters;

    const query = {};
    if (storeId) query.storeId = storeId;
    if (category) query.category = category;

    // Get inventory with product details
    const inventory = await Inventory.find(query)
      .populate("productId")
      .populate("storeId", "name code")
      .sort({ quantity: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip(offset);

    // Apply additional filters
    let filteredInventory = inventory;
    if (lowStockOnly) {
      filteredInventory = filteredInventory.filter(
        (item) => item.quantity <= item.reorderPoint && item.quantity > 0,
      );
    }
    if (outOfStockOnly) {
      filteredInventory = filteredInventory.filter(
        (item) => item.quantity === 0,
      );
    }

    // Calculate comprehensive metrics
    const metrics = {
      totalProducts: filteredInventory.length,
      totalStock: filteredInventory.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      totalValue: filteredInventory.reduce((sum, item) => {
        return sum + item.quantity * (item.productId?.unitPrice || 0);
      }, 0),
      totalCostValue: filteredInventory.reduce((sum, item) => {
        return sum + item.quantity * (item.productId?.costPrice || 0);
      }, 0),
      lowStock: filteredInventory.filter(
        (item) => item.quantity <= item.reorderPoint && item.quantity > 0,
      ).length,
      outOfStock: filteredInventory.filter((item) => item.quantity === 0)
        .length,
      overStock: filteredInventory.filter(
        (item) => item.quantity > item.reorderPoint * 3,
      ).length,
      totalReorderPoints: filteredInventory.reduce(
        (sum, item) => sum + item.reorderPoint,
        0,
      ),
      averageStockValue:
        filteredInventory.length > 0
          ? filteredInventory.reduce(
              (sum, item) =>
                sum + item.quantity * (item.productId?.unitPrice || 0),
              0,
            ) / filteredInventory.length
          : 0,
      stockTurnoverRate: this._calculateStockTurnover(
        storeId,
        filteredInventory,
      ),
      daysOfInventoryOutstanding: this._calculateDaysOfInventory(
        storeId,
        filteredInventory,
      ),
    };

    // Category breakdown with detailed metrics
    const categoryBreakdown =
      this._getDetailedCategoryBreakdown(filteredInventory);

    // Brand breakdown
    const brandBreakdown = this._getBrandBreakdown(filteredInventory);

    // Location analysis
    const locationAnalysis = this._getLocationAnalysis(filteredInventory);

    // Stock status distribution
    const stockStatusDistribution = {
      inStock: filteredInventory.filter(
        (item) => item.quantity > item.reorderPoint,
      ).length,
      lowStock: filteredInventory.filter(
        (item) => item.quantity <= item.reorderPoint && item.quantity > 0,
      ).length,
      outOfStock: filteredInventory.filter((item) => item.quantity === 0)
        .length,
      overStock: filteredInventory.filter(
        (item) => item.quantity > item.reorderPoint * 3,
      ).length,
    };

    // Value distribution
    const valueDistribution = this._getValueDistribution(filteredInventory);

    return {
      summary: metrics,
      categoryBreakdown,
      brandBreakdown,
      locationAnalysis,
      stockStatusDistribution,
      valueDistribution,
      inventory: filteredInventory.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        reservedQuantity: item.reservedQuantity,
        reorderPoint: item.reorderPoint,
        value: item.quantity * (item.productId?.unitPrice || 0),
        costValue: item.quantity * (item.productId?.costPrice || 0),
        profitPotential:
          (item.productId?.unitPrice || 0) - (item.productId?.costPrice || 0),
        warehouseLocation: item.warehouseLocation,
        lastCounted: item.lastCounted,
        status:
          item.quantity === 0
            ? "OUT_OF_STOCK"
            : item.quantity <= item.reorderPoint
              ? "LOW_STOCK"
              : item.quantity > item.reorderPoint * 3
                ? "OVER_STOCK"
                : "IN_STOCK",
        daysUntilReorder: this._calculateDaysUntilReorder(item),
      })),
      filters: {
        storeId,
        category,
        lowStockOnly,
        outOfStockOnly,
      },
    };
  }

  /**
   * Generate comprehensive financial report with decision-making metrics
   */
  async generateFinancialReport(filters) {
    const {
      storeId,
      startDate,
      endDate,
      groupBy = "day",
      includeBreakdown = true,
    } = filters;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    if (storeId) query.storeId = storeId;

    const dateGroup = this._getDateGrouping(groupBy);

    const financialData = await Transaction.aggregate([
      { $match: query },
      {
        $facet: {
          // Main financial summary
          summary: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalTax: { $sum: "$taxTotal" },
                totalSubtotal: { $sum: "$subtotal" },
                totalDiscount: { $sum: "$discountTotal" },
                transactionCount: { $sum: 1 },
                averageOrderValue: { $avg: "$totalAmount" },
                maxRevenue: { $max: "$totalAmount" },
                minRevenue: { $min: "$totalAmount" },
                medianRevenue: { $avg: "$totalAmount" },
                totalCost: { $sum: "$costTotal" },
                totalProfit: { $sum: "$profitTotal" },
                profitMargin: { $avg: "$profitMargin" },
              },
            },
            {
              $addFields: {
                netRevenue: { $subtract: ["$totalRevenue", "$totalTax"] },
                grossProfit: { $subtract: ["$totalRevenue", "$totalCost"] },
                grossMargin: {
                  $cond: [
                    { $eq: ["$totalRevenue", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$grossProfit", "$totalRevenue"] },
                        100,
                      ],
                    },
                  ],
                },
                operatingExpenses: { $sum: "$operatingExpenses" },
                netProfit: {
                  $subtract: ["$grossProfit", "$operatingExpenses"],
                },
                netProfitMargin: {
                  $cond: [
                    { $eq: ["$totalRevenue", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$netProfit", "$totalRevenue"] },
                        100,
                      ],
                    },
                  ],
                },
              },
            },
          ],

          // Time series with financial metrics
          timeSeries: [
            {
              $group: {
                _id: dateGroup,
                revenue: { $sum: "$totalAmount" },
                tax: { $sum: "$taxTotal" },
                subtotal: { $sum: "$subtotal" },
                discount: { $sum: "$discountTotal" },
                transactions: { $sum: 1 },
                avgOrderValue: { $avg: "$totalAmount" },
                cost: { $sum: "$costTotal" },
                profit: { $sum: "$profitTotal" },
              },
            },
            {
              $addFields: {
                netRevenue: { $subtract: ["$revenue", "$tax"] },
                grossProfit: { $subtract: ["$revenue", "$cost"] },
                margin: {
                  $cond: [
                    { $eq: ["$revenue", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$grossProfit", "$revenue"] },
                        100,
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Payment method financial breakdown
          paymentFinancials: [
            {
              $group: {
                _id: "$paymentMethod",
                totalAmount: { $sum: "$totalAmount" },
                count: { $sum: 1 },
                averageAmount: { $avg: "$totalAmount" },
                maxAmount: { $max: "$totalAmount" },
                minAmount: { $min: "$totalAmount" },
                totalTax: { $sum: "$taxTotal" },
              },
            },
            {
              $addFields: {
                percentage: {
                  $multiply: [
                    { $divide: ["$totalAmount", { $sum: "$totalAmount" }] },
                    100,
                  ],
                },
              },
            },
          ],

          // Refund analysis
          refundAnalysis: [
            { $match: { paymentStatus: "REFUNDED" } },
            {
              $group: {
                _id: null,
                totalRefunded: { $sum: "$totalAmount" },
                refundCount: { $sum: 1 },
                averageRefund: { $avg: "$totalAmount" },
                maxRefund: { $max: "$totalAmount" },
                minRefund: { $min: "$totalAmount" },
                refundRate: { $sum: 1 },
              },
            },
            {
              $addFields: {
                refundRate: {
                  $multiply: [
                    { $divide: ["$refundCount", { $sum: "$refundCount" }] },
                    100,
                  ],
                },
              },
            },
          ],

          // Cost analysis
          costAnalysis: [
            {
              $unwind: "$items",
            },
            {
              $group: {
                _id: null,
                totalCostOfGoodsSold: {
                  $sum: { $multiply: ["$items.quantity", "$items.costPrice"] },
                },
                totalInventoryValue: {
                  $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] },
                },
                averageCostPerItem: { $avg: "$items.costPrice" },
                averageSellingPrice: { $avg: "$items.unitPrice" },
              },
            },
            {
              $addFields: {
                markupPercentage: {
                  $cond: [
                    { $eq: ["$averageCostPerItem", 0] },
                    0,
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                "$averageSellingPrice",
                                "$averageCostPerItem",
                              ],
                            },
                            "$averageCostPerItem",
                          ],
                        },
                        100,
                      ],
                    },
                  ],
                },
              },
            },
          ],

          // Profitability by product category
          categoryProfitability: [
            { $unwind: "$items" },
            {
              $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "product",
              },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: "$product.category",
                totalRevenue: { $sum: "$items.totalPrice" },
                totalCost: {
                  $sum: { $multiply: ["$items.quantity", "$items.costPrice"] },
                },
                totalQuantity: { $sum: "$items.quantity" },
                transactionCount: { $sum: 1 },
              },
            },
            {
              $addFields: {
                grossProfit: { $subtract: ["$totalRevenue", "$totalCost"] },
                margin: {
                  $cond: [
                    { $eq: ["$totalRevenue", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$grossProfit", "$totalRevenue"] },
                        100,
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { totalRevenue: -1 } },
          ],

          // Customer lifetime value analysis
          customerLTV: [
            {
              $group: {
                _id: "$customerId",
                totalSpent: { $sum: "$totalAmount" },
                purchaseCount: { $sum: 1 },
                firstPurchase: { $min: "$createdAt" },
                lastPurchase: { $max: "$createdAt" },
              },
            },
            {
              $group: {
                _id: null,
                avgCustomerLifetimeValue: { $avg: "$totalSpent" },
                avgPurchaseFrequency: { $avg: "$purchaseCount" },
                customerRetentionRate: {
                  $avg: {
                    $cond: [{ $gt: ["$purchaseCount", 1] }, 1, 0],
                  },
                },
                totalCustomers: { $sum: 1 },
              },
            },
          ],

          // Cash flow analysis
          cashFlow: [
            {
              $group: {
                _id: {
                  month: { $month: "$createdAt" },
                  year: { $year: "$createdAt" },
                },
                cashInflow: { $sum: "$totalAmount" },
                cashOutflow: { $sum: "$costTotal" },
                netCashFlow: {
                  $sum: { $subtract: ["$totalAmount", "$costTotal"] },
                },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],

          // Financial ratios
          financialRatios: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalCost: { $sum: "$costTotal" },
                totalTax: { $sum: "$taxTotal" },
                totalDiscount: { $sum: "$discountTotal" },
                transactionCount: { $sum: 1 },
              },
            },
            {
              $addFields: {
                grossMargin: {
                  $cond: [
                    { $eq: ["$totalRevenue", 0] },
                    0,
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $subtract: ["$totalRevenue", "$totalCost"] },
                            "$totalRevenue",
                          ],
                        },
                        100,
                      ],
                    },
                  ],
                },
                taxRate: {
                  $cond: [
                    { $eq: ["$totalRevenue", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$totalTax", "$totalRevenue"] },
                        100,
                      ],
                    },
                  ],
                },
                discountRate: {
                  $cond: [
                    { $eq: ["$totalRevenue", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$totalDiscount", "$totalRevenue"] },
                        100,
                      ],
                    },
                  ],
                },
                averageTransactionValue: {
                  $cond: [
                    { $eq: ["$transactionCount", 0] },
                    0,
                    { $divide: ["$totalRevenue", "$transactionCount"] },
                  ],
                },
              },
            },
          ],
        },
      },
    ]);

    const result = financialData[0] || {};

    // Calculate additional financial metrics
    const metrics = this._calculateFinancialMetrics(result);

    return {
      summary: {
        ...(result.summary?.[0] || {}),
        totalRevenue: result.summary?.[0]?.totalRevenue || 0,
        totalTax: result.summary?.[0]?.totalTax || 0,
        totalSubtotal: result.summary?.[0]?.totalSubtotal || 0,
        totalDiscount: result.summary?.[0]?.totalDiscount || 0,
        transactionCount: result.summary?.[0]?.transactionCount || 0,
        averageOrderValue: result.summary?.[0]?.averageOrderValue || 0,
        maxRevenue: result.summary?.[0]?.maxRevenue || 0,
        minRevenue: result.summary?.[0]?.minRevenue || 0,
        medianRevenue: result.summary?.[0]?.medianRevenue || 0,
        totalCost: result.summary?.[0]?.totalCost || 0,
        totalProfit: result.summary?.[0]?.totalProfit || 0,
        profitMargin: result.summary?.[0]?.profitMargin || 0,
        netRevenue: result.summary?.[0]?.netRevenue || 0,
        grossProfit: result.summary?.[0]?.grossProfit || 0,
        grossMargin: result.summary?.[0]?.grossMargin || 0,
        netProfit: result.summary?.[0]?.netProfit || 0,
        netProfitMargin: result.summary?.[0]?.netProfitMargin || 0,
      },
      timeSeries: result.timeSeries || [],
      paymentFinancials: result.paymentFinancials || [],
      refundAnalysis: result.refundAnalysis?.[0] || {
        totalRefunded: 0,
        refundCount: 0,
        averageRefund: 0,
        maxRefund: 0,
        minRefund: 0,
        refundRate: 0,
      },
      costAnalysis: result.costAnalysis?.[0] || {},
      categoryProfitability: result.categoryProfitability || [],
      customerLTV: result.customerLTV?.[0] || {},
      cashFlow: result.cashFlow || [],
      financialRatios: result.financialRatios?.[0] || {},
      metrics,
      filters: {
        period: { startDate, endDate },
        storeId,
        groupBy,
      },
    };
  }

  /**
   * Generate comprehensive audit report
   */
  async generateAuditReport(filters) {
    const {
      storeId,
      startDate,
      endDate,
      actorId,
      action,
      resourceType,
      severity,
      limit = 20,
      offset = 0,
    } = filters;

    const query = {};
    if (storeId) query.storeId = storeId;
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (actorId) query.actorId = actorId;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (severity) query.severity = severity;

    const AuditLog = require("../models/AuditLog");

    const auditLogs = await AuditLog.find(query)
      .populate("actorId", "firstName lastName email role")
      .populate("storeId", "name code")
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset);

    const summary = await AuditLog.aggregate([
      { $match: query },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          actionBreakdown: [{ $group: { _id: "$action", count: { $sum: 1 } } }],
          severityBreakdown: [
            { $group: { _id: "$severity", count: { $sum: 1 } } },
          ],
          resourceBreakdown: [
            { $group: { _id: "$resourceType", count: { $sum: 1 } } },
          ],
          hourlyDistribution: [
            {
              $group: {
                _id: { hour: { $hour: "$timestamp" } },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.hour": 1 } },
          ],
          dailyDistribution: [
            {
              $group: {
                _id: {
                  year: { $year: "$timestamp" },
                  month: { $month: "$timestamp" },
                  day: { $dayOfMonth: "$timestamp" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
          ],
          topActors: [
            {
              $group: {
                _id: "$actorId",
                actionCount: { $sum: 1 },
              },
            },
            { $sort: { actionCount: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    // Get actor details for top actors
    const topActorIds =
      summary[0]?.topActors?.map((a) => a._id).filter((id) => id) || [];
    const actors = await User.find({ _id: { $in: topActorIds } }).select(
      "firstName lastName email role",
    );

    const topActorsWithDetails = (summary[0]?.topActors || []).map((actor) => {
      const user = actors.find(
        (u) => u._id.toString() === actor._id.toString(),
      );
      return {
        actorId: actor._id,
        actorName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        actorEmail: user?.email,
        actorRole: user?.role,
        actionCount: actor.actionCount,
      };
    });

    return {
      logs: auditLogs,
      summary: {
        totalCount: summary[0]?.totalCount?.[0]?.count || 0,
        actionBreakdown: summary[0]?.actionBreakdown || [],
        severityBreakdown: summary[0]?.severityBreakdown || [],
        resourceBreakdown: summary[0]?.resourceBreakdown || [],
        hourlyDistribution: summary[0]?.hourlyDistribution || [],
        dailyDistribution: summary[0]?.dailyDistribution || [],
        topActors: topActorsWithDetails,
      },
      filters: {
        period: { startDate, endDate },
        storeId,
        actorId,
        action,
        resourceType,
        severity,
      },
    };
  }

  /**
   * Generate store comparison report
   */
  async generateStoreComparisonReport(filters) {
    const {
      storeIds,
      startDate,
      endDate,
      metrics = ["revenue", "transactions", "inventory"],
    } = filters;

    const reports = await Promise.all(
      storeIds.map(async (storeId) => {
        const [salesReport, financialReport, inventoryReport] =
          await Promise.all([
            this.generateSalesReport({
              storeId,
              startDate,
              endDate,
              groupBy: "day",
            }),
            this.generateFinancialReport({
              storeId,
              startDate,
              endDate,
              groupBy: "day",
            }),
            this.generateInventoryReport({ storeId }),
          ]);

        const store = await Store.findById(storeId).select("name code");

        return {
          storeId,
          storeName: store?.name || "Unknown",
          storeCode: store?.code,
          sales: salesReport.summary,
          financial: financialReport.summary,
          inventory: inventoryReport.summary,
          keyMetrics: {
            revenue: salesReport.summary.totalRevenue || 0,
            transactions: salesReport.summary.totalTransactions || 0,
            averageOrderValue: salesReport.summary.averageOrderValue || 0,
            totalItems: salesReport.summary.totalItemsSold || 0,
            inventoryValue: inventoryReport.summary.totalValue || 0,
            lowStockItems: inventoryReport.summary.lowStock || 0,
            profit: financialReport.summary.totalProfit || 0,
            profitMargin: financialReport.summary.profitMargin || 0,
          },
        };
      }),
    );

    // Calculate comparative metrics
    const totalRevenue = reports.reduce(
      (sum, r) => sum + r.keyMetrics.revenue,
      0,
    );
    const totalTransactions = reports.reduce(
      (sum, r) => sum + r.keyMetrics.transactions,
      0,
    );
    const bestPerformingStore = reports.reduce((best, current) =>
      current.keyMetrics.revenue > best.keyMetrics.revenue ? current : best,
    );

    return {
      reports,
      comparativeSummary: {
        totalRevenue,
        totalTransactions,
        averageRevenuePerStore: totalRevenue / reports.length,
        averageTransactionsPerStore: totalTransactions / reports.length,
        bestPerformingStore: {
          storeId: bestPerformingStore.storeId,
          storeName: bestPerformingStore.storeName,
          revenue: bestPerformingStore.keyMetrics.revenue,
        },
        storeCount: reports.length,
      },
      filters: {
        period: { startDate, endDate },
        storeIds,
        metrics,
      },
    };
  }

  // services/reportService.js (add these methods)

  /**
   * Generate product performance report
   */
  async generateProductPerformanceReport(
    storeId,
    startDate,
    endDate,
    options = {},
  ) {
    const { category, limit = 100 } = options;

    const query = {
      // status: "INVOICE_QR",
      status: {
        $in: ["INVOICE_QR", "COMPLETED"],
      },
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    if (storeId) query.storeId = storeId;

    // Match products by category if specified
    let productMatch = {};
    if (category) {
      productMatch.category = category;
    }

    const performance = await Transaction.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "transactionitems",
          localField: "items",
          foreignField: "_id",
          as: "items",
        },
      },
      {
        $unwind: "$items",
      },

      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      ...(category
        ? [
            {
              $match: {
                "product.category": category,
              },
            },
          ]
        : []),

      {
        $group: {
          _id: "$product._id",

          product: {
            $first: "$product",
          },

          totalQuantity: {
            $sum: "$items.quantity",
          },

          totalRevenue: {
            $sum: "$items.totalPrice",
          },

          averagePrice: {
            $avg: "$items.unitPrice",
          },

          transactionCount: {
            $sum: 1,
          },

          maxPrice: {
            $max: "$items.unitPrice",
          },

          minPrice: {
            $min: "$items.unitPrice",
          },

          totalTax: {
            $sum: {
              $ifNull: ["$items.taxAmount", 0],
            },
          },

          totalDiscount: {
            $sum: {
              $ifNull: ["$items.discountAmount", 0],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          productId: "$_id",

          product: 1,

          totalQuantity: 1,

          totalRevenue: 1,

          averagePrice: 1,

          transactionCount: 1,

          maxPrice: 1,

          minPrice: 1,

          totalTax: 1,

          totalDiscount: 1,
        },
      },

      {
        $sort: {
          totalRevenue: -1,
        },
      },
      {
        $limit: limit,
      },
    ]);

    // Get inventory for products
    const productIds = performance.map((p) => p.productId).filter((id) => id);
    const inventory = await Inventory.find({
      productId: { $in: productIds },
      storeId,
    });

    // Enrich with inventory data
    return performance.map((p) => {
      const inv = inventory.find(
        (i) => i.productId.toString() === p.productId.toString(),
      );
      return {
        ...p,
        inventory: inv
          ? {
              quantity: inv.quantity,
              reservedQuantity: inv.reservedQuantity,
              reorderPoint: inv.reorderPoint,
              warehouseLocation: inv.warehouseLocation,
              lastCounted: inv.lastCounted,
              status:
                inv.quantity === 0
                  ? "OUT_OF_STOCK"
                  : inv.quantity <= inv.reorderPoint
                    ? "LOW_STOCK"
                    : "IN_STOCK",
            }
          : null,
      };
    });
  }

  /**
   * Generate user performance report
   */
  async generateUserPerformanceReport(
    storeId,
    startDate,
    endDate,
    options = {},
  ) {
    const { role, limit = 100 } = options;

    const query = {
      status: {
        $in: ["INVOICE_QR", "COMPLETED"],
      },
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    if (storeId) query.storeId = storeId;

    let performance = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$salesAttendantId",
          totalSales: { $sum: "$totalAmount" },
          transactionCount: { $sum: 1 },
          averageOrderValue: { $avg: "$totalAmount" },
          totalItems: { $sum: { $size: "$items" } },
          maxTransaction: { $max: "$totalAmount" },
          minTransaction: { $min: "$totalAmount" },
          uniqueCustomers: { $addToSet: "$customerId" },
        },
      },
      {
        $addFields: {
          uniqueCustomerCount: { $size: "$uniqueCustomers" },
          itemsPerTransaction: {
            $cond: [
              { $eq: ["$transactionCount", 0] },
              0,
              { $divide: ["$totalItems", "$transactionCount"] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      // Apply role filter
      ...(role ? [{ $match: { "user.role": role } }] : []),
      {
        $project: {
          userId: "$_id",
          user: 1,
          totalSales: 1,
          transactionCount: 1,
          averageOrderValue: 1,
          totalItems: 1,
          maxTransaction: 1,
          minTransaction: 1,
          uniqueCustomerCount: 1,
          itemsPerTransaction: 1,
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: limit },
    ]);

    return performance;
  }

  // ============== PRIVATE HELPER METHODS ==============

  _buildSalesQuery(filters) {
    const {
      storeId,
      startDate,
      endDate,
      paymentMethods = [],
      minAmount,
      maxAmount,
      productIds = [],
      category,
      salesAttendantId,
      status = ["COMPLETED", "INVOICE_QR"],
    } = filters;

    const query = {};

    if (Array.isArray(status)) {
      query.status = { $in: status };
    } else {
      query.status = status;
    }

    if (storeId) query.storeId = storeId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (paymentMethods.length > 0) {
      query.paymentMethod = { $in: paymentMethods };
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
      query.totalAmount = {};
      if (minAmount !== undefined) query.totalAmount.$gte = minAmount;
      if (maxAmount !== undefined) query.totalAmount.$lte = maxAmount;
    }
    if (salesAttendantId) query.salesAttendantId = salesAttendantId;

    // Handle product filtering (requires additional aggregation)
    if (productIds.length > 0 || category) {
      // Will be handled in aggregation pipeline
      query._productFilter = { productIds, category };
    }

    return query;
  }

  _getDateGrouping(groupBy) {
    switch (groupBy) {
      case "day":
        return {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
      case "week":
        return {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        };
      case "month":
        return {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
      case "quarter":
        return {
          year: { $year: "$createdAt" },
          quarter: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } },
        };
      case "year":
        return {
          year: { $year: "$createdAt" },
        };
      default:
        return {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
    }
  }

  _calculateGrowthMetrics(timeSeries) {
    if (!timeSeries || timeSeries.length < 2) {
      return {
        periodOverPeriodGrowth: 0,
        averageGrowthRate: 0,
        trend: "stable",
      };
    }

    const sorted = [...timeSeries].sort((a, b) => {
      const dateA = new Date(a._id.year, a._id.month - 1, a._id.day || 1);
      const dateB = new Date(b._id.year, b._id.month - 1, b._id.day || 1);
      return dateA - dateB;
    });

    const revenues = sorted.map((d) => d.totalRevenue || 0);
    const growthRates = [];

    for (let i = 1; i < revenues.length; i++) {
      if (revenues[i - 1] > 0) {
        growthRates.push((revenues[i] - revenues[i - 1]) / revenues[i - 1]);
      }
    }

    const periodOverPeriodGrowth =
      growthRates.length > 0 ? growthRates[growthRates.length - 1] : 0;
    const averageGrowthRate =
      growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;

    let trend = "stable";
    if (periodOverPeriodGrowth > 0.05) trend = "growing";
    else if (periodOverPeriodGrowth < -0.05) trend = "declining";

    return {
      periodOverPeriodGrowth,
      averageGrowthRate,
      trend,
      growthRates,
    };
  }

  _calculateStockTurnover(storeId, inventory) {
    // Implementation would require sales data
    // Simplified version
    return inventory.length > 0
      ? inventory.reduce((sum, item) => sum + item.quantity, 0) /
          inventory.length
      : 0;
  }

  _calculateDaysOfInventory(storeId, inventory) {
    // Implementation would require sales data
    // Simplified version
    return 30; // Default 30 days
  }

  _getDetailedCategoryBreakdown(inventory) {
    const breakdown = {};
    inventory.forEach((item) => {
      const category = (item.productId.category || "").trim().toUpperCase();
      if (!breakdown[category]) {
        breakdown[category] = {
          count: 0,
          totalValue: 0,
          totalCostValue: 0,
          totalStock: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          averageUnitPrice: 0,
          totalUnitPrices: 0,
        };
      }
      const cat = breakdown[category];
      cat.count++;
      cat.totalValue += item.quantity * (item.productId?.unitPrice || 0);
      cat.totalCostValue += item.quantity * (item.productId?.costPrice || 0);
      cat.totalStock += item.quantity;
      cat.totalUnitPrices += item.productId?.unitPrice || 0;
      if (item.quantity === 0) cat.outOfStockItems++;
      else if (item.quantity <= item.reorderPoint) cat.lowStockItems++;
    });

    // Calculate averages
    Object.keys(breakdown).forEach((category) => {
      const cat = breakdown[category];
      cat.averageUnitPrice =
        cat.count > 0 ? cat.totalUnitPrices / cat.count : 0;
      cat.averageItemValue = cat.count > 0 ? cat.totalValue / cat.count : 0;
    });

    return breakdown;
  }

  _getBrandBreakdown(inventory) {
    const breakdown = {};
    inventory.forEach((item) => {
      const brand = (item.productId?.brand || "").trim().toUpperCase();
      if (!breakdown[brand]) {
        breakdown[brand] = {
          count: 0,
          totalValue: 0,
          totalStock: 0,
        };
      }
      breakdown[brand].count++;
      breakdown[brand].totalValue +=
        item.quantity * (item.productId?.unitPrice || 0);
      breakdown[brand].totalStock += item.quantity;
    });
    return breakdown;
  }

  _getLocationAnalysis(inventory) {
    const locations = {};
    inventory.forEach((item) => {
      const location = item.warehouseLocation?.aisle || "Unknown";
      if (!locations[location]) {
        locations[location] = {
          count: 0,
          totalValue: 0,
          totalStock: 0,
        };
      }
      locations[location].count++;
      locations[location].totalValue +=
        item.quantity * (item.productId?.unitPrice || 0);
      locations[location].totalStock += item.quantity;
    });
    return locations;
  }

  _getValueDistribution(inventory) {
    const ranges = {
      "0-10": 0,
      "10-50": 0,
      "50-100": 0,
      "100-500": 0,
      "500-1000": 0,
      "1000+": 0,
    };

    inventory.forEach((item) => {
      const value = item.quantity * (item.productId?.unitPrice || 0);
      if (value <= 10) ranges["0-10"]++;
      else if (value <= 50) ranges["10-50"]++;
      else if (value <= 100) ranges["50-100"]++;
      else if (value <= 500) ranges["100-500"]++;
      else if (value <= 1000) ranges["500-1000"]++;
      else ranges["1000+"]++;
    });

    return ranges;
  }

  _calculateDaysUntilReorder(item) {
    if (item.quantity <= item.reorderPoint) return 0;
    // Simplified - would require average daily sales data
    return Math.floor((item.quantity - item.reorderPoint) / 2);
  }

  _calculateFinancialMetrics(result) {
    const summary = result.summary?.[0] || {};
    const timeSeries = result.timeSeries || [];
    const customerLTV = result.customerLTV?.[0] || {};

    const metrics = {
      profitability: {
        grossProfit: summary.grossProfit || 0,
        grossMargin: summary.grossMargin || 0,
        netProfit: summary.netProfit || 0,
        netProfitMargin: summary.netProfitMargin || 0,
        profitPerTransaction:
          summary.transactionCount > 0
            ? (summary.grossProfit || 0) / summary.transactionCount
            : 0,
      },
      efficiency: {
        averageTransactionValue: summary.averageOrderValue || 0,
        revenuePerCustomer: customerLTV.avgCustomerLifetimeValue || 0,
        customerRetentionRate: customerLTV.customerRetentionRate || 0,
        averagePurchaseFrequency: customerLTV.avgPurchaseFrequency || 0,
      },
      risk: {
        refundRate: result.refundAnalysis?.[0]?.refundRate || 0,
        discountRate:
          summary.totalDiscount > 0
            ? (summary.totalDiscount / (summary.totalRevenue || 1)) * 100
            : 0,
        taxRate:
          summary.totalTax > 0
            ? (summary.totalTax / (summary.totalRevenue || 1)) * 100
            : 0,
      },
      growth: this._calculateGrowthMetrics(timeSeries),
    };

    return metrics;
  }

  _processCustomerMetrics(customerMetrics) {
    const data = customerMetrics[0] || {};

    return {
      newCustomers: data.newCustomers || 0,
      returningCustomers: data.returningCustomers || 0,
      totalCustomers: data.totalCustomers || 0,
      avgCustomerLifetimeValue: data.avgCustomerLifetimeValue || 0,
      customerRetentionRate: data.totalCustomers
        ? (data.returningCustomers / data.totalCustomers) * 100
        : 0,
    };
  }
}

module.exports = new ReportService();
