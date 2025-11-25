// --------- CONFIG ---------
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";
const TEMPLATE = "certificate.png"; // Must exist in GitHub

// Canvas setup
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

// Text & Image positions
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

// Status display
const statusEl = document.getElementById("status");
function setStatus(msg) {
  statusEl.innerText = "Status: " + msg;
}

let currentStudent = null;

// ---------- IMAGE LOADER ----------
function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject("No image URL provided");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Failed to load image: " + url);
    img.src = url;
  });
}

// ---------- RENDER FUNCTION ----------
async function renderCertificate(student) {
  try {
    setStatus("Rendering certificate...");

    // 1️⃣ Draw background template
    const template = await loadImage(TEMPLATE);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    // 2️⃣ Draw photo
    if (student.PHOTO) {
      try {
        const photoImg = await loadImage(student.PHOTO);
        ctx.drawImage(
          photoImg,
          POS.photo.x,
          POS.photo.y,
          POS.photo.w,
          POS.photo.h
        );
      } catch (e) {
        console.warn("Photo not loaded:", e);
      }
    }

    // 3️⃣ Draw QR using API (no library needed)
    if (student.CertificateNo) {
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://caddtechedu.github.io/certificate-verification/?id=${encodeURIComponent(
          student.CertificateNo
        )}`;
        const qrImg = await loadImage(qrUrl);
        ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
      } catch (e) {
        console.warn("QR failed:", e);
      }
    }

    // 4️⃣ Draw text
    ctx.fillStyle = "#000";

    ctx.font = "38px Arial";
    ctx.fillText(student.Course || "", POS.course.x, POS.course.y);

    ctx.font = "40px Arial";
    ctx.fillText(student.Name || "", POS.name.x, POS.name.y);

    ctx.font = "38px Arial";
    ctx.fillText(
      student["Duration (Month)"] || "",
      POS.duration.x,
      POS.duration.y
    );
    ctx.fillText(student.StudentID || "", POS.studentId.x, POS.studentId.y);
    ctx.fillText(student.IssueDate || "", POS.issueDate.x, POS.issueDate.y);

    ctx.font = "40px Arial";
    ctx.fillText(
      student.CertificateNo || "",
      POS.certificateNo.x,
      POS.certificateNo.y
    );

    setStatus("Certificate Ready!");
  } catch (error) {
    console.error(error);
    setStatus("Render failed: " + error);
  }
}

// ---------- MAIN FUNCTION ----------
async function generateCertificate() {
  const id = document.getElementById("certInput").value.trim();
  if (!id) return setStatus("Enter Certificate No");

  setStatus("Fetching data...");
  const res = await fetch(SHEET_URL);
  const rows = await res.json();

  const student = rows.find(
    (r) =>
      (r.CertificateNo || "").trim().toUpperCase() === id.toUpperCase()
  );

  if (!student) return setStatus("No record found");

  currentStudent = student;
  await renderCertificate(student);
}

// ---------- DOWNLOAD PNG ----------
function downloadCertificate() {
  if (!currentStudent) return setStatus("Generate certificate first");
  const link = document.createElement("a");
  link.download = `${currentStudent.CertificateNo}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Expose functions to HTML
window.generateCertificate = generateCertificate;
window.downloadCertificate = downloadCertificate;
