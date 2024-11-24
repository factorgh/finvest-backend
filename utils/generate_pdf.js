import fs from "fs";
import PDFDocument from "pdfkit";

const generatePDF = (investment) => {
  const doc = new PDFDocument();
  const filePath = `./pdfs/investment-${investment._id}.pdf`;

  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text(`Investment Summary`, { align: "center" });
  doc.moveDown();
  doc.text(`Name: ${investment.name}`);
  doc.text(`Email: ${investment.email}`);
  doc.text(`Principal: ${investment.principal}`);
  doc.text(`Guaranteed Rate: ${investment.guaranteedRate}%`);
  doc.text(`Accrued Return: ${investment.accruedReturn}`);
  doc.text(`Quarter End Date: ${investment.quarterEndDate}`);

  doc.end();

  return filePath;
};

export default generatePDF;
