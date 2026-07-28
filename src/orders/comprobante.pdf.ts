import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { Order } from './entities/order.entity';

const ZIFCOR = { razonSocial: 'ZIFCOR S.A.S', nit: '902067173' };
const LOGO_PATH = path.join(__dirname, 'assets', 'IconoZ.png');

const BRAND = '#1D4ED8';
const BRAND_LIGHT = '#EFF6FF';
const PAID_GREEN = '#16A34A';
const TEXT_GRAY = '#64748B';
const BORDER_GRAY = '#E2E8F0';

const PAGE_WIDTH = 595.28;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatMoney(value: number, moneda: string): string {
  const n = Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `$${n} ${moneda}`;
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface CompradorInfo {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  documento: string | null;
}

/** Genera un comprobante de compra en PDF (no es una factura electrónica DIAN). */
export function buildComprobantePdf(order: Order, comprador: CompradorInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const referencia = order.id.slice(0, 8).toUpperCase();

    // ── Encabezado de marca ──
    const logoWidth = 150;
    doc.image(LOGO_PATH, MARGIN, 36, { width: logoWidth });

    const badgeW = 92;
    const badgeH = 26;
    doc.roundedRect(PAGE_WIDTH - MARGIN - badgeW, 46, badgeW, badgeH, 13).fill(PAID_GREEN);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10.5)
      .text('✓ PAGADO', PAGE_WIDTH - MARGIN - badgeW, 53, { width: badgeW, align: 'center' });

    doc.rect(0, 128, PAGE_WIDTH, 26).fill(BRAND);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
      .text('Comprobante de compra', MARGIN, 136);

    doc.y = 174;

    doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_GRAY).text(
      'Este documento es un comprobante de compra generado por ZIFCOR y no constituye una factura ' +
      'electrónica de venta para efectos tributarios ante la DIAN.',
      MARGIN, doc.y, { width: CONTENT_WIDTH },
    );
    doc.moveDown(1);
    doc.strokeColor(BORDER_GRAY).moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke();
    doc.moveDown(0.8);

    doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text('Referencia: ', { continued: true })
      .font('Helvetica').text(`#${referencia}`);
    doc.font('Helvetica-Bold').text('Fecha: ', { continued: true })
      .font('Helvetica').text(formatDate(order.fechaPago || order.createdAt));
    const medioPago = order.wompiMetodoPago || order.medioPagoManual;
    if (medioPago) {
      doc.font('Helvetica-Bold').text('Medio de pago: ', { continued: true })
        .font('Helvetica').text(medioPago);
    }
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND).text('Vendedor');
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(ZIFCOR.razonSocial);
    doc.text(`NIT: ${ZIFCOR.nit}`);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND).text('Comprador');
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(comprador.nombre || 'N/A');
    if (comprador.documento) doc.text(`Documento: ${comprador.documento}`);
    if (comprador.email) doc.text(comprador.email);
    if (comprador.telefono) doc.text(`Tel: ${comprador.telefono}`);
    if (order.envioDireccion) doc.text(`Dirección de entrega: ${order.envioDireccion}, ${order.envioCiudad || ''} ${order.envioDepartamento || ''}`);
    doc.moveDown(1.2);

    // ── Tabla de productos ──
    const col = { nombre: MARGIN, cant: 330, precio: 390, subtotal: 470 };
    const tableTop = doc.y;
    doc.rect(MARGIN, tableTop - 4, CONTENT_WIDTH, 22).fill(BRAND_LIGHT);
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(9.5);
    doc.text('Producto / servicio', col.nombre + 6, tableTop, { width: 264 });
    doc.text('Cant.', col.cant, tableTop, { width: 50, align: 'right' });
    doc.text('Precio', col.precio, tableTop, { width: 70, align: 'right' });
    doc.text('Subtotal', col.subtotal, tableTop, { width: 75, align: 'right' });
    doc.y = tableTop + 22;

    doc.font('Helvetica').fontSize(9.5).fillColor('#333');
    let zebra = false;
    for (const item of order.items || []) {
      const rowY = doc.y;
      const rowH = 20;
      if (zebra) doc.rect(MARGIN, rowY - 3, CONTENT_WIDTH, rowH).fill('#F8FAFC');
      zebra = !zebra;
      doc.fillColor('#333');
      doc.text(item.nombre, col.nombre + 6, rowY, { width: 258 });
      doc.text(String(item.cantidad), col.cant, rowY, { width: 50, align: 'right' });
      doc.text(formatMoney(Number(item.precioUnitario), order.moneda), col.precio, rowY, { width: 70, align: 'right' });
      doc.text(formatMoney(Number(item.subtotal), order.moneda), col.subtotal, rowY, { width: 75, align: 'right' });
      doc.y = rowY + rowH;
    }

    doc.moveDown(0.5);
    doc.strokeColor(BORDER_GRAY).moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke();
    doc.moveDown(0.6);

    const totalBoxW = 220;
    const totalBoxH = 40;
    const totalBoxX = PAGE_WIDTH - MARGIN - totalBoxW;
    const totalBoxY = doc.y;
    doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, totalBoxH, 6).fill(BRAND_LIGHT);
    doc.fillColor(TEXT_GRAY).font('Helvetica').fontSize(9)
      .text('TOTAL PAGADO', totalBoxX + 16, totalBoxY + 8);
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(15)
      .text(formatMoney(Number(order.subtotal), order.moneda), totalBoxX + 16, totalBoxY + 19, {
        width: totalBoxW - 32, align: 'right',
      });

    doc.y = totalBoxY + totalBoxH + 30;
    doc.font('Helvetica').fontSize(8).fillColor(TEXT_GRAY).text(
      'Generado automáticamente por ZIFCOR — plataforma de comercio industrial B2B.',
      MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' },
    );

    doc.end();
  });
}
