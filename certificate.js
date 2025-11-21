// ======== CONFIG ========
const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";
const TEMPLATE = "certificate.png"; // Must be in same folder

// Canvas setup
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

// Element Ref
const inputEl = document.getElementById("certInput");
const statusEl = document.getElementById("status");

// Coordinates
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

// Helper
function setStatus(msg) { statusEl.innerText = "Status: " + msg; }

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Image load failed");
    img.src = url;
  });
}

// Render Certificate
async function renderCertificate(student) {
  try {
    setStatus("Rendering...");

    const template = await loadImage(TEMPLATE);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    // ---- Student Photo ----
    if (student.PHOTO && student.PHOTO.trim() !== "") {
      let img = await loadImage(student.PHOTO.trim());
      ctx.drawImage(img, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
    }

    // ---- QR ----
    const qrValue = student["QR LINK"];
    if (qrValue) {
      const container = document.createElement("div");
      const qr = new QRCode(container, {
        text: qrValue,
        width: POS.qr.w,
        height: POS.qr.h
      });
      await new Promise(r => setTimeout(r, 400));
      const qrImg = container.querySelector("img");
      if (qrImg) ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
    }

    // ---- TEXT ----
    ctx.font = "42px Arial"; ctx.fillStyle = "#000";
    ctx.fillText(student.Course, POS.course.x, POS.course.y);
    ctx.fillText(student.Name, POS.name.x, POS.name.y);
    ctx.fillText(student["Duration (Month)"], POS.duration.x, POS.duration.y);
    ctx.fillText(student.StudentID, POS.studentId.x, POS.studentId.y);
    ctx.fillText(student.IssueDate, POS.issueDate.x, POS.issueDate.y);
    ctx.fillText(student.CertificateNo, POS.certificateNo.x, POS.certificateNo.y);

    setStatus("Rendered");
  } catch (e) {
    console.log(e);
    setStatus("Render failed");
  }
}

// Button Action
async function generateCertificate() {
  const id = inputEl.value.trim();
  if (!id) return setStatus("Enter Certificate No");

  setStatus("Loading Sheet Data...");
  const res = await fetch(SHEET_URL);
  const rows = await res.json();
  const student = rows.find(r => r.CertificateNo === id || r.StudentID === id);

  if (!student) return setStatus("Record Not Found");
  renderCertificate(student);
}

function downloadPNG() {
  const link = document.createElement("a");
  link.download = "certificate.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Expose to HTML
window.generateCertificate = generateCertificate;
window.downloadPNG = downloadPNG;
