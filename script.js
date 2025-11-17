// ====== GOOGLE SHEET LIVE DATA FETCH ======

const SHEET_URL = "https://opensheet.elk.sh/1XwenRaqJo7FdOHMZfStaDmi1DFDYB_A5WQz0HGNtdGs/Sheet1";

let students = {};  // Database will load here

// Fetch data from Google Sheet
fetch(SHEET_URL)
    .then(response => response.json())
    .then(data => {
        data.forEach(row => {
            const id = row["CertificateNo"].trim(); // Use Certificate No or Student ID
            students[id] = {
                name: row["Name"],
                course: row["Course"],
                duration: row["Duration (Month)"],
                issued: row["IssueDate"],
                certificateNo: row["CertificateNo"],
                status: row["Status"]
            };
        });
        console.log("Student data loaded:", students);
    })
    .catch(error => console.error("Error loading sheet:", error));



// ====== SEARCH FUNCTION ======

function searchStudent() {
    const id = document.getElementById("searchInput").value.trim();
    const resultBox = document.getElementById("result");

    if (!id) {
        resultBox.innerHTML = `<h2 style="color:red;">Please enter a Certificate Number</h2>`;
        resultBox.classList.remove("hidden");
        return;
    }

    if (students[id]) {
        const s = students[id];

        resultBox.innerHTML = `
            <h2>Certificate Details</h2>
            <p><strong>Student Name:</strong> ${s.name}</p>
            <p><strong>Course:</strong> ${s.course}</p>
            <p><strong>Duration:</strong> ${s.duration}</p>
            <p><strong>Issue Date:</strong> ${s.issued}</p>
            <p><strong>Certificate Number:</strong> ${s.certificateNo}</p>
            <p><strong>Status:</strong> 
                <span style="color: green; font-weight: bold;">${s.status}</span>
            </p>
        `;

        resultBox.classList.remove("hidden");
    } else {
        resultBox.innerHTML = `
            <h2 style="color:red;">Not Found</h2>
            <p>No certificate found for ID: <strong>${id}</strong></p>
        `;
        resultBox.classList.remove("hidden");
    }
}
