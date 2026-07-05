// const PDFGenerator = require("../utils/pdfGenerator");
// const Receipt = require("../models/Receipt");
// const BaseService = require("./baseService");
// const QRService = require("./qrService");
// const { AppError } = require("../middleware/errorHandler");
// const path = require("path");
// const fs = require("fs");

// class ReceiptService extends BaseService {
//   /**
//    * Generate sales receipt
//    */
//   async generateSalesReceipt(transaction, store) {
//     const qrCode = await QRService.generateQR({
//       type: "SALES",
//       transactionId: transaction._id,
//       storeId: store._id,
//     });

//     const receiptData = {
//       storeName: store.name,
//       title: "Sales Receipt",
//       date: new Date(transaction.salesTimestamp).toLocaleString(),
//       transactionNumber: transaction.transactionNumber,
//       attendant:
//         transaction.salesAttendantId?.firstName +
//           " " +
//           transaction.salesAttendantId?.lastName || "N/A",
//       items: transaction.items.map((item) => ({
//         name: item.name,
//         quantity: item.quantity,
//         unitPrice: item.unitPrice,
//         totalPrice: item.totalPrice,
//       })),
//       subtotal: transaction.subtotal,
//       tax: transaction.taxTotal,
//       total: transaction.totalAmount,
//       qrCode: qrCode,
//       footer: store.receiptFooter || "Thank you for your purchase!",
//       additionalInfo: "Scan QR code for payment",
//     };

//     return await PDFGenerator.generateReceipt(receiptData, { size: "A6" });
//   }

//   /**
//    * Generate payment receipt
//    */
//   async generatePaymentReceipt(transaction, store) {
//     const qrCode = await QRService.generateQR({
//       type: "PAYMENT",
//       transactionId: transaction._id,
//       storeId: store._id,
//     });

//     const receiptData = {
//       storeName: store.name,
//       title: "Payment Receipt",
//       date: new Date(transaction.paymentTimestamp).toLocaleString(),
//       transactionNumber: transaction.transactionNumber,
//       attendant:
//         transaction.financeAttendantId?.firstName +
//           " " +
//           transaction.financeAttendantId?.lastName || "N/A",
//       paymentMethod: transaction.paymentMethod,
//       amountPaid: transaction.amountPaid,
//       change: transaction.changeAmount,
//       total: transaction.totalAmount,
//       qrCode: qrCode,
//       footer: store.receiptFooter || "Thank you for your purchase!",
//       additionalInfo: "Scan QR code for warehouse collection",
//     };

//     return await PDFGenerator.generateReceipt(receiptData, { size: "A6" });
//   }

//   /**
//    * Generate invoice
//    */
//   async generateInvoice(transaction, store) {
//     const invoiceData = {
//       companyName: store.name,
//       invoiceNumber: transaction.finalInvoiceNumber,
//       date: new Date().toLocaleDateString(),
//       transactionNumber: transaction.transactionNumber,
//       customer: {
//         name: "Customer",
//         address: store.address?.street || "",
//         email: store.email || "",
//       },
//       items: transaction.items.map((item) => ({
//         name: item.name,
//         quantity: item.quantity,
//         unitPrice: item.unitPrice,
//         totalPrice: item.totalPrice,
//       })),
//       subtotal: transaction.subtotal,
//       tax: transaction.taxTotal,
//       total: transaction.totalAmount,
//       footer: store.receiptFooter || "Thank you for your business!",
//     };

//     return await PDFGenerator.generateInvoice(invoiceData, { size: "A4" });
//   }

//   /**
//    * Create receipt record
//    */
//   async createReceiptRecord(transaction, type, qrCode) {
//     const count = await Receipt.countDocuments({
//       storeId: transaction.storeId,
//     });
//     const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

//     const receipt = new Receipt({
//       transactionId: transaction._id,
//       storeId: transaction.storeId,
//       type: type,
//       receiptNumber: receiptNumber,
//       qrCode: qrCode,
//       qrPayload: {
//         version: "1.0",
//         type: type,
//         transactionId: transaction._id,
//         timestamp: Date.now(),
//       },
//       printed: false,
//     });

//     await receipt.save();
//     return receipt;
//   }

//   /**
//    * Save receipt to disk
//    */
//   async saveReceipt(buffer, filename) {
//     const receiptsDir = path.join(__dirname, "../../receipts");

//     if (!fs.existsSync(receiptsDir)) {
//       fs.mkdirSync(receiptsDir, { recursive: true });
//     }

//     const filepath = path.join(receiptsDir, filename);
//     fs.writeFileSync(filepath, buffer);
//     return filepath;
//   }

//   /**
//    * Get receipts by transaction
//    */
//   async getReceiptsByTransaction(transactionId) {
//     return await Receipt.find({ transactionId })
//       .populate("printedBy", "firstName lastName")
//       .sort({ createdAt: -1 });
//   }

//   /**
//    * Get receipt by ID with access control
//    */
//   async getReceiptById(id, user) {
//     const receipt = await Receipt.findById(id)
//       .populate("transactionId")
//       .populate("printedBy", "firstName lastName");

//     if (!receipt) {
//       throw new AppError("Receipt not found", 404);
//     }

//     if (
//       user.role !== "SUPER_ADMIN" &&
//       user.role !== "ADMIN" &&
//       receipt.storeId.toString() !== user.storeId?.toString()
//     ) {
//       throw new AppError("Access denied", 403);
//     }

//     return receipt;
//   }

//   /**
//    * Mark receipt as printed
//    */
//   async markAsPrinted(receiptId, userId) {
//     const receipt = await Receipt.findById(receiptId);
//     if (!receipt) {
//       throw new AppError("Receipt not found", 404);
//     }

//     receipt.printed = true;
//     receipt.printedAt = new Date();
//     receipt.printedBy = userId;
//     await receipt.save();

//     return receipt;
//   }

//   /**
//    * Generate receipt data for a transaction
//    */
//   async generateReceiptData(transaction, type = "SALES") {
//     const populatedTransaction = await this._populateTransaction(transaction);

//     const receiptData = {
//       receiptType: type,
//       generatedAt: new Date().toISOString(),

//       // Store Information
//       store: {
//         id: populatedTransaction.storeId?._id || populatedTransaction.storeId,
//         name: populatedTransaction.storeId?.name || "Store",
//         address: populatedTransaction.storeId?.address || "",
//         phone: populatedTransaction.storeId?.phone || "",
//         email: populatedTransaction.storeId?.email || "",
//         taxId: populatedTransaction.storeId?.taxId || "",
//       },

//       // Transaction Information
//       transaction: {
//         id: populatedTransaction._id,
//         number: populatedTransaction.transactionNumber,
//         invoiceNumber: populatedTransaction.finalInvoiceNumber || "",
//         status: populatedTransaction.status,
//         createdAt: populatedTransaction.createdAt,
//         completedAt:
//           populatedTransaction.completedAt || populatedTransaction.updatedAt,
//       },

//       // Items
//       items: populatedTransaction.items.map((item) => ({
//         sku: item.sku || "",
//         name: item.name || "Item",
//         quantity: item.quantity || 0,
//         unitPrice: item.unitPrice || 0,
//         totalPrice: item.totalPrice || 0,
//         taxRate: item.taxRate || 0,
//         taxAmount: item.taxAmount || 0,
//         discountAmount: item.discountAmount || 0,
//         discountPercentage: item.discountPercentage || 0,
//         warehouseLocation: item.warehouseLocation || {},
//         productId: item.productId?._id || item.productId,
//       })),

//       // Financial Summary
//       summary: {
//         subtotal: populatedTransaction.subtotal || 0,
//         taxTotal: populatedTransaction.taxTotal || 0,
//         discountTotal: populatedTransaction.discountTotal || 0,
//         totalAmount: populatedTransaction.totalAmount || 0,
//         amountPaid: populatedTransaction.amountPaid || 0,
//         changeAmount: populatedTransaction.changeAmount || 0,
//         paymentMethod: populatedTransaction.paymentMethod || "N/A",
//       },

//       // Staff Information
//       staff: {
//         salesAttendant: populatedTransaction.salesAttendantId
//           ? {
//               id: populatedTransaction.salesAttendantId._id,
//               name: `${populatedTransaction.salesAttendantId.firstName || ""} ${populatedTransaction.salesAttendantId.lastName || ""}`.trim(),
//               email: populatedTransaction.salesAttendantId.email || "",
//             }
//           : null,
//         financeAttendant: populatedTransaction.financeAttendantId
//           ? {
//               id: populatedTransaction.financeAttendantId._id,
//               name: `${populatedTransaction.financeAttendantId.firstName || ""} ${populatedTransaction.financeAttendantId.lastName || ""}`.trim(),
//               email: populatedTransaction.financeAttendantId.email || "",
//             }
//           : null,
//         warehouseStaff: populatedTransaction.warehouseStaffId
//           ? {
//               id: populatedTransaction.warehouseStaffId._id,
//               name: `${populatedTransaction.warehouseStaffId.firstName || ""} ${populatedTransaction.warehouseStaffId.lastName || ""}`.trim(),
//               email: populatedTransaction.warehouseStaffId.email || "",
//             }
//           : null,
//       },

//       // Timeline
//       timeline: {
//         salesTimestamp: populatedTransaction.salesTimestamp,
//         paymentTimestamp: populatedTransaction.paymentTimestamp,
//         releaseTimestamp: populatedTransaction.releaseTimestamp,
//         completedAt:
//           populatedTransaction.completedAt || populatedTransaction.updatedAt,
//       },

//       // QR Codes
//       qrCodes: {
//         salesQR: populatedTransaction.salesQR || null,
//         paymentQR: populatedTransaction.paymentQR || null,
//         releaseQR: populatedTransaction.releaseQR || null,
//         invoiceQR: populatedTransaction.invoiceQR || null,
//       },
//     };

//     // Cache receipt data on transaction
//     if (populatedTransaction._id) {
//       populatedTransaction.receiptData = receiptData;
//       await populatedTransaction.save();
//     }

//     return receiptData;
//   }

//   /**
//    * Populate transaction with all related data
//    */
//   async _populateTransaction(transaction) {
//     if (transaction.populated) {
//       return transaction;
//     }

//     return await transaction.populate([
//       { path: "storeId", select: "name address phone email taxId" },
//       { path: "salesAttendantId", select: "firstName lastName email" },
//       { path: "financeAttendantId", select: "firstName lastName email" },
//       { path: "warehouseStaffId", select: "firstName lastName email" },
//       { path: "items.productId", select: "name sku unitPrice taxRate" },
//       { path: "itemsReleased.productId", select: "name sku unitPrice" },
//     ]);
//   }

//   /**
//    * Format receipt for printing
//    */
//   formatReceiptForPrinting(receiptData) {
//     const line = "═".repeat(48);
//     const thinLine = "─".repeat(48);

//     let receipt = "";

//     // Header
//     receipt += `${line}\n`;
//     receipt += this._centerText(receiptData.store.name || "STORE", 48) + "\n";
//     receipt += this._centerText(receiptData.store.address || "", 48) + "\n";
//     receipt +=
//       this._centerText(`Tel: ${receiptData.store.phone || ""}`, 48) + "\n";
//     receipt +=
//       this._centerText(`Email: ${receiptData.store.email || ""}`, 48) + "\n";
//     receipt += `${thinLine}\n`;

//     // Transaction Info
//     receipt += `Transaction: ${receiptData.transaction.number}\n`;
//     if (receiptData.transaction.invoiceNumber) {
//       receipt += `Invoice: ${receiptData.transaction.invoiceNumber}\n`;
//     }
//     receipt += `Date: ${new Date(receiptData.transaction.createdAt).toLocaleString()}\n`;
//     receipt += `Status: ${receiptData.transaction.status}\n`;
//     receipt += `${thinLine}\n`;

//     // Items
//     receipt += this._formatItemsSection(receiptData.items);

//     // Summary
//     receipt += `${thinLine}\n`;
//     receipt += this._formatSummarySection(receiptData.summary);

//     // Staff
//     receipt += `${thinLine}\n`;
//     receipt += this._formatStaffSection(receiptData.staff);

//     // Footer
//     receipt += `${thinLine}\n`;
//     receipt += this._centerText("Thank you for your business!", 48) + "\n";
//     receipt +=
//       this._centerText("Please keep this receipt for your records", 48) + "\n";
//     receipt += `${line}\n`;

//     return receipt;
//   }

//   /**
//    * Center text in a fixed width
//    */
//   _centerText(text, width) {
//     const trimmed = text.trim();
//     if (trimmed.length >= width) return trimmed;
//     const padding = Math.floor((width - trimmed.length) / 2);
//     return " ".repeat(padding) + trimmed;
//   }

//   /**
//    * Format items section
//    */
//   _formatItemsSection(items) {
//     if (!items || items.length === 0) {
//       return "No items in this receipt\n";
//     }

//     let section = "ITEMS\n";
//     section += "─".repeat(48) + "\n";

//     // Header
//     section += `${this._padRight("Item", 20)}${this._padRight("Qty", 6)}${this._padRight("Price", 10)}${"Total"}\n`;
//     section += "─".repeat(48) + "\n";

//     // Items
//     for (const item of items) {
//       const name =
//         item.name.length > 20 ? item.name.substring(0, 18) + ".." : item.name;
//       section += `${this._padRight(name, 20)}${this._padRight(item.quantity.toString(), 6)}${this._padRight(item.unitPrice.toFixed(2), 10)}${item.totalPrice.toFixed(2)}\n`;

//       // Show tax and discount if applicable
//       if (item.taxAmount > 0 || item.discountAmount > 0) {
//         let details = [];
//         if (item.taxAmount > 0)
//           details.push(`Tax: ${item.taxAmount.toFixed(2)}`);
//         if (item.discountAmount > 0)
//           details.push(`Discount: ${item.discountAmount.toFixed(2)}`);
//         section += `  ${details.join(" | ")}\n`;
//       }
//     }

//     return section;
//   }

//   /**
//    * Format summary section
//    */
//   _formatSummarySection(summary) {
//     let section = "";
//     section += `Subtotal: ${this._padLeft(summary.subtotal.toFixed(2), 39)}\n`;
//     section += `Tax: ${this._padLeft(summary.taxTotal.toFixed(2), 44)}\n`;
//     if (summary.discountTotal > 0) {
//       section += `Discount: ${this._padLeft(summary.discountTotal.toFixed(2), 40)}\n`;
//     }
//     section += `${"─".repeat(48)}\n`;
//     section += `TOTAL: ${this._padLeft(summary.totalAmount.toFixed(2), 42)}\n`;
//     section += `${"─".repeat(48)}\n`;
//     section += `Amount Paid: ${this._padLeft(summary.amountPaid.toFixed(2), 35)}\n`;
//     section += `Change: ${this._padLeft(summary.changeAmount.toFixed(2), 41)}\n`;
//     section += `Payment Method: ${summary.paymentMethod}\n`;
//     return section;
//   }

//   /**
//    * Format staff section
//    */
//   _formatStaffSection(staff) {
//     let section = "STAFF\n";
//     section += "─".repeat(48) + "\n";

//     if (staff.salesAttendant) {
//       section += `Sales: ${staff.salesAttendant.name}\n`;
//     }
//     if (staff.financeAttendant) {
//       section += `Finance: ${staff.financeAttendant.name}\n`;
//     }
//     if (staff.warehouseStaff) {
//       section += `Warehouse: ${staff.warehouseStaff.name}\n`;
//     }

//     return section;
//   }

//   /**
//    * Pad right
//    */
//   _padRight(text, width) {
//     const str = String(text);
//     return str + " ".repeat(Math.max(0, width - str.length));
//   }

//   /**
//    * Pad left
//    */
//   _padLeft(text, width) {
//     const str = String(text);
//     return " ".repeat(Math.max(0, width - str.length)) + str;
//   }
// }

// module.exports = new ReceiptService();

// services/receiptService.js
const PDFGenerator = require("../utils/pdfGenerator");
const Receipt = require("../models/Receipt");
const BaseService = require("./baseService");
const QRService = require("./qrService");
const { AppError } = require("../middleware/errorHandler");
const path = require("path");
const fs = require("fs");

class ReceiptService extends BaseService {
  /**
   * Generate complete receipt data for a transaction
   */
  // async generateReceiptData(transaction, type = "SALES") {
  //   const populatedTransaction = await this._populateTransaction(transaction);

  //   const receiptData = {
  //     receiptType: type,
  //     generatedAt: new Date().toISOString(),
  //     version: "1.0",

  //     // Store Information
  //     store: {
  //       id: populatedTransaction.storeId?._id || populatedTransaction.storeId,
  //       name: populatedTransaction.storeId?.name || "Store",
  //       address: populatedTransaction.storeId?.address || "",
  //       phone: populatedTransaction.storeId?.phone || "",
  //       email: populatedTransaction.storeId?.email || "",
  //       taxId: populatedTransaction.storeId?.taxId || "",
  //       website: populatedTransaction.storeId?.website || "",
  //       logo: populatedTransaction.storeId?.logo || null,
  //       receiptFooter: populatedTransaction.storeId?.receiptFooter || "Thank you for your business!",
  //     },

  //     // Transaction Information
  //     transaction: {
  //       id: populatedTransaction._id,
  //       number: populatedTransaction.transactionNumber,
  //       invoiceNumber: populatedTransaction.finalInvoiceNumber || "",
  //       status: populatedTransaction.status,
  //       createdAt: populatedTransaction.createdAt,
  //       completedAt: populatedTransaction.completedAt || populatedTransaction.updatedAt,
  //       salesTimestamp: populatedTransaction.salesTimestamp,
  //       paymentTimestamp: populatedTransaction.paymentTimestamp,
  //       releaseTimestamp: populatedTransaction.releaseTimestamp,
  //     },

  //     // Items with full details
  //     items: populatedTransaction.items.map((item) => ({
  //       id: item._id,
  //       productId: item.productId?._id || item.productId,
  //       sku: item.sku || "",
  //       name: item.name || "Item",
  //       quantity: item.quantity || 0,
  //       unitPrice: item.unitPrice || 0,
  //       totalPrice: item.totalPrice || 0,
  //       taxRate: item.taxRate || 0,
  //       taxAmount: item.taxAmount || 0,
  //       discountAmount: item.discountAmount || 0,
  //       discountPercentage: item.discountPercentage || 0,
  //       warehouseLocation: item.warehouseLocation || {},
  //       isReleased: item.isReleased || false,
  //       releasedQuantity: item.releasedQuantity || 0,
  //       product: item.productId ? {
  //         name: item.productId.name,
  //         sku: item.productId.sku,
  //         description: item.productId.description,
  //         category: item.productId.category,
  //         brand: item.productId.brand,
  //       } : null,
  //     })),

  //     // Released Items
  //     releasedItems: populatedTransaction.itemsReleased?.map((item) => ({
  //       productId: item.productId?._id || item.productId,
  //       productName: item.productName || "",
  //       sku: item.sku || "",
  //       quantityReleased: item.quantityReleased || 0,
  //       unitPrice: item.unitPrice || 0,
  //       totalPrice: item.totalPrice || 0,
  //       releasedBy: item.releasedBy?._id || item.releasedBy,
  //       releasedAt: item.releasedAt,
  //       releasedByName: item.releasedBy ?
  //         `${item.releasedBy.firstName || ''} ${item.releasedBy.lastName || ''}`.trim() : 'N/A',
  //     })) || [],

  //     // Financial Summary
  //     summary: {
  //       subtotal: populatedTransaction.subtotal || 0,
  //       taxTotal: populatedTransaction.taxTotal || 0,
  //       discountTotal: populatedTransaction.discountTotal || 0,
  //       totalAmount: populatedTransaction.totalAmount || 0,
  //       amountPaid: populatedTransaction.amountPaid || 0,
  //       changeAmount: populatedTransaction.changeAmount || 0,
  //       paymentMethod: populatedTransaction.paymentMethod || "N/A",
  //       paymentReference: populatedTransaction.paymentReference || "",
  //     },

  //     // Staff Information
  //     staff: {
  //       salesAttendant: populatedTransaction.salesAttendantId ? {
  //         id: populatedTransaction.salesAttendantId._id,
  //         name: `${populatedTransaction.salesAttendantId.firstName || ""} ${populatedTransaction.salesAttendantId.lastName || ""}`.trim(),
  //         email: populatedTransaction.salesAttendantId.email || "",
  //         phone: populatedTransaction.salesAttendantId.phone || "",
  //       } : null,
  //       financeAttendant: populatedTransaction.financeAttendantId ? {
  //         id: populatedTransaction.financeAttendantId._id,
  //         name: `${populatedTransaction.financeAttendantId.firstName || ""} ${populatedTransaction.financeAttendantId.lastName || ""}`.trim(),
  //         email: populatedTransaction.financeAttendantId.email || "",
  //         phone: populatedTransaction.financeAttendantId.phone || "",
  //       } : null,
  //       warehouseStaff: populatedTransaction.warehouseStaffId ? {
  //         id: populatedTransaction.warehouseStaffId._id,
  //         name: `${populatedTransaction.warehouseStaffId.firstName || ""} ${populatedTransaction.warehouseStaffId.lastName || ""}`.trim(),
  //         email: populatedTransaction.warehouseStaffId.email || "",
  //         phone: populatedTransaction.warehouseStaffId.phone || "",
  //       } : null,
  //     },

  //     // Timeline
  //     timeline: {
  //       created: populatedTransaction.createdAt,
  //       sales: populatedTransaction.salesTimestamp,
  //       payment: populatedTransaction.paymentTimestamp,
  //       release: populatedTransaction.releaseTimestamp,
  //       completed: populatedTransaction.completedAt || populatedTransaction.updatedAt,
  //     },

  //     // QR Codes
  //     qrCodes: {
  //       salesQR: populatedTransaction.salesQR || null,
  //       paymentQR: populatedTransaction.paymentQR || null,
  //       releaseQR: populatedTransaction.releaseQR || null,
  //       invoiceQR: populatedTransaction.invoiceQR || null,
  //     },

  //     // Additional Data
  //     additionalData: {
  //       customerName: populatedTransaction.customerName || "",
  //       customerEmail: populatedTransaction.customerEmail || "",
  //       customerPhone: populatedTransaction.customerPhone || "",
  //       notes: populatedTransaction.notes || "",
  //       tags: populatedTransaction.tags || [],
  //       orderType: populatedTransaction.orderType || "IN_STORE",
  //       deliveryAddress: populatedTransaction.deliveryAddress || null,
  //     }
  //   };

  //   // Cache receipt data on transaction
  //   if (populatedTransaction._id) {
  //     populatedTransaction.receiptData = receiptData;
  //     await populatedTransaction.save();
  //   }

  //   return receiptData;
  // }

  /**
   * Generate receipt data for a transaction
   * MATCHES ACTUAL SCHEMA STRUCTURE
   */
  async generateReceiptData(transaction, type = "SALES") {
    const populatedTransaction = await this._populateTransaction(transaction);

    // Build items array from Transaction.items (which are ObjectIds referencing TransactionItem)
    const items = [];
    if (populatedTransaction.items && populatedTransaction.items.length > 0) {
      for (const itemRef of populatedTransaction.items) {
        // If items are populated, they should be TransactionItem documents
        if (itemRef._id) {
          // Check if it's a populated TransactionItem
          const product = itemRef.productId || {};
          items.push({
            id: itemRef._id,
            productId: product._id || itemRef.productId,
            sku: itemRef.sku || product.sku || "",
            name: itemRef.name || product.name || "Item",
            quantity: itemRef.quantity || 0,
            unitPrice: itemRef.unitPrice || 0,
            totalPrice: itemRef.totalPrice || 0,
            taxRate: itemRef.taxRate || product.taxRate || 0,
            taxAmount: itemRef.taxAmount || 0,
            discountAmount: itemRef.discountAmount || 0,
            discountPercentage: itemRef.discountPercentage || 0,
            warehouseLocation: itemRef.warehouseLocation || {},
            isReleased: itemRef.isReleased || false,
            releasedQuantity: itemRef.releasedQuantity || 0,
            product: product._id
              ? {
                  name: product.name,
                  sku: product.sku,
                  description: product.description,
                  category: product.category,
                  brand: product.brand,
                }
              : null,
          });
        }
      }
    }

    // Build released items from Transaction.itemsReleased
    const releasedItems = (populatedTransaction.itemsReleased || []).map(
      (item) => {
        const releasedBy = item.releasedBy || {};
        return {
          productId: item.productId?._id || item.productId,
          productName: item.productName || "",
          sku: item.sku || "",
          quantityReleased: item.quantityReleased || 0,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          releasedBy: item.releasedBy?._id || item.releasedBy,
          releasedAt: item.releasedAt,
          releasedByName: releasedBy._id
            ? `${releasedBy.firstName || ""} ${releasedBy.lastName || ""}`.trim()
            : "N/A",
        };
      },
    );

    // Get store data (safe access)
    const store = populatedTransaction.storeId || {};
    const storeAddress = store.address || {};

    const receiptData = {
      receiptType: type,
      generatedAt: new Date().toISOString(),
      version: "1.0",

      // Store Information - MATCHES Store schema
      store: {
        id: store._id,
        name: store.name || "Store",
        address: storeAddress.street || "",
        city: storeAddress.city || "",
        state: storeAddress.state || "",
        country: storeAddress.country || "",
        zipCode: storeAddress.zipCode || "",
        phone: store.phone || "",
        email: store.email || "",
        taxRate: store.taxRate || 0,
        currency: store.currency || "USD",
        receiptFooter: store.receiptFooter || "Thank you for your business!",
      },

      // Transaction Information - MATCHES Transaction schema
      transaction: {
        id: populatedTransaction._id,
        number: populatedTransaction.transactionNumber,
        invoiceNumber: populatedTransaction.finalInvoiceNumber || "",
        status: populatedTransaction.status,
        createdAt: populatedTransaction.createdAt,
        updatedAt: populatedTransaction.updatedAt,
        salesTimestamp: populatedTransaction.salesTimestamp,
        paymentTimestamp: populatedTransaction.paymentTimestamp,
        releaseTimestamp: populatedTransaction.releaseTimestamp,
      },

      // Items - MATCHES TransactionItem schema
      items: items,

      // Released Items - MATCHES Transaction.itemsReleased schema
      releasedItems: releasedItems,

      // Financial Summary - MATCHES Transaction schema
      summary: {
        subtotal: populatedTransaction.subtotal || 0,
        taxTotal: populatedTransaction.taxTotal || 0,
        discountTotal: populatedTransaction.discountTotal || 0,
        totalAmount: populatedTransaction.totalAmount || 0,
        amountPaid: populatedTransaction.amountPaid || 0,
        changeAmount: populatedTransaction.changeAmount || 0,
        paymentMethod: populatedTransaction.paymentMethod || "N/A",
      },

      // Staff Information - MATCHES populated User schema
      staff: {
        salesAttendant: populatedTransaction.salesAttendantId
          ? {
              id: populatedTransaction.salesAttendantId._id,
              name: `${populatedTransaction.salesAttendantId.firstName || ""} ${populatedTransaction.salesAttendantId.lastName || ""}`.trim(),
              email: populatedTransaction.salesAttendantId.email || "",
              phone: populatedTransaction.salesAttendantId.phone || "",
              role: populatedTransaction.salesAttendantId.role || "",
            }
          : null,
        financeAttendant: populatedTransaction.financeAttendantId
          ? {
              id: populatedTransaction.financeAttendantId._id,
              name: `${populatedTransaction.financeAttendantId.firstName || ""} ${populatedTransaction.financeAttendantId.lastName || ""}`.trim(),
              email: populatedTransaction.financeAttendantId.email || "",
              phone: populatedTransaction.financeAttendantId.phone || "",
              role: populatedTransaction.financeAttendantId.role || "",
            }
          : null,
        warehouseStaff: populatedTransaction.warehouseStaffId
          ? {
              id: populatedTransaction.warehouseStaffId._id,
              name: `${populatedTransaction.warehouseStaffId.firstName || ""} ${populatedTransaction.warehouseStaffId.lastName || ""}`.trim(),
              email: populatedTransaction.warehouseStaffId.email || "",
              phone: populatedTransaction.warehouseStaffId.phone || "",
              role: populatedTransaction.warehouseStaffId.role || "",
            }
          : null,
      },

      // Timeline - MATCHES Transaction timestamps
      timeline: {
        created: populatedTransaction.createdAt,
        sales: populatedTransaction.salesTimestamp,
        payment: populatedTransaction.paymentTimestamp,
        release: populatedTransaction.releaseTimestamp,
        updated: populatedTransaction.updatedAt,
      },

      // QR Codes - MATCHES Transaction QR fields
      qrCodes: {
        salesQR: populatedTransaction.salesQR || null,
        paymentQR: populatedTransaction.paymentQR || null,
        releaseQR: populatedTransaction.releaseQR || null,
        invoiceQR: populatedTransaction.invoiceQR || null,
        salesQRGeneratedAt: populatedTransaction.salesQRGeneratedAt || null,
        paymentQRGeneratedAt: populatedTransaction.paymentQRGeneratedAt || null,
        releaseQRGeneratedAt: populatedTransaction.releaseQRGeneratedAt || null,
        invoiceQRGeneratedAt: populatedTransaction.invoiceQRGeneratedAt || null,
      },

      // Workflow Status - MATCHES Transaction statuses
      workflow: {
        salesStatus: populatedTransaction.salesStatus || "PENDING",
        paymentStatus: populatedTransaction.paymentStatus || "PENDING",
        warehouseStatus: populatedTransaction.warehouseStatus || "PENDING",
        status: populatedTransaction.status || "PENDING",
      },

      // Additional Data - safe access for fields that may not exist
      additionalData: {
        salesReceiptPrinted: populatedTransaction.salesReceiptPrinted || false,
        paymentReceiptPrinted:
          populatedTransaction.paymentReceiptPrinted || false,
        finalInvoicePrinted: populatedTransaction.finalInvoicePrinted || false,
      },
    };

    // Cache receipt data on transaction
    if (populatedTransaction._id) {
      populatedTransaction.receiptData = receiptData;
      await populatedTransaction.save();
    }

    // // Create receipt record
    //   const receipt = await this.createReceiptRecord(
    //     populatedTransaction,
    //     type,
    //     qrCode,
    //     receiptData
    //   );
    const QRCode = require("qrcode");

    const qrPayload = {
      version: "1.0",
      type,
      transactionId: populatedTransaction._id.toString(),
      storeId: populatedTransaction.storeId._id.toString(),
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      step: type,
    };

    const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));

    const receipt = await this.createReceiptRecord(
      populatedTransaction,
      type,
      qrCode,
      receiptData,
    );

    return {
      receipt,
      receiptData,
    };
    // return receiptData;
  }

  /**
   * Populate transaction with all related data
   */
  // async _populateTransaction(transaction) {
  //   if (transaction.populated) {
  //     return transaction;
  //   }

  //   return await transaction.populate([
  //     { path: "storeId", select: "name address phone email taxId website logo receiptFooter" },
  //     { path: "salesAttendantId", select: "firstName lastName email phone" },
  //     { path: "financeAttendantId", select: "firstName lastName email phone" },
  //     { path: "warehouseStaffId", select: "firstName lastName email phone" },
  //     { path: "items.productId", select: "name sku unitPrice taxRate description category brand" },
  //     { path: "itemsReleased.productId", select: "name sku unitPrice" },
  //     { path: "itemsReleased.releasedBy", select: "firstName lastName" },
  //   ]);
  // }

  /**
   * Populate transaction with all related data
   * MATCHES ACTUAL SCHEMA STRUCTURE
   */
  // async _populateTransaction(transaction) {
  //   if (transaction.populated) {
  //     return transaction;
  //   }

  //   // Populate store
  //   await transaction.populate({
  //     path: 'storeId',
  //     select: 'name address phone email taxRate currency receiptFooter'
  //   });

  //   // Populate staff
  //   await transaction.populate({
  //     path: 'salesAttendantId',
  //     select: 'firstName lastName email phone role'
  //   });

  //   await transaction.populate({
  //     path: 'financeAttendantId',
  //     select: 'firstName lastName email phone role'
  //   });

  //   await transaction.populate({
  //     path: 'warehouseStaffId',
  //     select: 'firstName lastName email phone role'
  //   });

  //   // Populate items (TransactionItem documents)
  //   await transaction.populate({
  //     path: 'items',
  //     populate: {
  //       path: 'productId',
  //       select: 'name sku description category brand unitPrice taxRate'
  //     }
  //   });

  //   // Populate released items
  //   await transaction.populate({
  //     path: 'itemsReleased.releasedBy',
  //     select: 'firstName lastName'
  //   });

  //   await transaction.populate({
  //     path: 'itemsReleased.productId',
  //     select: 'name sku unitPrice'
  //   });

  //   transaction.populated = true;
  //   return transaction;
  // }

  // services/receiptService.js - Fix populate method

  async _populateTransaction(transaction) {
    if (transaction.populated) {
      return transaction;
    }

    // Populate store
    await transaction.populate({
      path: "storeId",
      select: "name address phone email taxRate currency receiptFooter",
    });

    // Populate staff
    await transaction.populate({
      path: "salesAttendantId",
      select: "firstName lastName email phone role",
    });

    await transaction.populate({
      path: "financeAttendantId",
      select: "firstName lastName email phone role",
    });

    await transaction.populate({
      path: "warehouseStaffId",
      select: "firstName lastName email phone role",
    });

    // IMPORTANT: Populate items with product details
    await transaction.populate({
      path: "items",
      populate: {
        path: "productId",
        select: "name sku unitPrice taxRate description category brand",
      },
    });

    // Populate released items
    await transaction.populate({
      path: "itemsReleased.releasedBy",
      select: "firstName lastName",
    });

    await transaction.populate({
      path: "itemsReleased.productId",
      select: "name sku unitPrice",
    });

    transaction.populated = true;
    return transaction;
  }

  /**
   * Format receipt for printing with enhanced data
   */
  formatReceiptForPrinting(receiptData) {
    const line = "═".repeat(56);
    const thinLine = "─".repeat(56);
    const width = 56;

    let receipt = "";

    // Header
    receipt += `${line}\n`;
    receipt +=
      this._centerText(receiptData.store.name || "STORE", width) + "\n";
    receipt += this._centerText(receiptData.store.address || "", width) + "\n";
    receipt +=
      this._centerText(`Tel: ${receiptData.store.phone || ""}`, width) + "\n";
    receipt +=
      this._centerText(`Email: ${receiptData.store.email || ""}`, width) + "\n";
    if (receiptData.store.taxId) {
      receipt +=
        this._centerText(`Tax ID: ${receiptData.store.taxId}`, width) + "\n";
    }
    receipt += `${thinLine}\n`;

    // Receipt Type
    receipt +=
      this._centerText(`=== ${receiptData.receiptType} RECEIPT ===`, width) +
      "\n";
    receipt += `${thinLine}\n`;

    // Transaction Info
    receipt += `Transaction: ${receiptData.transaction.number}\n`;
    if (receiptData.transaction.invoiceNumber) {
      receipt += `Invoice: ${receiptData.transaction.invoiceNumber}\n`;
    }
    receipt += `Date: ${new Date(receiptData.transaction.createdAt).toLocaleString()}\n`;
    receipt += `Status: ${receiptData.transaction.status}\n`;
    receipt += `${thinLine}\n`;

    // Items
    receipt += this._formatItemsSection(receiptData.items);

    // Released Items (if any)
    if (receiptData.releasedItems && receiptData.releasedItems.length > 0) {
      receipt += `${thinLine}\n`;
      receipt += this._formatReleasedItemsSection(receiptData.releasedItems);
    }

    // Summary
    receipt += `${thinLine}\n`;
    receipt += this._formatSummarySection(receiptData.summary);

    // Staff
    receipt += `${thinLine}\n`;
    receipt += this._formatStaffSection(receiptData.staff);

    // Timeline
    receipt += `${thinLine}\n`;
    receipt += this._formatTimelineSection(receiptData.timeline);

    // Additional Data
    if (receiptData.additionalData.notes) {
      receipt += `${thinLine}\n`;
      receipt += `Notes: ${receiptData.additionalData.notes}\n`;
    }

    // Footer
    receipt += `${thinLine}\n`;
    receipt +=
      this._centerText(
        receiptData.store.receiptFooter || "Thank you for your business!",
        width,
      ) + "\n";
    receipt +=
      this._centerText("Please keep this receipt for your records", width) +
      "\n";
    receipt += `${line}\n`;

    return receipt;
  }

  /**
   * Format items section with enhanced details
   */
  _formatItemsSection(items) {
    if (!items || items.length === 0) {
      return "No items in this receipt\n";
    }

    let section = "ITEMS\n";
    section += "─".repeat(56) + "\n";
    section += `${this._padRight("Item", 22)}${this._padRight("Qty", 6)}${this._padRight("Price", 12)}${this._padRight("Tax", 8)}${"Total"}\n`;
    section += "─".repeat(56) + "\n";

    let totalItems = 0;
    let totalQuantity = 0;

    for (const item of items) {
      const name =
        item.name.length > 22 ? item.name.substring(0, 20) + ".." : item.name;
      section += `${this._padRight(name, 22)}${this._padRight(item.quantity.toString(), 6)}${this._padRight("$" + item.unitPrice.toFixed(2), 12)}${this._padRight("$" + item.taxAmount.toFixed(2), 8)}$${item.totalPrice.toFixed(2)}\n`;

      // Show SKU and discount if applicable
      if (item.sku) {
        section += `  SKU: ${item.sku}`;
        if (item.discountAmount > 0) {
          section += ` | Discount: $${item.discountAmount.toFixed(2)}`;
        }
        if (
          item.warehouseLocation &&
          (item.warehouseLocation.aisle || item.warehouseLocation.shelf)
        ) {
          section += ` | Location: ${item.warehouseLocation.aisle || ""}${item.warehouseLocation.shelf ? "-" + item.warehouseLocation.shelf : ""}`;
        }
        section += "\n";
      }

      totalItems++;
      totalQuantity += item.quantity;
    }

    section += "─".repeat(56) + "\n";
    section += `${this._padRight(`Total: ${totalItems} items`, 40)}Qty: ${totalQuantity}\n`;

    return section;
  }

  /**
   * Format released items section
   */
  _formatReleasedItemsSection(releasedItems) {
    if (!releasedItems || releasedItems.length === 0) {
      return "";
    }

    let section = "RELEASED ITEMS\n";
    section += "─".repeat(56) + "\n";
    section += `${this._padRight("Item", 22)}${this._padRight("Qty", 6)}${this._padRight("Price", 12)}${"Total"}\n`;
    section += "─".repeat(56) + "\n";

    for (const item of releasedItems) {
      const name = item.productName || "Item";
      const displayName =
        name.length > 22 ? name.substring(0, 20) + ".." : name;
      section += `${this._padRight(displayName, 22)}${this._padRight(item.quantityReleased.toString(), 6)}${this._padRight("$" + item.unitPrice.toFixed(2), 12)}$${item.totalPrice.toFixed(2)}\n`;
      if (item.releasedByName) {
        section += `  Released By: ${item.releasedByName}\n`;
      }
    }

    return section;
  }

  /**
   * Format summary section with more details
   */
  _formatSummarySection(summary) {
    let section = "SUMMARY\n";
    section += "─".repeat(56) + "\n";
    section += `Subtotal: ${this._padLeft("$" + summary.subtotal.toFixed(2), 47)}\n`;
    section += `Tax: ${this._padLeft("$" + summary.taxTotal.toFixed(2), 52)}\n`;
    if (summary.discountTotal > 0) {
      section += `Discount: ${this._padLeft("- $" + summary.discountTotal.toFixed(2), 48)}\n`;
    }
    section += "─".repeat(56) + "\n";
    section += `TOTAL: ${this._padLeft("$" + summary.totalAmount.toFixed(2), 50)}\n`;
    section += "─".repeat(56) + "\n";
    section += `Amount Paid: ${this._padLeft("$" + summary.amountPaid.toFixed(2), 44)}\n`;
    section += `Change: ${this._padLeft("$" + summary.changeAmount.toFixed(2), 50)}\n`;
    section += `Payment Method: ${summary.paymentMethod}\n`;
    if (summary.paymentReference) {
      section += `Reference: ${summary.paymentReference}\n`;
    }
    return section;
  }

  /**
   * Format staff section
   */
  _formatStaffSection(staff) {
    let section = "STAFF\n";
    section += "─".repeat(56) + "\n";

    if (staff.salesAttendant) {
      section += `Sales: ${staff.salesAttendant.name}`;
      if (staff.salesAttendant.email) {
        section += ` (${staff.salesAttendant.email})`;
      }
      section += "\n";
    }
    if (staff.financeAttendant) {
      section += `Finance: ${staff.financeAttendant.name}`;
      if (staff.financeAttendant.email) {
        section += ` (${staff.financeAttendant.email})`;
      }
      section += "\n";
    }
    if (staff.warehouseStaff) {
      section += `Warehouse: ${staff.warehouseStaff.name}`;
      if (staff.warehouseStaff.email) {
        section += ` (${staff.warehouseStaff.email})`;
      }
      section += "\n";
    }

    return section;
  }

  /**
   * Format timeline section
   */
  _formatTimelineSection(timeline) {
    let section = "TIMELINE\n";
    section += "─".repeat(56) + "\n";

    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleString();
    };

    section += `Created: ${formatDate(timeline.created)}\n`;
    if (timeline.sales) section += `Sales: ${formatDate(timeline.sales)}\n`;
    if (timeline.payment)
      section += `Payment: ${formatDate(timeline.payment)}\n`;
    if (timeline.release)
      section += `Release: ${formatDate(timeline.release)}\n`;
    if (timeline.completed)
      section += `Completed: ${formatDate(timeline.completed)}\n`;

    return section;
  }

  /**
   * Generate QR for receipt
   */
  async generateReceiptQR(transactionId, storeId, type, step) {
    return await QRService.generateQR({
      type: type,
      transactionId: transactionId,
      storeId: storeId,
      step: step || type,
      metadata: {
        receiptType: type,
        generatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Create receipt record
   */
  async createReceiptRecord(transaction, type, qrCode, receiptData) {
    const count = await Receipt.countDocuments({
      storeId: transaction.storeId,
    });
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

    const receipt = new Receipt({
      transactionId: transaction._id,
      storeId: transaction.storeId,
      type: type,
      receiptNumber: receiptNumber,
      qrCode: qrCode,
      qrPayload: {
        version: "1.0",
        type: type,
        // transactionId: transaction._id,
        // storeId: transaction.storeId,
        transactionId: transaction._id.toString(),
        storeId: transaction.storeId._id.toString(),
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        step: type,
      },
      receiptData: receiptData,
      printed: false,
      printCount: 0,
    });
    //     console.log("Receipt object:");
    // console.dir(receipt.toObject(), { depth: null });

    // console.log("Schema qrPayload:");
    // console.log(Receipt.schema.path("qrPayload"));
    await receipt.save();
    return receipt;
  }

  /**
   * Generate PDF for receipt
   */
  async generateReceiptPDF(transaction, store, type) {
    const receiptData = await this.generateReceiptData(transaction, type);
    const formattedReceipt = this.formatReceiptForPrinting(receiptData);

    // Generate PDF using the formatted text or HTML
    const buffer = await PDFGenerator.generateReceipt(
      {
        ...receiptData,
        formattedText: formattedReceipt,
      },
      { size: type === "INVOICE" ? "A4" : "A6" },
    );

    return buffer;
  }

  /**
   * Save receipt to disk
   */
  async saveReceipt(buffer, filename) {
    const receiptsDir = path.join(__dirname, "../../receipts");
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }
    const filepath = path.join(receiptsDir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }

  /**
   * Get receipts by transaction with filtering
   */
  async getReceiptsByTransaction(transactionId, type = null) {
    const query = { transactionId };
    if (type) {
      query.type = type;
    }
    return await Receipt.find(query)
      .populate("printedBy", "firstName lastName")
      .sort({ createdAt: -1 });
  }

  /**
   * Get receipt by ID with access control
   */
  async getReceiptById(id, user) {
    const receipt = await Receipt.findById(id)
      .populate("transactionId")
      .populate("printedBy", "firstName lastName");

    if (!receipt) {
      throw new AppError("Receipt not found", 404);
    }

    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "ADMIN" &&
      receipt.storeId.toString() !== user.storeId?.toString()
    ) {
      throw new AppError("Access denied", 403);
    }

    return receipt;
  }

  /**
   * Mark receipt as printed
   */
  async markAsPrinted(receiptId, userId) {
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      throw new AppError("Receipt not found", 404);
    }

    receipt.printed = true;
    receipt.printedAt = new Date();
    receipt.printedBy = userId;
    receipt.printCount = (receipt.printCount || 0) + 1;
    await receipt.save();

    return receipt;
  }

  /**
   * Get receipts with pagination and filters
   */
  async getReceipts(filters = {}) {
    const {
      page = 1,
      limit = 20,
      storeId,
      type,
      startDate,
      endDate,
      search,
    } = filters;

    const query = {};

    if (storeId) {
      query.storeId = storeId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { receiptNumber: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      Receipt.find(query)
        .populate("transactionId", "transactionNumber totalAmount status")
        .populate("storeId", "name")
        .populate("printedBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Receipt.countDocuments(query),
    ]);

    return {
      receipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Utility methods
  _centerText(text, width) {
    const trimmed = text.trim();
    if (trimmed.length >= width) return trimmed;
    const padding = Math.floor((width - trimmed.length) / 2);
    return " ".repeat(padding) + trimmed;
  }

  _padRight(text, width) {
    const str = String(text);
    return str + " ".repeat(Math.max(0, width - str.length));
  }

  _padLeft(text, width) {
    const str = String(text);
    return " ".repeat(Math.max(0, width - str.length)) + str;
  }
}

module.exports = new ReceiptService();
