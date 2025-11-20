// Final working certificate.js
// Version: uses Photo size 183x226 and QR size 190x190 (you selected B)

// Google Sheet URL (Opensheet JSON)
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// TEMPLATE - in your environment we downloaded the template to /mnt/data earlier.
// If you run on GitHub Pages, change this to: const TEMPLATE = "certificate_template.png";
const TEMPLATE = "/mnt/data/certificate_template.png"; // <-- dev environment path
// const TEMPLATE = "certificate_template.png"; // <-- use this on GitHub Pages

// Canvas setup (must match template pixel size)
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1414;
canvas.height = 2000;

// Coordinates & sizes (final - version B)
const POS = {
  course: { x: 849, y: 781 },
  name: { x: 822, y: 886 },
  center: { x: 822, y: 986 },
  duration: { x: 816, y: 1086 },
  studentId: { x: 787, y: 1136 },
  issueDate: { x: 784, y: 1223 },
  certificateNo: { x: 1177, y: 1754 },
  photo: { x: 1177, y: 566, w: 183, h: 226 }, // selected B: photo = 183x226
  qr: { x: 1179, y: 1515, w: 190, h: 190 }    // selected B: qr = 190x190
};

// UI elements
const loadBtn = document.getElementById("loadBtn");
const genBtn = document.getElementById("generateBtn");
const certInput = document.getElementById("certInput");
const statusEl = document.getElementById("status");

genBtn.disabled = true;

// Connect button handlers and auto-load param
document.addEventListener("DOMContentLoaded", () => {
  loadBtn.addEventListener("click", () => {
    const id = certInput.value.trim();
    if (!id) {
      statusEl.innerText = "Enter Certificate number (e.g. CTE12345)";
      return;
    }
    loadAndRender(id);
  });

  genBtn.addEventListener("click", async () => {
    if (!currentStudent) {
      statusEl.innerText = "No student loaded.";
      return;
    }
    await generatePDF(currentStudent);
  });

  // Auto-load if ?id=CTE123
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    certInput.value = id;
    loadAndRender(id);
  } else {
    // draw blank template initially (try to show background)
    loadImage(TEMPLATE)
      .then(img => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        statusEl.innerText = "Template ready — enter certificate number.";
      })
      .catch(err => {
        console.warn("Template not preloaded:", err);
        statusEl.innerText = "Template not loaded yet.";
      });
  }
});

let currentStudent = null;

// MAIN: load sheet, find student, draw
async function loadAndRender(certNo) {
  try {
    statusEl.innerText = "Loading sheet data...";
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error("Failed to fetch sheet: " + res.status);
    const rows = await res.json();

    const student = rows.find(r => {
      const cert = (r.CertificateNo || "").toString().trim();
      const sid = (r.StudentID || "").toString().trim();
      return cert === certNo || sid === certNo;
    });

    if (!student) {
      statusEl.innerText = "Certificate not found for: " + certNo;
      genBtn.disabled = true;
      currentStudent = null;
      return;
    }

    currentStudent = student;
    statusEl.innerText = "Student found: " + (student.Name || "unknown");
    genBtn.disabled = false;

    // Render the certificate
    await renderCertificate(student);
  } catch (e) {
    console.error(e);
    statusEl.innerText = "Error: " + e.message;
    genBtn.disabled = true;
  }
}

// Render pipeline: load template -> photo -> qr -> draw everything
async function renderCertificate(student) {
  statusEl.innerText = "Loading template...";
  // ensure template fully loads
  const templateImg = await loadImage(TEMPLATE);

  // clear and draw template
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

  // student photo
  let photoImg = null;
  if (student.PHOTO) {
    try {
      photoImg = await loadImage(student.PHOTO);
    } catch (e) {
      console.warn("Photo failed to load:", e);
      // continue without photo
    }
  }

  // QR generation
  let qrImg = null;
  const qrData = student["QR LINK"] || student["QR"] || student["QR LINK "];
  const qrValue = qrData && qrData.toString().trim()
    ? qrData.toString().trim()
    : (student.CertificateNo ? `https://caddtechedu.github.io/certificate-verification/?id=${encodeURIComponent(student.CertificateNo)}` : null);

  if (qrValue) {
    try {
      qrImg = await generateQR(qrValue, POS.qr.w, POS.qr.h);
    } catch (e) {
      console.warn("QR failed:", e);
    }
  }

  // Draw photo centered inside the photo box (cover/fill)
  if (photoImg) {
    drawImageCover(photoImg, POS.photo.x, POS.photo.y, POS.photo.w, POS.photo.h);
  }

  // Draw QR
  if (qrImg) {
    ctx.drawImage(qrImg, POS.qr.x, POS.qr.y, POS.qr.w, POS.qr.h);
  }

  // Draw text fields
  ctx.fillStyle = "#000";
  // use font sizes tuned for your template; tweak if needed
  ctx.font = "36px Arial";
  ctx.textBaseline = "middle";

  // Course
  drawTextWrapped(student.Course || "", POS.course.x, POS.course.y, 520, 36);
  // Name
  ctx.font = "40px Arial";
  ctx.fillText(student.Name || "", POS.name.x, POS.name.y);
  // Center name (static)
  ctx.font = "36px Arial";
  ctx.fillText("CADD TECH EDU", POS.center.x, POS.center.y);
  // Duration
  ctx.font = "34px Arial";
  ctx.fillText(student["Duration (Month)"] || student.Duration || "", POS.duration.x, POS.duration.y);
  // Student ID
  ctx.fillText(student.StudentID || "", POS.studentId.x, POS.studentId.y);
  // Issue Date
  ctx.fillText(student.IssueDate || "", POS.issueDate.x, POS.issueDate.y);
  // Certificate No
  ctx.fillText(student.CertificateNo || "", POS.certificateNo.x, POS.certificateNo.y);

  statusEl.innerText = "Rendered: " + (student.Name || "") + " — Click Generate PDF";
}

// Helper: load image (works with crossOrigin)
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error("Image load error: " + url));
    img.src = url;
  });
}

// Helper: draw image with 'cover' behavior (center & crop to fill box)
function drawImageCover(img, x, y, w, h) {
  // fit image to cover the box
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW = w, drawH = h;
  let offsetX = 0, offsetY = 0;
  if (imgRatio > boxRatio) {
    // image wider -> fit height, crop sides
    drawH = h;
    drawW = imgRatio * h;
    offsetX = - (drawW - w) / 2;
  } else {
    // image taller -> fit width, crop top/bottom
    drawW = w;
    drawH = w / imgRatio;
    offsetY = - (drawH - h) / 2;
  }
  ctx.save();
  // If you want rounded corners for photo, uncomment below:
  // rounded clipping:
  // roundRect(ctx, x, y, w, h, 16); ctx.clip();
  ctx.drawImage(img, x + offsetX, y + offsetY, drawW, drawH);
  ctx.restore();
}

// Optional: rounded rect helper if needed
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

// Generate QR and return an <img> element (uses qrcode.min.js)
function generateQR(text, w = 300, h = 300) {
  return new Promise((resolve, reject) => {
    try {
      const wrapper = document.createElement("div");
      // create hidden container to let QRCode library render
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      document.body.appendChild(wrapper);
      const qr = new QRCode(wrapper, {
        text: text,
        width: w,
        height: h,
        correctLevel: QRCode.CorrectLevel.H
      });
      // small timeout to ensure DOM img is created
      setTimeout(() => {
        const img = wrapper.querySelector("img");
        if (img) {
          document.body.removeChild(wrapper);
          resolve(img);
        } else {
          // some builds create a canvas instead of img
          const canvasNode = wrapper.querySelector("canvas");
          if (canvasNode) {
            // convert canvas to Image
            const dataUrl = canvasNode.toDataURL();
            const image = new Image();
            image.onload = () => {
              document.body.removeChild(wrapper);
              resolve(image);
            };
            image.onerror = () => {
              document.body.removeChild(wrapper);
              reject(new Error("QR canvas -> image failed"));
            };
            image.src = dataUrl;
          } else {
            document.body.removeChild(wrapper);
            reject(new Error("QR generation failed"));
          }
        }
      }, 300);
    } catch (err) {
      reject(err);
    }
  });
}

// Draw text wrapped if long (maxWidth)
function drawTextWrapped(text, x, y, maxWidth, fontSize = 36) {
  ctx.font = `${fontSize}px Arial`;
  ctx.textBaseline = "middle";
  const words = (text || "").split(/\s+/);
  let line = "";
  let lineHeight = fontSize + 6;
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? " " : "") + words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = words[n];
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

// Generate PDF from canvas (using jspdf.umd.min.js)
async function generatePDF(student) {
  try {
    statusEl.innerText = "Preparing PDF...";
    // Export canvas as dataURL
    const dataUrl = canvas.toDataURL("image/png");

    // jsPDF usage (using UMD build)
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width, canvas.height);
    const fileName = `${(student && student.CertificateNo) ? student.CertificateNo : "certificate"}_${(student && student.Name) ? student.Name.replace(/\s+/g, '_') : 'student'}.pdf`;
    pdf.save(fileName);
    statusEl.innerText = "PDF downloaded: " + fileName;
  } catch (e) {
    console.error(e);
    statusEl.innerText = "PDF generation failed: " + e.message;
  }
}
