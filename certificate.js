/* --- FINAL JS for GitHub --- */

// Google Sheet URL
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Template must be in repo
const TEMPLATE = "certificate.png";

const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

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

const statusEl = document.getElementById("status");
const certInput = document.getElementById("certInput");
const genBtn = document.getElementById("generateBtn");
const pngBtn = document.getElementById("downloadPngBtn");

let currentStudent = null;

function setStatus(s) {
  statusEl.innerText = "Status: " + s;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Error: Cannot load " + url);
    img.src = url + "?v=" + Date.now();
  });
}

function drawImageCover(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW = w, drawH = h, offsetX = 0, offsetY = 0;

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

function generateQRImage(text) {
  return new Promise((resolve, reject) => {
    try {
      let container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);
      new QRCode(container, { text, width: 300, height: 300 });
      setTimeout(() => {
        let img = container.querySelector("img");
        document.body.removeChild(container);
        img ? resolve(img) : reject("QR Failed");
      }, 300);
    } catch (err) {
      reject(err);
    }
  });
}

async function renderCertificate(student) {
  try {
    setStatus("Loading certificate template...");
    const template = await loadImage(TEMPLATE);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0);

    // ---- Load student photo (from GitHub folder) ----
    let photoUrl = student.PHOTO?.trim() || `${student.StudentID}.jpg`;
    try {
      const photoImg = await loadImage(photoUrl);
      drawImageCover(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
    } catch (err) {
      console.warn("Photo not found:", photoUrl);
    }

    // ---- Load QR Code ----
    try {
      const qrLink =
        student["QR LINK"] ||
        `https://caddtechedu.github.io/certificate-verification/?id=${student.CertificateNo}`;
      const qrImg = await generateQRImage(qrLink);
      ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
    } catch {
      console.warn("QR not generated");
    }

    // ---- Insert text ----
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

    setStatus("Certificate ready!");
    pngBtn.disabled = false;
  } catch (err) {
    setStatus("Render failed");
    console.error(err);
  }
}

async function generateCertificate() {
  const id = certInput.value.trim();
  if (!id) return setStatus("Enter certificate number!");

  setStatus("Fetching student data...");
  const res = await fetch(SHEET_URL);
  const students = await res.json();
  const student = students.find(
    (s) => s.CertificateNo === id || s.StudentID === id
  );

  if (!student) return setStatus("Certificate not found!");

  currentStudent = student;
  await renderCertificate(student);
}

function downloadPNG() {
  if (!currentStudent) return;
  const link = document.createElement("a");
  link.download = currentStudent.CertificateNo + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

window.generateCertificate = generateCertificate;
window.downloadPNG = downloadPNG;

certInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateCertificate();
});
