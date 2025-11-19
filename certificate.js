// Google Sheet URL
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Template image
const TEMPLATE = "certificate_template.png";

// Canvas
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");

// Load template, student data, photo, QR
async function generateCertificate() {
  const certNo = document.getElementById("certInput").value.trim();
  if (!certNo) {
    document.getElementById("status").innerText = "Enter Certificate Number!";
    return;
  }

  document.getElementById("status").innerText = "Loading student data...";

  const res = await fetch(SHEET_URL);
  const data = await res.json();

  const student = data.find((s) => s.CertificateNo === certNo);

  if (!student) {
    document.getElementById("status").innerText = "No certificate found!";
    return;
  }

  document.getElementById("status").innerText = "Generating certificate...";

  // Load certificate template
  const template = await loadImage(TEMPLATE);
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  // Load photo
  let photo = null;
  if (student.PHOTO) {
    photo = await loadImage(student.PHOTO).catch(() => null);
  }

  // Load QR
  let qr = null;
  if (student["QR LINK"]) {
    qr = await generateQR(student["QR LINK"]);
  }

  // 🟧 PHOTO ALIGNMENT (Centered in box)
  if (photo) {
    ctx.drawImage(photo, 1177, 566, 190, 190);
  }

  // 🟧 QR CODE ALIGNMENT
  if (qr) {
    ctx.drawImage(qr, 1179, 1515, 183, 226);
  }

  // TEXT STYLE
  ctx.fillStyle = "#000";
  ctx.font = "40px Arial";

  // 🟧 TEXT POSITIONS (Your exact coordinates)
  ctx.fillText(student.Course, 849, 781);          // Course
  ctx.fillText(student.Name, 822, 886);           // Name
  ctx.fillText(student["Duration (Month)"], 816, 1086); // Duration
  ctx.fillText(student.StudentID, 787, 1136);      // Student ID
  ctx.fillText(student.IssueDate, 784, 1223);      // Issue Date

  // Center name (fixed value)
  ctx.fillText("CADD TECH EDU", 822, 986);

  // 🟧 CERTIFICATE NUMBER (Right side)
  ctx.fillText(student.CertificateNo, 1177, 1754);

  // Download as PNG
  downloadCertificate(certNo);

  document.getElementById("status").innerText = "Certificate Generated!";
}

// ========== IMAGE LOADER ==========
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Image load error: " + url);
    img.src = url;
  });
}

// ========== QR GENERATOR ==========
function generateQR(text) {
  return new Promise((resolve) => {
    const tempCanvas = document.createElement("canvas");
    new QRCode(tempCanvas, {
      text: text,
      width: 300,
      height: 300,
    });
    resolve(tempCanvas.querySelector("img"));
  });
}

// ========== DOWNLOAD PNG ==========
function downloadCertificate(certNo) {
  const link = document.createElement("a");
  link.download = certNo + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
