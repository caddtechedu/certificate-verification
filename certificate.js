/* ------------------------------
   FINAL Certificate Generator JS
   Auto Loads Photo & QR
-------------------------------*/

// Sheet URL (unchanged)
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Template (in root of GitHub / same folder)
const TEMPLATE = "certificate.png";

// Canvas setup
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

// Final Coordinates
const POS = {
  course: { x: 753, y: 772 },
  name: { x: 780, y: 877 },
  duration: { x: 912, y: 1053 },
  studentId: { x: 864, y: 1104 },
  issueDate: { x: 891, y: 1242 },
  certificateNo: { x: 1164, y: 1791 },
  photo: { x: 1403, y: 487, w: 180, h: 226 },
  qr: { x: 1140, y: 1443, w: 190, h: 190 },
};

// Get HTML elements
const statusEl = document.getElementById("status");
const certInput = document.getElementById("certInput");
const loadBtn = document.getElementById("loadBtn");
const genBtn = document.getElementById("generateBtn");
const pngBtn = document.getElementById("downloadPngBtn");

let currentStudent = null;

// Set status
function setStatus(s) {
  statusEl.innerText = "Status: " + s;
}

// Load Image
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load error: " + url));
    img.src = url + "?v=" + Date.now();
  });
}

// Draw student image inside box ("cover" effect)
function drawImageCover(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW = w,
    drawH = h,
    offsetX = 0,
    offsetY = 0;

  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = imgRatio * h;
    offsetX = -(drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    offsetY = -(drawH - h) / 2;
  }
  ctx.drawImage(img, x + offsetX, y + offsetY, drawW, drawH);
}

// Generate QR using external library
function generateQRImage(text) {
  return new Promise((resolve, reject) => {
    try {
      let temp = document.createElement("div");
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);

      let qr = new QRCode(temp, { text: text, width: 300, height: 300 });

      setTimeout(() => {
        let img = temp.querySelector("img");
        if (img) {
          document.body.removeChild(temp);
          resolve(img);
        } else {
          reject("QR not generated");
        }
      }, 300);
    } catch (err) {
      reject(err);
    }
  });
}

// Render Certificate
async function renderCertificate(student) {
  try {
    setStatus("Loading template...");
    const template = await loadImage(TEMPLATE);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    // Load Photo Automatically
    let photoImg = null;
    let photoUrl = student.PHOTO?.trim();
    if (!photoUrl) {
      photoUrl = `${student.StudentID}.jpg`; // auto-load e.g. STU001.jpg
    }
    try {
      photoImg = await loadImage(photoUrl);
      drawImageCover(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
    } catch {
      console.warn("Photo not found:", photoUrl);
    }

    // Load QR
    let qrImg = null;
    try {
      const qrLink =
        student["QR LINK"] ||
        `https://caddtechedu.github.io/certificate-verification/?id=${student.CertificateNo}`;
      qrImg = await generateQRImage(qrLink);
      ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
    } catch (err) {
      console.warn("QR not loaded:", err);
    }

    // Text settings
    ctx.fillStyle = "#000";
    ctx.font = "36px Arial";
    ctx.fillText(student.Course, POS.course.x, POS.course.y);

    ctx.font = "40px Arial";
    ctx.fillText(student.Name, POS.name.x, POS.name.y);

    ctx.font = "34px Arial";
    ctx.fillText(student["Duration (Month)"], POS.duration.x, POS.duration.y);
    ctx.fillText(student.StudentID, POS.studentId.x, POS.studentId.y);
    ctx.fillText(student.IssueDate, POS.issueDate.x, POS.issueDate.y);

    ctx.font = "38px Arial";
    ctx.fillText(student.CertificateNo, POS.certificateNo.x, POS.certificateNo.y);

    setStatus(`Rendered: ${student.Name}`);
    genBtn.disabled = false;
    pngBtn.disabled = false;
  } catch (err) {
    setStatus("Render failed: " + err.message);
    console.error(err);
  }
}

// Load & Generate
async function generateCertificate() {
  const id = certInput.value.trim();
  if (!id) return setStatus("Enter Certificate Number!");

  try {
    setStatus("Fetching data...");
    const res = await fetch(SHEET_URL);
    const data = await res.json();
    const student = data.find((s) => s.CertificateNo === id || s.StudentID === id);
    if (!student) return setStatus("Student not found!");

    currentStudent = student;
    await renderCertificate(student);
  } catch (err) {
    setStatus("Error: " + err.message);
  }
}

// Download PNG
function downloadPNG() {
  const link = document.createElement("a");
  link.download = `${currentStudent.CertificateNo}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// PDF (Optional)
function generatePDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(canvas.toDataURL(), "PNG", 0, 0);
  pdf.save(`${currentStudent.CertificateNo}.pdf`);
}

// Assign Functions
window.generateCertificate = generateCertificate;
window.downloadPNG = downloadPNG;
window.generatePDF = generatePDF;
certInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateCertificate();
});
