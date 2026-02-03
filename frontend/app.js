const API_BASE = window.location.origin + "/api";

// State
let sourceFile = null;
let targetFile = null;
let uploadedFileIds = { source: null, target: null };
let selectedSheets = [];

// DOM Elements
const sourceDropzone = document.getElementById('sourceDropzone');
const targetDropzone = document.getElementById('targetDropzone');
const sourceInput = document.getElementById('sourceInput');
const targetInput = document.getElementById('targetInput');
const startBtn = document.getElementById('startBtn');
const sheetList = document.getElementById('sheetList');
const terminal = document.getElementById('terminal');
const progressBar = document.getElementById('progressBar');
const progressCount = document.getElementById('progressCount');
const progressPercent = document.getElementById('progressPercent');
const downloadArea = document.getElementById('downloadArea');
const downloadLink = document.getElementById('downloadLink');

// --- Utils ---
function log(msg, type = "info") {
    const div = document.createElement('div');
    div.className = `terminal-line ${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}

// DOM Elements (Glossary)
const glossaryDropzone = document.getElementById('glossaryDropzone');
const glossaryInput = document.getElementById('glossaryInput');
let glossaryFile = null;
let uploadedGlossaryId = null;

// --- Drag & Drop Handlers ---
function setupDropzone(zone, input, type) {
    zone.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
        handleFile(e.target.files[0], type, zone);
    });

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('active');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('active');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('active');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0], type, zone);
        }
    });
}

function handleFile(file, type, zone) {
    if (!file) return;

    // Validate type
    if (type === 'glossary') {
        if (!file.name.endsWith('.csv')) {
            log(`Invalid file type: ${file.name}. Please upload .csv`, "error");
            return;
        }
    } else {
        if (!file.name.endsWith('.xlsx')) {
            log(`Invalid file type: ${file.name}. Please upload .xlsx`, "error");
            return;
        }
    }

    // UI Feedback
    zone.classList.add('has-file');
    const infoDiv = zone.querySelector('.file-info');
    infoDiv.textContent = file.name;

    // Trigger Upload
    uploadSingleFile(type, file, zone);
}

setupDropzone(sourceDropzone, sourceInput, 'source');
setupDropzone(targetDropzone, targetInput, 'target');
setupDropzone(glossaryDropzone, glossaryInput, 'glossary');

async function uploadSingleFile(type, file, zone) {
    log(`Uploading ${type} file: ${file.name}...`, "system");
    const formData = new FormData();
    formData.append(type, file);

    try {
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = "Upload failed";
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.detail || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const data = await res.json();
        console.log("Upload Response Data:", data);

        if (type === 'source') {
            uploadedFileIds.source = data.source_file_id;
            console.log("Source Sheets received:", data.sheets);
            if (data.sheets && data.sheets.length > 0) {
                renderSheetList(data.sheets);
            } else {
                log("No sheets found in Source file. Ensure the Excel file contains readable data.", "error");
            }
        } else if (type === 'target') {
            uploadedFileIds.target = data.target_file_id;
        } else if (type === 'glossary') {
            uploadedGlossaryId = data.glossary_file_id;
        }

        log(`${type} upload complete.`, "success");
        checkStartReadiness();
    } catch (e) {
        log(`${type} upload failed: ${e.message}`, "error");
        zone.classList.remove('has-file');
        zone.querySelector('.file-info').textContent = "Upload failed";
    }
}

function renderSheetList(sheets) {
    sheetList.innerHTML = '';
    sheets.forEach(sheet => {
        const div = document.createElement('div');
        div.className = 'sheet-item';
        div.innerHTML = `
            <label>
                <input type="checkbox" value="${sheet}" checked>
                <span>${sheet}</span>
            </label>
        `;
        sheetList.appendChild(div);
    });
    document.getElementById('sheetSelectionArea').classList.remove('hidden');
    log(`Source analysis complete. Found ${sheets.length} sheets.`, "success");
}

// Select/Deselect All Buttons
document.getElementById('selectAllSheets')?.addEventListener('click', () => {
    sheetList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    log("All sheets selected.", "info");
});

document.getElementById('deselectAllSheets')?.addEventListener('click', () => {
    sheetList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    log("All sheets deselected.", "info");
});

function checkStartReadiness() {
    if (uploadedFileIds.source && uploadedFileIds.target) {
        startBtn.disabled = false;
        log("Ready to start inspection.", "info");
    } else {
        startBtn.disabled = true;
    }
}

const checkGlossaryBtn = null;
// ... logic for checkGlossaryBtn removed ...

// --- Execution ---
startBtn.addEventListener('click', async () => {
    // Collect Config
    const configStr = document.getElementById('sheetConfig').value;
    let sheetConfig = {};
    try {
        sheetConfig = JSON.parse(configStr);
    } catch (e) {
        log("Invalid JSON in configuration!", "error");
        return;
    }

    // Collect Sheets
    const checked = Array.from(sheetList.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    if (checked.length === 0) {
        log("Please select at least one sheet.", "error");
        return;
    }

    startBtn.disabled = true;
    startBtn.textContent = "Processing...";
    downloadArea.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';

    log("Starting inspection task...", "system");

    try {
        const payload = {
            source_file_id: uploadedFileIds.source,
            target_file_id: uploadedFileIds.target,
            sheets: checked,
            sheet_langs: sheetConfig,
            glossary_file_id: uploadedGlossaryId,
            cell_range: document.getElementById('cellRange').value || "C7:C28"
        };

        const res = await fetch(`${API_BASE}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());
        const { task_id } = await res.json();

        connectSSE(task_id);
    } catch (e) {
        log(`Failed to start: ${e.message}`, "error");
        startBtn.disabled = false;
        startBtn.textContent = "Start Inspection";
    }
});

function connectSSE(taskId) {
    const evtSource = new EventSource(`${API_BASE}/stream/${taskId}`);

    evtSource.onmessage = (e) => {
        const data = JSON.parse(e.data);

        if (data.type === 'log') {
            log(data.message, "info");
        } else if (data.type === 'progress') {
            const pct = data.percent + '%';
            progressBar.style.width = pct;
            progressPercent.textContent = pct;
            progressCount.textContent = `${data.current} / ${data.total}`;
            if (data.log) log(data.log, "system");
        } else if (data.type === 'complete') {
            evtSource.close();
            log("Inspection Complete!", "success");
            startBtn.disabled = false;
            startBtn.textContent = "Start New Inspection";

            // Setup Download
            downloadLink.href = `http://localhost:8000${data.download_url}`;
            downloadArea.classList.remove('hidden');
        } else if (data.type === 'error') {
            evtSource.close();
            log(`Error: ${data.message}`, "error");
            startBtn.disabled = false;
            startBtn.textContent = "Retry";
        }
    };

    evtSource.onerror = (e) => {
        log("Stream connection lost.", "error");
        evtSource.close();
        startBtn.disabled = false;
        startBtn.textContent = "Retry";
    };
}
