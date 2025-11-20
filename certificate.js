// Template file (must exist in GitHub root)
const TEMPLATE = "certificate.png";

// Canvas
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");

// Set REAL template resolution
canvas.width = 1414;
canvas.height = 2000;

// Load image with anti-cache
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Image load error: " + url);
    img.src = url + "?v=" + Date.now(); // prevents caching issues
  });
}

// MAIN FUNCTION: Load template only
async function generateCertificate() {
  const status = document.getElementById("status");
  status.innerText = "Loading template...";

  console.log("Trying to load:", TEMPLATE);

  let template;
  try {
    template = await loadImage(TEMPLATE);
  } catch (err) {
    console.error(err);
    status.innerText = "Failed to load template!";
    return;
  }

  // Draw template
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  status.innerText = "Template Loaded!";
  console.log("TEMPLATE LOADED SUCCESSFULLY!");
}

// DOWNLOAD PNG
function downloadCertificate() {
  const link = document.createElement("a");
  link.download = "certificate.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
