// Google Sheet URL
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Template image
const TEMPLATE = "certificate_template.png";

// Canvas
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");

async function generateCertificate() {
  // Fix canvas size
  canvas.width = 1414;
  canvas.height = 2000;

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
    document.getElementById("status").innerText = "Certificate not found!";
    return;
  }

  document.getElementById("status").innerText = "Generating certificate...";

  // Load background
  const template = await loadImage(TEMPLATE);
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  document.getElementById("status").innerText = "Certificate Loaded!";
}

// Image loader function
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Image load error: " + url);
    img.src = url;
  });
}
