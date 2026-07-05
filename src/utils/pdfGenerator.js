const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.fonts = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold'
    };
  }

  async generateReceipt(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || 'A6',
          margin: options.margin || 20
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.font(this.fonts.bold)
           .fontSize(14)
           .text(data.storeName || 'Store', { align: 'center' })
           .font(this.fonts.regular)
           .fontSize(10)
           .text(data.title || 'Receipt', { align: 'center' })
           .moveDown();

        // Store details
        doc.fontSize(8);
        if (data.storeAddress) {
          doc.text(data.storeAddress, { align: 'center' });
        }
        if (data.storePhone) {
          doc.text(`Tel: ${data.storePhone}`, { align: 'center' });
        }
        doc.moveDown();

        // Transaction details
        doc.font(this.fonts.bold)
           .fontSize(8);
        
        const fields = [
          { label: 'Date', value: data.date },
          { label: 'Transaction', value: data.transactionNumber },
          { label: 'Attendant', value: data.attendant }
        ];

        fields.forEach(field => {
          if (field.value) {
            doc.text(`${field.label}: ${field.value}`);
          }
        });

        doc.moveDown();

        // Items
        if (data.items && data.items.length > 0) {
          doc.font(this.fonts.bold);
          doc.text('Item', 50, doc.y, { width: 150 })
             .text('Qty', 200, doc.y, { width: 40, align: 'center' })
             .text('Price', 250, doc.y, { width: 60, align: 'right' })
             .text('Total', 320, doc.y, { width: 60, align: 'right' })
             .moveDown();

          doc.font(this.fonts.regular);
          
          data.items.forEach(item => {
            const y = doc.y;
            doc.text(item.name.substring(0, 30), 50, y, { width: 150 })
               .text(item.quantity.toString(), 200, y, { width: 40, align: 'center' })
               .text(`$${item.unitPrice.toFixed(2)}`, 250, y, { width: 60, align: 'right' })
               .text(`$${item.totalPrice.toFixed(2)}`, 320, y, { width: 60, align: 'right' })
               .moveDown();
          });
        }

        doc.moveDown();

        // Totals
        doc.font(this.fonts.bold);
        if (data.subtotal !== undefined) {
          doc.text(`Subtotal: $${data.subtotal.toFixed(2)}`, { align: 'right' });
        }
        if (data.tax !== undefined) {
          doc.text(`Tax: $${data.tax.toFixed(2)}`, { align: 'right' });
        }
        if (data.total !== undefined) {
          doc.text(`Total: $${data.total.toFixed(2)}`, { align: 'right' });
        }

        doc.moveDown();

        // Payment details
        if (data.paymentMethod) {
          doc.font(this.fonts.regular)
             .fontSize(8)
             .text(`Payment Method: ${data.paymentMethod}`);
        }
        if (data.amountPaid !== undefined) {
          doc.text(`Amount Paid: $${data.amountPaid.toFixed(2)}`);
        }
        if (data.change !== undefined) {
          doc.text(`Change: $${data.change.toFixed(2)}`);
        }

        doc.moveDown();

        // QR Code placeholder
        if (data.qrCode) {
          doc.text('Scan QR Code:', { align: 'center' });
          // QR code would be added here using a QR library
        }

        doc.moveDown();

        // Footer
        doc.fontSize(7)
           .text(data.footer || 'Thank you for your purchase!', { align: 'center' })
           .text(data.additionalInfo || '', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateInvoice(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.size || 'A4',
          margin: options.margin || 50
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header with logo placeholder
        doc.font(this.fonts.bold)
           .fontSize(20)
           .text(data.companyName || 'Company Name', { align: 'center' })
           .font(this.fonts.regular)
           .fontSize(12)
           .text('INVOICE', { align: 'center' })
           .moveDown();

        // Invoice details
        const invoiceInfo = [
          { label: 'Invoice #', value: data.invoiceNumber },
          { label: 'Date', value: data.date },
          { label: 'Transaction #', value: data.transactionNumber }
        ];

        let y = doc.y;
        invoiceInfo.forEach(info => {
          doc.font(this.fonts.bold)
             .fontSize(10)
             .text(`${info.label}: `, 50, y, { continued: true })
             .font(this.fonts.regular)
             .text(info.value || '');
          y = doc.y + 5;
        });

        doc.moveDown();

        // Bill to
        if (data.customer) {
          doc.font(this.fonts.bold)
             .fontSize(10)
             .text('Bill To:');
          doc.font(this.fonts.regular)
             .fontSize(9)
             .text(data.customer.name || '')
             .text(data.customer.address || '')
             .text(data.customer.email || '');
          doc.moveDown();
        }

        // Items table header
        const tableTop = doc.y;
        const tableHeaders = ['#', 'Description', 'Qty', 'Unit Price', 'Total'];
        const columnWidths = [30, 200, 50, 80, 80];
        let x = 50;

        doc.font(this.fonts.bold)
           .fontSize(10);
        
        tableHeaders.forEach((header, i) => {
          doc.text(header, x, tableTop, { width: columnWidths[i], align: i === 0 ? 'left' : 'center' });
          x += columnWidths[i];
        });

        doc.moveDown();

        // Items
        let rowY = doc.y;
        doc.font(this.fonts.regular)
           .fontSize(9);

        data.items.forEach((item, index) => {
          x = 50;
          const fields = [
            (index + 1).toString(),
            item.name.substring(0, 30),
            item.quantity.toString(),
            `$${item.unitPrice.toFixed(2)}`,
            `$${item.totalPrice.toFixed(2)}`
          ];

          fields.forEach((field, i) => {
            doc.text(field, x, rowY, { 
              width: columnWidths[i], 
              align: i === 0 ? 'left' : 'center' 
            });
            x += columnWidths[i];
          });

          rowY = doc.y + 5;
          if (rowY > doc.page.height - 100) {
            doc.addPage();
            rowY = 50;
          }
        });

        doc.moveDown();

        // Totals
        const totalsY = doc.y;
        const totalsX = doc.page.width - 150;
        
        doc.font(this.fonts.bold);
        const totals = [
          { label: 'Subtotal:', value: data.subtotal },
          { label: 'Tax:', value: data.tax },
          { label: 'Total:', value: data.total }
        ];

        totals.forEach(total => {
          doc.text(total.label, totalsX, totalsY, { width: 60, align: 'right' })
             .text(`$${total.value.toFixed(2)}`, totalsX + 70, totalsY, { width: 60, align: 'right' });
          totalsY + 15;
        });

        doc.moveDown(2);

        // Footer
        doc.font(this.fonts.regular)
           .fontSize(8)
           .text(data.footer || 'Thank you for your business!', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async savePDF(buffer, filename, directory = 'receipts') {
    const dir = path.join(__dirname, '../../', directory);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }
}

module.exports = new PDFGenerator();