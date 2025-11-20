/* certificate.js
   Full certificate generator:
   - loads Google Sheet data (opensheet)
   - loads certificate template (certificate.png)
   - inserts photo, QR, text at exact coordinates
   - allows PNG download and PDF download (jsPDF)
*/

// ---------- CONFIG ----------
const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Template filename to use on GitHub Pages (ensure certificate.png exists in repo root)
const TEMPLATE = "certificate.png";

// Canvas and context
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
// ensure correct size (matches your template resolution)
canvas.width = 1414;
canvas.height = 2000;

// Final positions (your confirmed coordinates — you can tweak if needed)
const POS = {
  course: { x: 849, y: 781 },
  name:   { x: 822, y: 886 },
  center: { x: 822, y: 986 },
  duration: { x: 816, y: 1086 },
  studentId: { x: 787, y: 1136 },
  issueDate: { x: 784, y: 1223 },
  certificateNo: { x: 1177, y: 1754 },
  photo: { x: 1177, y: 566, w: 183, h: 226 },
  qr: { x: 1179, y: 1515, w: 190, h: 190 }
};

// UI elements
const statusEl = document.getElementById("status");
const certInput = document.getElementById("certInput");
const loadBtn = document.getElementById("loadBtn");
const genBtn = document.getElementById("generateBtn");
const pngBtn = document.getElementById("downloadPngBtn");

let currentStudent = null;

// small helper to set status
function setStatus(s) { statusEl.innerText = "Status: " + s; }

// ---------- IMAGE LOADER ----------
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // for CORS-safe images
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load error: " + url));
    // add cache-buster
    img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
  });
}

// ---------- QR GENERATOR ----------
// returns an HTMLImageElement (or an Image built from canvas)
function generateQRImage(text, w = 300, h = 300) {
  return new Promise((resolve, reject) => {
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      const qr = new QRCode(container, { text: text, width: w, height: h, correctLevel: QRCode.CorrectLevel.H });
      setTimeout(() => {
        const img = container.querySelector('img');
        const canvasNode = container.querySelector('canvas');
        if (img) {
          document.body.removeChild(container);
          resolve(img);
        } else if (canvasNode) {
          // convert canvas to image
          const dataUrl = canvasNode.toDataURL();
          const im = new Image();
          im.onload = () => { document.body.removeChild(container); resolve(im); };
          im.onerror = () => { document.body.removeChild(container); reject(new Error("QR canvas->image failed")); };
          im.src = dataUrl;
        } else {
          document.body.removeChild(container);
          reject(new Error("QR generation failed"));
        }
      }, 250);
    } catch (e) { reject(e); }
  });
}

// ---------- TEXT WRAPPING HELPER ----------
function drawTextWrapped(text, x, y, maxWidth, lineHeight, font) {
  ctx.font = font;
  ctx.textBaseline = "middle";
  const words = (text || "").split(/\s+/);
  let line = "";
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line ? (line + " " + words[n]) : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = words[n];
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

// ---------- DRAW IMAGE COVER (center-crop like CSS cover) ----------
function drawImageCover(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW = w, drawH = h, offsetX = 0, offsetY = 0;
  if (imgRatio > boxRatio) {
    // image wider -> fit height then crop sides
    drawH = h;
    drawW = imgRatio * h;
    offsetX = - (drawW - w) / 2;
  } else {
    // image taller -> fit width then crop top/bottom
    drawW = w;
    drawH = w / imgRatio;
    offsetY = - (drawH - h) / 2;
  }
  ctx.save();
  // if you want rounded clip, use roundRect+ctx.clip() here
  ctx.drawImage(img, x + offsetX, y + offsetY, drawW, drawH);
  ctx.restore();
}

// ---------- RENDER FUNCTION ----------
async function renderCertificate(student) {
  try {
    setStatus("Loading template...");
    // load template (must be in same repo root)
    const template = await loadImage(TEMPLATE);
    // clear & draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    // load photo if present
    let photoImg = null;
    if (student.PHOTO && student.PHOTO.trim() !== "") {
      try {
        photoImg = await loadImage(student.PHOTO);
      } catch (e) {
        console.warn("Photo failed:", e);
      }
    }

    // generate QR (use QR LINK if present otherwise fallback to verification URL)
    let qrImg = null;
    const qrValue = (student["QR LINK"] && student["QR LINK"].toString().trim()) ? student["QR LINK"].toString().trim()
                  : (student.CertificateNo ? `https://caddtechedu.github.io/certificate-verification/?id=${encodeURIComponent(student.CertificateNo)}` : null);
    if (qrValue) {
      try {
        qrImg = await generateQRImage(qrValue, POS.qr.w, POS.qr.h);
      } catch (e) {
        console.warn("QR failed:", e);
      }
    }

    // draw photo (cover)
    if (photoImg) {
      drawImageCover(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
    }

    // draw QR
    if (qrImg) {
      ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
    }

    // draw text
    ctx.fillStyle = "#000";
    // Course (wrapped)
    drawTextWrapped(student.Course || "", POS.course.x, POS.course.y, 520, 42, "36px Arial");
    // Name (bigger)
    ctx.font = "40px Arial";
    ctx.fillText(student.Name || "", POS.name.x, POS.name.y);
    // Center (static)
    ctx.font = "36px Arial";
    ctx.fillText("CADD TECH EDU", POS.center.x, POS.center.y);
    // Duration
    ctx.font = "34px Arial";
    ctx.fillText(student["Duration (Month)"] || student.Duration || "", POS.duration.x, POS.duration.y);
    // Student ID
    ctx.fillText(student.StudentID || "", POS.studentId.x, POS.studentId.y);
    // Issue Date
    ctx.fillText(student.IssueDate || "", POS.issueDate.x, POS.issueDate.y);
    // Certificate No (right)
    ctx.fillText(student.CertificateNo || "", POS.certificateNo.x, POS.certificateNo.y);

    setStatus("Rendered: " + (student.Name || ""));
    genBtn.disabled = false;
    pngBtn.disabled = false;
  } catch (err) {
    console.error("Render failed:", err);
    setStatus("Render failed: " + err.message);
  }
}

// ---------- MAIN: load sheet and render ----------
async function generateCertificate() {
  const id = certInput.value && certInput.value.trim();
  if (!id) { setStatus("Enter CertificateNo first"); return; }

  setStatus("Loading sheet...");
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);
    const rows = await res.json();
    // find by CertificateNo or StudentID
    const student = rows.find(r => {
      const c = (r.CertificateNo || "").toString().trim();
      const s = (r.StudentID || "").toString().trim();
      return c === id || s === id;
    });
    if (!student) { setStatus("No record for " + id); return; }
    currentStudent = student;
    await renderCertificate(student);
  } catch (e) {
    console.error(e);
    setStatus("Error: " + e.message);
  }
}

// ---------- Download helpers ----------
function downloadPNG() {
  const name = (currentStudent && currentStudent.CertificateNo) ? currentStudent.CertificateNo : ("certificate");
  const link = document.createElement("a");
  link.download = name + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function generatePDF() {
  if (!currentStudent) { setStatus("No certificate to export"); return; }
  setStatus("Preparing PDF...");
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width, canvas.height);
    const fname = (currentStudent.CertificateNo || "certificate") + "_" + ((currentStudent.Name || "student").replace(/\s+/g,'_')) + ".pdf";
    pdf.save(fname);
    setStatus("PDF downloaded: " + fname);
  } catch (e) {
    console.error(e);
    setStatus("PDF failed: " + e.message);
  }
}

// expose download functions to global so HTML inline handlers can call them
window.generateCertificate = generateCertificate;
window.downloadPNG = downloadPNG;
window.generatePDF = generatePDF;
window.downloadCertificate = downloadPNG; // fallback name

// quick enable/disable handlers for UI buttons already exist in HTML; also add keyboard Enter
certInput.addEventListener('keyup', function(e){
  if (e.key === 'Enter') generateCertificate();
});
