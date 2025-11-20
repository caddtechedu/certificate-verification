/* ============================================================
   CADD TECH EDU – FINAL CERTIFICATE GENERATOR JS
   Fully working version with:
   ✔ Correct template
   ✔ Correct coordinates
   ✔ Student details
   ✔ QR code
   ✔ Photo
   ✔ PDF generator
============================================================ */

// GOOGLE SHEET
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// TEMPLATE (must match file name in GitHub)
const TEMPLATE = "https://caddtechedu.github.io/certificate-verification/certificate.png";


// CANVAS SETUP
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1414;
canvas.height = 2000;

let TEMPLATE_IMG = null;

/* ============================================================
   LOAD TEMPLATE FIRST
============================================================ */
function preloadTemplate() {
  return loadImage(TEMPLATE)
    .then((img) => {
      TEMPLATE_IMG = img;
      console.log("Template loaded.");
    })
    .catch((e) => {
      console.error("Template failed:", e);
      document.getElementById("status").innerText =
        "Template failed to load!";
    });
}

preloadTemplate();

/* ============================================================
   LOAD CERTIFICATE DATA & DRAW
============================================================ */
async function loadAndRender() {
  const certNo = document.getElementById("certInput").value.trim();
  if (!certNo) return alert("Enter Certificate Number!");

  document.getElementById("status").innerText = "Loading...";

  const res = await fetch(SHEET_URL);
  const data = await res.json();

  const s = data.find((x) => x.CertificateNo === certNo);

  if (!s) {
    document.getElementById("status").innerText = "Certificate Not Found!";
    return;
  }

  // Draw template on canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(TEMPLATE_IMG, 0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000";
  ctx.font = "40px Arial";

  /* ============================================================
     DRAW TEXT EXACT COORDINATES (YOUR FINAL VALUES)
  ============================================================ */

  ctx.fillText(s.Course, 753, 772); // Course
  ctx.fillText(s.Name, 780, 877); // Name
  ctx.fillText(s["Duration (Month)"], 912, 1053); // Duration
  ctx.fillText(s.StudentID, 864, 1104); // Student ID
  ctx.fillText(s.IssueDate, 891, 1242); // Issue Date
  ctx.fillText(s.CertificateNo, 1164, 1791); // Certificate No

  /* ============================================================
     PHOTO
  ============================================================ */
  if (s.PHOTO) {
    try {
      const photo = await loadImage(s.PHOTO);
      ctx.drawImage(photo, 1403, 487, 180, 226);
    } catch (err) {
      console.warn("Photo load failed:", err);
    }
  }

  /* ============================================================
     QR CODE
  ============================================================ */
  if (s["QR LINK"]) {
    const qrCanvas = document.createElement("canvas");

    new QRCode(qrCanvas, {
      text: s["QR LINK"],
      width: 300,
      height: 300,
    });

    const qrImg = qrCanvas.querySelector("img");
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 1140, 1443, 190, 190);
    };
  }

  document.getElementById("status").innerText =
    "Certificate Loaded — Click Generate PDF";
}

/* ============================================================
   GENERATE PDF
============================================================ */
async function generateCertificate() {
  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF("p", "px", [canvas.width, canvas.height]);
  const imgData = canvas.toDataURL("image/png");

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save("certificate.pdf");
}

/* ============================================================
   IMAGE LOADER FUNCTION
============================================================ */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Image load error: " + url);
    img.src = url;
  });
}

/* ============================================================
   MAKE FUNCTIONS AVAILABLE IN HTML BUTTONS
============================================================ */
window.loadAndRender = loadAndRender;
window.generateCertificate = generateCertificate;
