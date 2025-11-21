/* Certificate Generator - Full Working Version */

// ---------------- CONFIG ----------------
const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";
const TEMPLATE = "certificate.png";

// Canvas setup
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

// Position configuration
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

// Status message update
function setStatus(msg) {
  document.getElementById("status").innerText = "Status: " + msg;
}

// Generic image loader
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image Load Failed: " + url));
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

    new QRCode(container, {
      text: text,
      width: w,
      height: h,
      correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
      const img = container.querySelector("img");
      if (!img) {
        document.body.removeChild(container);
        reject("QR not generated");
      } else {
        const qrImg = new Image();
        qrImg.onload = () => {
          document.body.removeChild(container);
          resolve(qrImg);
        };
        qrImg.src = img.src;
      }
    }, 350);
  });
}

// Draw Image Cover
function drawImageCover(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let newW, newH, offsetX = 0, offsetY = 0;

  if (imgRatio > boxRatio) {
    newH = h;
    newW = imgRatio * h;
    offsetX = -((newW - w) / 2);
  } else {
    newW = w;
    newH = w / imgRatio;
    offsetY = -((newH - h) / 2);
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, newW, newH);
}

// Render Certificate
async function renderCertificate(student) {
  try {
    setStatus("Rendering certificate...");

    const template = await loadImage(TEMPLATE);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    // ----- Load Photo -----
    let photoImg = null;
    if (student.PHOTO && student.PHOTO.trim() !== "") {
      try {
        photoImg = await loadImage(student.PHOTO);
        drawImageCover(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
      } catch (e) { console.warn("Photo load failed"); }
    }

    // ----- Load QR -----
    let qrValue = student["QR LINK"] || "";
    if (qrValue) {
      const qrImg = await generateQR(qrValue, POS.qr.w, POS.qr.h);
      ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
    }

    // ----- Text Rendering -----
    ctx.fillStyle = "#000";
    ctx.font = "42px Arial";

    ctx.fillText(student.Course, POS.course.x, POS.course.y);
    ctx.fillText(student.Name, POS.name.x, POS.name.y);
    ctx.fillText(student["Duration (Month)"], POS.duration.x, POS.duration.y);
    ctx.fillText(student.StudentID, POS.studentId.x, POS.studentId.y);
    ctx.fillText(student.IssueDate, POS.issueDate.x, POS.issueDate.y);
    ctx.fillText(student.CertificateNo, POS.certificateNo.x, POS.certificateNo.y);

    setStatus("Rendered Successfully");
  } catch (err) {
    console.error(err);
    setStatus("Render Failed: " + err.message);
  }
}

// Main Certificate Generator
async function generateCertificate() {
  const id = document.getElementById("certInput").value.trim();
  if (!id) return setStatus("Enter Certificate No");

  setStatus("Loading sheet...");

  try {
    const res = await fetch(SHEET_URL);
    const rows = await res.json();

    const student = rows.find(r =>
      (r.CertificateNo || "").trim() === id ||
      (r.StudentID || "").trim() === id
    );

    if (!student) return setStatus("No Record Found");

    currentStudent = student;

    console.log("Student Loaded →", student);
    await renderCertificate(student);

  } catch (err) {
    console.error(err);
    setStatus("Error: " + err.message);
  }
}

// Download PNG
function downloadPNG() {
  const name = currentStudent.CertificateNo || "certificate";
  const a = document.createElement("a");
  a.download = name + ".png";
  a.href = canvas.toDataURL();
  a.click();
}

window.generateCertificate = generateCertificate;
window.downloadPNG = downloadPNG;
