// Google Sheet URL
const SHEET_URL =
  "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

// Certificate template
const TEMPLATE = "certificate_template.png";

// Canvas setup
const canvas = document.getElementById("certCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1414;
canvas.height = 2000;

// MAIN FUNCTION
async function generateCertificate() {
  const certNo = document.getElementById("certInput").value.trim();

  if (!certNo) {
    document.getElementById("status").innerText = "Enter Certificate Number";
    return;
  }

  document.getElementById("status").innerText = "Loading student data...";

  // Load Google Sheet
  const res = await fetch(SHEET_URL);
  const data = await res.json();

  const student = data.find((s) => s.CertificateNo === certNo);

  if (!student) {
    document.getElementById("status").innerText = "Certificate Not Found!";
    return;
  }

  document.getElementById("status").innerText = "Loading Template...";

  // LOAD TEMPLATE FIRST (WAIT COMPLETELY)
  const template = await loadImage(TEMPLATE);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  // LOAD PHOTO (optional)
  let photo = null;
  if (student.PHOTO) {
    try {
      photo = await loadImage(student.PHOTO);
    } catch (e) {
      console.log("Photo failed:", e);
    }
  }

  // LOAD QR (optional)
  let qrCanvas = null;
  if (student["QR LINK"]) {
    qrCanvas = await generateQR(student["QR LINK"]);
  }

  // DRAW PHOTO
  if (photo) {
    ctx.drawImage(photo, 1177, 566, 183, 226);
  }

  // DRAW QR
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, 1179, 1515, 190, 190);
  }

  // TEXT STYLE
  ctx.fillStyle = "#000";
  ctx.font = "40px Arial";

  // DRAW TEXT
  ctx.fillText(student.Course, 849, 781);
  ctx.fillText(student.Name, 822, 886);
  ctx.fillText("CADD TECH EDU", 822, 986);
  ctx.fillText(student["Duration (Month)"], 816, 1086);
  ctx.fillText(student.StudentID, 787, 1136);
  ctx.fillText(student.IssueDate, 784, 1223);
  ctx.fillText(student.CertificateNo, 1177, 1754);

  document.getElementById("status").innerText =
    "Certificate Loaded — Click Generate PDF!";
}

// IMAGE LOADER (IMPORTANT FIX)
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("IMAGE LOAD ERROR: " + url);
    img.src = url;
  });
}

// QR CREATOR
function generateQR(text) {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    const q = new QRCode(div, {
      text: text,
      width: 300,
      height: 300,
    });

    setTimeout(() => {
      resolve(div.querySelector("img"));
    }, 500);
  });
}
