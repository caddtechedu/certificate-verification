/* FINAL certificate.js */

const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";
const TEMPLATE = "certificate.png"; // Make sure it's in GitHub root

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
  qr: { x: 1140, y: 1443, w: 190, h: 190 }
};

const statusEl = document.getElementById("status");
const certInput = document.getElementById("certInput");

let currentStudent = null;

function setStatus(msg) { statusEl.innerText = "Status: " + msg; }

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Failed to load image: " + url);
    img.src = url;
  });
}

function generateQRImage(text) {
  return new Promise((resolve, reject) => {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = "-9999px";
    document.body.appendChild(div);

    new QRCode(div, { text, width: 200, height: 200 });

    setTimeout(() => {
      const img = div.querySelector("img");
      if (img) {
        document.body.removeChild(div);
        resolve(img);
      } else reject("QR generation failed");
    }, 300);
  });
}

async function renderCertificate(student) {
  try {
    const template = await loadImage(TEMPLATE);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    if (student.PHOTO) {
      try {
        const photoImg = await loadImage(student.PHOTO);
        ctx.drawImage(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
      } catch (e) { console.warn("Photo load issue"); }
    }

    if (student["QR LINK"]) {
      try {
        const qrImg = await generateQRImage(student["QR LINK"]);
        ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
      } catch (e) { console.warn("QR error"); }
    }

    ctx.fillStyle = "#000";
    ctx.font = "38px Arial";
    ctx.fillText(student.Course, POS.course.x, POS.course.y);
    ctx.font = "40px Arial";
    ctx.fillText(student.Name, POS.name.x, POS.name.y);
    ctx.fillText(student["Duration (Month)"], POS.duration.x, POS.duration.y);
    ctx.fillText(student.StudentID, POS.studentId.x, POS.studentId.y);
    ctx.fillText(student.IssueDate, POS.issueDate.x, POS.issueDate.y);
    ctx.fillText(student.CertificateNo, POS.certificateNo.x, POS.certificateNo.y);

    setStatus("Certificate Ready!");
  } catch (err) {
    console.error(err);
    setStatus("Render failed: " + err);
  }
}

async function generateCertificate() {
  const id = certInput.value.trim();
  if (!id) { setStatus("Enter Certificate No"); return; }

  setStatus("Fetching data...");
  const res = await fetch(SHEET_URL);
  const data = await res.json();

  const student = data.find((row) =>
    row.CertificateNo.trim().toUpperCase() === id.toUpperCase()
  );

  if (!student) {
    setStatus("No matching student found!");
    return;
  }

  currentStudent = student;
  setStatus("Rendering...");
  await renderCertificate(student);
}

function downloadCertificate() {
  const link = document.createElement("a");
  link.download = (currentStudent?.CertificateNo || "certificate") + ".png";
  link.href = canvas.toDataURL();
  link.click();
}

window.generateCertificate = generateCertificate;
window.downloadCertificate = downloadCertificate;
