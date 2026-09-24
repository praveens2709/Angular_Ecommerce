const PDFDocument = require('pdfkit');
const { getStoreInfo } = require('./store');

/**
 * GST on apparel depends on the selling price per piece. Defaults: 5% up to ₹2,500, 18% above
 * (Indian rates from 22 Sep 2025). Override with GST_RATE_LOW / GST_RATE_HIGH / GST_THRESHOLD,
 * and confirm the rates for your products with your accountant.
 */
const gstRates = () => ({
  low: Number(process.env.GST_RATE_LOW ?? 5),
  high: Number(process.env.GST_RATE_HIGH ?? 18),
  threshold: Number(process.env.GST_THRESHOLD ?? 2500),
});

const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) => `Rs. ${round2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Financial year label for a date, e.g. 2026-27 (Apr–Mar) */
const financialYear = (date) => {
  const y = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
};

/** Prices are GST-inclusive; split each line into taxable value and tax */
const buildLines = (orders, sameState) => {
  const { low, high, threshold } = gstRates();
  return orders.map((order) => {
    const item = order.products[0];
    const total = order.totalAmount;
    const unitAfterDiscount = item.quantity ? total / item.quantity : total;
    const rate = unitAfterDiscount > threshold ? high : low;
    const taxable = round2(total / (1 + rate / 100));
    const tax = round2(total - taxable);
    return {
      name: `${item.productName}${item.size ? ` (${item.size})` : ''}`,
      quantity: item.quantity,
      unitPrice: item.price,
      discount: order.discount || 0,
      rate,
      taxable,
      cgst: sameState ? round2(tax / 2) : 0,
      sgst: sameState ? round2(tax - round2(tax / 2)) : 0,
      igst: sameState ? 0 : tax,
      total,
    };
  });
};

/** Streams a tax invoice PDF for the given (non-cancelled) orders of one checkout */
exports.writeInvoice = (res, { orders, invoiceNumber, invoiceDate }) => {
  const store = getStoreInfo();
  const first = orders[0];
  const ship = first.shippingAddress || {};
  const sameState = !!store.state && !!ship.state && store.state.toLowerCase() === ship.state.toLowerCase();
  const lines = buildLines(orders, sameState);
  const hsn = process.env.DEFAULT_HSN || '';

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);
  const brand = '#992603';
  const left = 40;
  const width = doc.page.width - 80;

  // Header
  doc.fillColor(brand).font('Helvetica-Bold').fontSize(20).text(store.name, left, 40);
  doc.fillColor('#333').font('Helvetica').fontSize(9);
  const sellerLines = [
    store.legalName,
    store.address,
    [store.city, store.state, store.pincode].filter(Boolean).join(', '),
    store.gstin ? `GSTIN: ${store.gstin}` : null,
    [store.email, store.phone].filter(Boolean).join(' | '),
  ].filter(Boolean);
  doc.text(sellerLines.join('\n'), left, 66, { width: width / 2 });

  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111').text('TAX INVOICE', left, 40, { width, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#333').text(
    [
      `Invoice No: ${invoiceNumber}`,
      `Invoice Date: ${invoiceDate.toLocaleDateString('en-IN')}`,
      `Order Date: ${new Date(first.orderDate).toLocaleDateString('en-IN')}`,
      `Order ID: ${first.groupId || first._id}`,
      `Payment: ${first.paymentMethod || 'COD'}`,
    ].join('\n'),
    left,
    62,
    { width, align: 'right' }
  );

  // Addresses
  let y = Math.max(doc.y, 140) + 14;
  doc.moveTo(left, y).lineTo(left + width, y).strokeColor('#e3d5d0').stroke();
  y += 10;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text('Bill / Ship To', left, y);
  doc.font('Helvetica').fontSize(9).fillColor('#333').text(
    [ship.fullName || first.customerName, ship.street, [ship.city, ship.state, ship.postalCode].filter(Boolean).join(', '), ship.mobile ? `Phone: ${ship.mobile}` : null]
      .filter(Boolean)
      .join('\n'),
    left,
    y + 14,
    { width: width / 2 }
  );
  const addressBottom = doc.y;
  doc.font('Helvetica').fontSize(9).text(`Place of supply: ${ship.state || '—'}`, left, y + 14, { width, align: 'right' });

  // Table
  y = Math.max(addressBottom, doc.y) + 18;
  const cols = [
    { label: 'Item', w: hsn ? 150 : 190 },
    ...(hsn ? [{ label: 'HSN', w: 40 }] : []),
    { label: 'Qty', w: 30, align: 'right' },
    { label: 'Taxable', w: 70, align: 'right' },
    { label: 'GST %', w: 40, align: 'right' },
    { label: sameState ? 'CGST+SGST' : 'IGST', w: 70, align: 'right' },
    { label: 'Total', w: width - (hsn ? 400 : 400), align: 'right' },
  ];
  const drawRow = (values, rowY, bold = false, fill = null) => {
    if (fill) doc.rect(left, rowY - 4, width, 20).fill(fill);
    doc.fillColor(bold ? '#111' : '#333').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    let x = left + 4;
    cols.forEach((col, i) => {
      doc.text(values[i], x, rowY, { width: col.w - 8, align: col.align || 'left' });
      x += col.w;
    });
  };
  drawRow(cols.map((c) => c.label), y, true, '#fbe4de');
  y += 22;
  for (const line of lines) {
    const values = [line.name, ...(hsn ? [hsn] : []), String(line.quantity), money(line.taxable), `${line.rate}%`, money(line.cgst + line.sgst + line.igst), money(line.total)];
    drawRow(values, y);
    y = Math.max(doc.y, y + 14) + 6;
    doc.moveTo(left, y - 3).lineTo(left + width, y - 3).strokeColor('#f0e6e3').stroke();
  }

  // Totals
  const sum = (key) => round2(lines.reduce((a, l) => a + l[key], 0));
  const discount = sum('discount');
  const totals = [
    ['Taxable value', money(sum('taxable'))],
    ...(sameState ? [['CGST', money(sum('cgst'))], ['SGST', money(sum('sgst'))]] : [['IGST', money(sum('igst'))]]),
    ['Shipping', 'Free'],
  ];
  y += 8;
  doc.font('Helvetica').fontSize(9).fillColor('#333');
  for (const [label, value] of totals) {
    doc.text(label, left + width - 260, y, { width: 160 });
    doc.text(value, left + width - 100, y, { width: 100, align: 'right' });
    y += 14;
  }
  doc.rect(left + width - 260, y, 260, 22).fill(brand);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11);
  doc.text('Grand total', left + width - 252, y + 6, { width: 150 });
  doc.text(money(sum('total')), left + width - 100, y + 6, { width: 92, align: 'right' });
  if (discount) {
    // Line totals are already after the coupon; just tell the customer what they saved
    doc.fillColor(brand).font('Helvetica').fontSize(9).text(
      `You saved ${money(discount)} with coupon ${first.couponCode || ''}`.trim(),
      left + width - 260,
      y + 30,
      { width: 260, align: 'right' }
    );
  }

  // Footer
  doc.fillColor('#777').font('Helvetica').fontSize(8).text(
    'Prices are inclusive of GST. This is a computer-generated invoice and does not need a signature.',
    left,
    doc.page.height - 70,
    { width, align: 'center' }
  );
  doc.end();
};

exports.financialYear = financialYear;
exports.buildLines = buildLines;
