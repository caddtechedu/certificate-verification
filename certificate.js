/* certificate.js - Final Clean Version */

// Google Sheet Source
const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Certificate template file in repo root
const TEMPLATE = "certificate.png";

// Canvas setup
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

// Text and image positions
const POS = {
  course: { x: 753, y: 772 },
  name: { x: 780, y: 877 },
  duration: { x: 912, y: 1053 },
  studentId: { x: 864, y: 1104 },
  issueDate: { x: 891, y: 1242 },
  certificateNo: { x: 1164, y: 1791 },
  photo: { x: 1403, y: 487, w: 180, h: 226 },
  qr: { x: 1140, y: 1443, w: 190, h: 190 }
};

// UI elements
const statusEl = document.getElementById("status");
const input = document.getElementById("certInput");

function setStatus(text) {
  statusEl.innerText = text;
}

// Load image helper
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Image Load Failed: " + url);
    img.src = url + "?v=" + Date.now();
  });
}

// QR GENERATOR
function generateQR(text) {
  return new Promise((resolve, reject) => {
    try {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.left = "-9999px";
      document.body.appendChild(div);

      new QRCode(div, { text, width: 300, height: 300 });

      setTimeout(() => {
        const img = div.querySelector("img");
        if (img) {
          resolve(img);
        } else {
          reject("QR Creation Failed");
        }
        document.body.removeChild(div);
      }, 250);
    } catch (e) {
      reject(e);
    }
  });
}

// Render Certificate
async function renderCertificate(student) {
  try {
    setStatus("Loading Template...");
    const template = await loadImage(TEMPLATE);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    setStatus("Loading Photo...");

    let photoImg = null;
    if (student.PHOTO && student.PHOTO.trim()) {
      try {
        photoImg = await loadImage(student.PHOTO.trim());
      } catch (e) {
        console.warn("Photo failed");
      }
    }

    setStatus("Generating QR...");
    const qrValue = student["QR LINK"] && student["QR LINK"].trim()
      ? student["QR LINK"].trim()
      : `https://caddtechedu.github.io/certificate-verification/?id=${student.CertificateNo}`;

    const qrImg = await generateQR(qrValue);

    if (photoImg) ctx.drawImage(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
    ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);

    ctx.fillStyle = "#000";
    ctx.font = "38px Arial";
    ctx.fillText(student.Course, POS.course.x, POS.course.y);
    ctx.fillText(student.Name, POS.name.x, POS.name.y);
    ctx.fillText(student["Duration (Month)"], POS.duration.x, POS.duration.y);
    ctx.fillText(student.StudentID, POS.studentId.x, POS.studentId.y);
    ctx.fillText(student.IssueDate, POS.issueDate.x, POS.issueDate.y);
    ctx.fillText(student.CertificateNo, POS.certificateNo.x, POS.certificateNo.y);

    setStatus("Certificate Ready ✔");
  } catch (err) {
    console.error(err);
    setStatus("Render failed: " + err);
  }
}

// MAIN GENERATOR
async function generateCertificate() {
  const id = input.value.trim();
  if (!id) return setStatus("Enter Certificate No!");

  setStatus("Fetching Data...");

  const res = await fetch(SHEET_URL);
  const rows = await res.json();

  const student = rows.find(
    r => r.CertificateNo === id || r.StudentID === id
  );

  if (!student) return setStatus("No record found!");

  renderCertificate(student);
}

// DOWNLOADS
window.downloadPNG = function () {
  const link = document.createElement("a");
  link.download = "certificate.png";
  link.href = canvas.toDataURL();
  link.click();
};

window.generatePDF = function () {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [1414, 2000] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 1414, 2000);
  pdf.save("certificate.pdf");
};

window.generateCertificate = generateCertificate;
