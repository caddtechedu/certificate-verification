/* certificate.js
   Browser-based certificate generator.
   - Fetches data from Google Sheet (Opensheet API)
   - Draws on canvas using certificate_template.png
   - Inserts student photo and QR image
   - Exports to A4 PDF via jsPDF
*/

/* ====== CONFIG - edit if needed ====== */
// Your Google Sheet opensheet URL (we used this earlier)
const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Template image file name in the same repo (upload certificate_template.png)
const TEMPLATE_IMAGE = "certificate_template.png";

// Canvas width (px) for drawing - we'll use large size for PDF quality
const CANVAS_WIDTH = 2480;   // A4 ~ 2480 x 3508 @ 300 DPI (we'll scale for jsPDF)
const CANVAS_HEIGHT = 3508;

// Photo placement relative (fractions of width/height) — auto-detect strategy
const PHOTO_BOX = {
  // These are relative coords (x, y, w, h) as fractions of canvas
  // Default targets top-right area — tweak if your template differs
  x: 0.72,   // 72% across from left
  y: 0.12,   // 12% from top
  w: 0.18,   // width 18% of canvas width
  h: 0.22    // height 22% of canvas height
};

// QR box (bottom-right) relative placement
const QR_BOX = {
  x: 0.83,
  y: 0.88,
  w: 0.10,
  h: 0.10
};

// Text positions (relative). These are approximate and can be tweaked.
// They map to where your template shows the dynamic lines.
const TEXT_POS = {
  Course: { x: 0.55, y: 0.42, size: 44, align: "left" },       // COURSE ON ...
  Name:   { x: 0.55, y: 0.50, size: 60, align: "left" },       // student name
  Center: { x: 0.55, y: 0.58, size: 36, align: "left" },      // CADD TECH EDU
  Duration:{ x:0.55, y:0.64, size: 34, align:"left" },
  StudentID:{ x:0.55, y:0.69, size: 34, align:"left" },
  IssueDate:{ x:0.55, y:0.74, size: 34, align:"left" },
  CertificateNo: { x:0.75, y:0.92, size: 30, align: "left" }
};

/* ====== End config ====== */

const canvas = document.getElementById("certCanvas");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const loadBtn = document.getElementById("loadBtn");
const genBtn = document.getElementById("generateBtn");
const certInput = document.getElementById("certInput");

let sheetData = [];
let currentStudent = null;

// Load sheet data once on open
fetch(SHEET_URL)
  .then(r => r.json())
  .then(json => {
    sheetData = json;
    statusEl.innerText = "Sheet loaded (" + sheetData.length + " rows).";
    // if URL has ?id=..., auto-load
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      certInput.value = id;
      loadStudentAndRender(id.trim());
    } else {
      // show blank template
      renderBlank();
    }
  })
  .catch(e => {
    console.error("Failed to load sheet:", e);
    statusEl.innerText = "Failed to load sheet. See console.";
    renderBlank();
  });

// Buttons
loadBtn.addEventListener("click", () => {
  const id = certInput.value.trim();
  if (!id) { statusEl.innerText = "Enter certificate number."; return; }
  loadStudentAndRender(id);
});

genBtn.addEventListener("click", () => {
  if (!currentStudent) { statusEl.innerText = "No student loaded."; return; }
  generatePDFForCurrent();
});

// Render blank certificate template
function renderBlank() {
  const img = new Image();
  img.src = TEMPLATE_IMAGE;
  img.onload = function() {
    // draw template scaled to canvas
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
}

// Find student by CertificateNo or StudentID
function findStudentById(id) {
  if (!sheetData || sheetData.length === 0) return null;
  // match exactly either CertificateNo or StudentID (trim both)
  id = id.toString().trim();
  for (let r of sheetData) {
    if (!r) continue;
    const cert = (r["CertificateNo"] || "").toString().trim();
    const sid = (r["StudentID"] || "").toString().trim();
    if (cert === id || sid === id) return r;
  }
  return null;
}

async function loadStudentAndRender(id) {
  statusEl.innerText = "Searching for " + id + " ...";
  const student = findStudentById(id);
  if (!student) {
    statusEl.innerText = "Student not found.";
    currentStudent = null;
    genBtn.disabled = true;
    renderBlank();
    return;
  }
  statusEl.innerText = "Student found: " + student.Name;
  currentStudent = student;
  genBtn.disabled = false;
  await drawCertificateForStudent(student);
}

// Main drawing function (async because images must load)
async function drawCertificateForStudent(s) {
  // draw base template
  const templateImg = await loadImage(TEMPLATE_IMAGE);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

  // Insert photo
  const photoUrl = s["PHOTO"] || s["Photo"] || s["photo"] || "";
  if (photoUrl) {
    try {
      const photoImg = await loadImage(photoUrl);
      const pw = Math.round(canvas.width * PHOTO_BOX.w);
      const ph = Math.round(canvas.height * PHOTO_BOX.h);
      const px = Math.round(canvas.width * PHOTO_BOX.x);
      const py = Math.round(canvas.height * PHOTO_BOX.y);
      // Draw rounded rect clip for photo (rounded corners)
      roundImageDraw(photoImg, px, py, pw, ph, 20);
    } catch (err) {
      console.warn("Failed to load student photo:", err);
    }
  }

  // Insert QR image (we will use the QR LINK value to generate QR via api)
  const qrLink = s["QR LINK"] || s["QR LINK ".trim()] || s["QR LINK"] || s["QR LINK"] || s["QR LINK".trim()] || s["QR LINK"] ;
  // fallback: if cell exists differently:
  const qrData = s["QR LINK"] || s["QR LINK"] || s["QR LINK"] || (s["QR LINK"] ? s["QR LINK"] : s["QR LINK"]);
  // Instead, safer:
  const qrValue = s["QR LINK"] || s["QR LINK".trim()] || s["QR LINK".toString()] || s["QR LINK"] || s["QR LINK"];
  // We'll just try common names
  let qrUrl = s["QR LINK"] || s["QR LINK"] || s["QR LINK"] || s["QR LINK"];
  // fallback: try building verification URL if CertificateNo exists
  if (!qrUrl && s["CertificateNo"]) {
    qrUrl = encodeURI("https://caddtechedu.github.io/certificate-verification/?id=" + s["CertificateNo"]);
  }
  if (qrUrl) {
    try {
      const qrImg = await loadImage("https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=" + encodeURIComponent(qrUrl));
      const qw = Math.round(canvas.width * QR_BOX.w);
      const qh = Math.round(canvas.height * QR_BOX.h);
      const qx = Math.round(canvas.width * QR_BOX.x);
      const qy = Math.round(canvas.height * QR_BOX.y);
      // draw QR with small border
      ctx.drawImage(qrImg, qx, qy, qw, qh);
    } catch (e) {
      console.warn("Failed to load QR:", e);
    }
  }

  // Draw text fields (Course, Name, Center, Duration, StudentID, IssueDate, CertificateNo)
  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";

  // helper to draw text
  function drawText(field, opts) {
    const txt = (s[field] || s[field.replace(/\s*\(.+\)/, '')] || "") + "";
    const x = Math.round(canvas.width * opts.x);
    const y = Math.round(canvas.height * opts.y);
    ctx.font = `${Math.round(opts.size)}px 'Times New Roman', serif`;
    if (opts.align === "center") {
      ctx.textAlign = "center";
    } else if (opts.align === "right") {
      ctx.textAlign = "right";
    } else {
      ctx.textAlign = "left";
    }
    // allow multiline if contains newline
    const lines = txt.split(/\r?\n/);
    for (let i=0;i<lines.length;i++) {
      ctx.fillText(lines[i], x, y + i * (opts.size + 4));
    }
  }

  // mapping: keys in sheet -> TEXT_POS keys
  drawText("Course", TEXT_POS.Course);
  drawText("Name", TEXT_POS.Name);
  drawText("CADD TECH EDU", TEXT_POS.Center); // static
  drawText("Duration (Month)", TEXT_POS.Duration);
  drawText("StudentID", TEXT_POS.StudentID);
  drawText("IssueDate", TEXT_POS.IssueDate);
  drawText("CertificateNo", TEXT_POS.CertificateNo);

  // if you want to show CertificateNo label, draw small label left of the field
  // finished
}

// utility: load image (supports CORS if image allows)
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = e => reject(e);
    img.src = src;
  });
}

// draw image into rounded rect area
function roundImageDraw(img, x, y, w, h, radius) {
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  // Fit image into box with cover behavior
  const ix = img.width, iy = img.height;
  const boxRatio = w / h;
  const imgRatio = ix / iy;
  let drawW = w, drawH = h, offsetX = 0, offsetY = 0;
  if (imgRatio > boxRatio) {
    // image is wider -> fit height then crop sides
    drawH = h;
    drawW = Math.round(h * imgRatio);
    offsetX = -Math.round((drawW - w) / 2);
  } else {
    // image taller -> fit width and crop top/bottom
    drawW = w;
    drawH = Math.round(w / imgRatio);
    offsetY = -Math.round((drawH - h) / 2);
  }
  ctx.drawImage(img, x + offsetX, y + offsetY, drawW, drawH);
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Generate PDF using jsPDF (A4 portrait). We convert canvas to image and embed.
async function generatePDFForCurrent() {
  statusEl.innerText = "Generating PDF ...";
  // use canvas.toDataURL
  const dataUrl = canvas.toDataURL("image/png", 1.0);

  const { jsPDF } = window.jspdf;
  // create A4 PDF (units in px by converting mm->px)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [CANVAS_WIDTH, CANVAS_HEIGHT]
  });

  // add the canvas image filling the page
  pdf.addImage(dataUrl, "PNG", 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // save with certificate no and name
  const fname = (currentStudent && currentStudent["CertificateNo"] ? currentStudent["CertificateNo"] + "_" : "") + (currentStudent && currentStudent["Name"] ? currentStudent["Name"].replace(/\s+/g,'_') : "certificate") + ".pdf";
  pdf.save(fname);
  statusEl.innerText = "PDF generated: " + fname;
}

/* Alias to generate PDF for current student */
async function generatePDFForCurrent() {
  try {
    // small delay to ensure canvas is up to date
    await new Promise(r => setTimeout(r, 200));
    generatePDF();
  } catch(e) {
    console.error(e);
    statusEl.innerText = "Error generating PDF. See console.";
  }
}

/* generatePDF uses jsPDF with the canvas image (A4) */
function generatePDF() {
  const dataUrl = canvas.toDataURL("image/png", 1.0);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [CANVAS_WIDTH, CANVAS_HEIGHT]
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const fname = (currentStudent && currentStudent["CertificateNo"] ? currentStudent["CertificateNo"] + "_" : "") + (currentStudent && currentStudent["Name"] ? currentStudent["Name"].replace(/\s+/g,'_') : "certificate") + ".pdf";
  pdf.save(fname);
  statusEl.innerText = "PDF generated: " + fname;
}
