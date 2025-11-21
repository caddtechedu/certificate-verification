/* ============================================
   CADD TECH EDU - Certificate Generator
   Fully Working Version with:
   Template Render / Text / Photo / QR / PNG
   ============================================ */

// -------- CONFIG --------
const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";
const TEMPLATE = "certificate.png";

// Canvas
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

// Position Map
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

let currentStudent = null;

// Status update
function setStatus(msg) {
  document.getElementById("status").innerText = "Status: " + msg;
}

// Image loader
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed: " + url));
    img.src = url + "?v=" + Date.now();
  });
}

// QR Generator
function generateQR(text, w, h) {
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    new QRCode(container, { text, width: w, height: h });

    setTimeout(() => {
      const img = container.querySelector("img");
      if (!img) { reject("QR generation failed"); return; }

      const qrImg = new Image();
      qrImg.onload = () => {
        document.body.removeChild(container);
        resolve(qrImg);
      };
      qrImg.src = img.src;
    }, 350);
  });
}

// Draw Center Crop Photo
function drawImageCover(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let newW, newH, offsetX = 0, offsetY = 0;

  if (imgRatio > boxRatio) {
    newH = h; newW = imgRatio * h;
    offsetX = -((newW - w) / 2);
  } else {
    newW = w; newH = w / imgRatio;
    offsetY = -((newH - h) / 2);
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, newW, newH);
}

// Main Render Function
async function renderCertificate(student) {
  try {
    setStatus("Rendering certificate...");

    // Safe text values
    const course = (student.Course || "").toString();
    const name = (student.Name || "").toString();
    const duration = (student["Duration (Month)"] || "").toString();
    const studentId = (student.StudentID || "").toString();
    const issueDate = (student.IssueDate || "").toString();
    const certNo = (student.CertificateNo || "").toString();
    const qrUrl = (student["QR LINK"] || "").toString();
    const photoUrl = (student.PHOTO || "").toString();

    // Draw template
    const template = await loadImage(TEMPLATE);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    // Draw Photo
    if (photoUrl) {
      try {
        const photoImg = await loadImage(photoUrl);
        drawImageCover(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
      } catch (err) { console.warn("PHOTO NOT LOADED"); }
    }

    // Draw QR
    if (qrUrl) {
      const qrImg = await generateQR(qrUrl, POS.qr.w, POS.qr.h);
      ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
    }

    // Draw Text
    ctx.fillStyle = "#000";
    ctx.font = "42px Arial";
    ctx.fillText(course, POS.course.x, POS.course.y);
    ctx.fillText(name, POS.name.x, POS.name.y);
    ctx.fillText(duration, POS.duration.x, POS.duration.y);
    ctx.fillText(studentId, POS.studentId.x, POS.studentId.y);
    ctx.fillText(issueDate, POS.issueDate.x, POS.issueDate.y);
    ctx.fillText(certNo, POS.certificateNo.x, POS.certificateNo.y);

    setStatus("Rendered Successfully ✔");
  } catch (err) {
    console.error(err);
    setStatus("Render failed: " + err.message);
  }
}

// Load & generate certificate
async function generateCertificate() {
  const id = document.getElementById("certInput").value.trim();
  if (!id) return setStatus("Enter Certificate No");

  setStatus("Loading sheet...");

  try {
    const res = await fetch(SHEET_URL);
    const rows = await res.json();

    const student = rows.find(r =>
      (r.CertificateNo || "").toString().trim() === id ||
      (r.StudentID || "").toString().trim() === id
    );

    if (!student) return setStatus("No record found");

    currentStudent = student;
    console.log("Loaded:", student);
    renderCertificate(student);

  } catch (err) {
    console.error(err);
    setStatus("Error loading sheet");
  }
}

// PNG Download
function downloadPNG() {
  const file = currentStudent.CertificateNo || "certificate";
  const a = document.createElement("a");
  a.download = file + ".png";
  a.href = canvas.toDataURL();
  a.click();
}

// Expose to HTML
window.generateCertificate = generateCertificate;
window.downloadPNG = downloadPNG;