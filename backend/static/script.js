let selectedTool = "";
let lastDownloadUrl = "";
let lastDownloadFilename = "";
let progressInterval = null;
let selectedPdfAction = "merge";

function showServices() {
  document.getElementById("welcomePage").classList.add("hidden");
  document.getElementById("servicesPage").classList.remove("hidden");
  document.title = "WAEX Tools Studio | Services";
}

function getPdfActionLabel(action) {
  const labels = {
    merge: "Merge PDF",
    split: "Split PDF",
    delete: "Delete Pages",
    rotate: "Rotate Pages",
    protect: "Protect PDF",
    unlock: "Unlock PDF"
  };

  return labels[action] || "PDF Editor";
}

function resetToolUI() {
  const fileInput = document.getElementById("fileInput");
  const fileName = document.getElementById("fileName");
  const previewSection = document.getElementById("previewSection");
  const originalCard = document.getElementById("originalCard");
  const resultCard = document.getElementById("resultCard");
  const originalPreviewImg = document.getElementById("originalPreviewImg");
  const resultPreviewImg = document.getElementById("resultPreviewImg");
  const resultInfoCard = document.getElementById("resultInfoCard");
  const resultFileType = document.getElementById("resultFileType");
  const resultStatusText = document.getElementById("resultStatusText");
  const downloadAgainBtn = document.getElementById("downloadAgainBtn");
  const pdfOptions = document.getElementById("pdfOptions");
  const chooseLabel = document.querySelector(".custom-file-upload");

  fileInput.value = "";
  fileInput.multiple = false;
  fileInput.removeAttribute("multiple");
  fileName.textContent = "No file selected";

  if (chooseLabel) {
    chooseLabel.textContent = "Choose File";
  }

  previewSection.classList.add("hidden");
  originalCard.classList.add("hidden");
  resultCard.classList.add("hidden");
  originalPreviewImg.src = "";
  resultPreviewImg.src = "";
  resultInfoCard.classList.add("hidden");
  resultFileType.textContent = "PNG";
  resultStatusText.textContent = "Ready";
  downloadAgainBtn.classList.add("hidden");

  if (pdfOptions) {
    pdfOptions.classList.add("hidden");
  }

  hideStatus();
  resetProgress();

  if (lastDownloadUrl) {
    URL.revokeObjectURL(lastDownloadUrl);
    lastDownloadUrl = "";
  }
}

function openTool(toolName) {
  selectedTool = toolName;

  document.getElementById("servicesPage").classList.add("hidden");
  document.getElementById("toolPage").classList.remove("hidden");

  const title = document.getElementById("toolTitle");
  const description = document.getElementById("toolDescription");
  const fileInput = document.getElementById("fileInput");
  const note = document.querySelector(".note");
  const dropTitle = document.querySelector(".drop-title");
  const pdfOptions = document.getElementById("pdfOptions");
  const chooseLabel = document.querySelector(".custom-file-upload");

  resetToolUI();

  if (toolName === "background") {
    title.textContent = "Background Remover";
    description.textContent = "Upload an image and remove its background instantly.";
    fileInput.accept = "image/*";
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    note.textContent = "Upload an image file and click the button to process it.";
    dropTitle.textContent = "Drag & Drop Your Image Here";
    document.title = "WAEX Tools Studio | Background Remover";
  }

  if (toolName === "docx") {
    title.textContent = "DOCX to PDF Converter";
    description.textContent = "Upload a Word document and convert it into PDF.";
    fileInput.accept = ".doc,.docx";
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    note.textContent = "Upload a DOC or DOCX file and click the button to convert it into PDF.";
    dropTitle.textContent = "Drag & Drop Your DOCX File Here";
    document.title = "WAEX Tools Studio | DOCX to PDF";
  }

  if (toolName === "image") {
    title.textContent = "Image to PDF Converter";
    description.textContent = "Upload an image and convert it into a PDF document.";
    fileInput.accept = "image/*";
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    note.textContent = "Supported formats: PNG, JPG, JPEG, BMP, GIF, TIFF, WEBP.";
    dropTitle.textContent = "Drag & Drop Your Image Here";
    document.title = "WAEX Tools Studio | Image to PDF";
  }

  if (toolName === "pdf-editor") {
    title.textContent = "PDF Editor Tools";
    description.textContent = "Choose a PDF action and upload your PDF file.";
    fileInput.accept = ".pdf,application/pdf";
    note.textContent = "Merge, split, delete, rotate, protect, or unlock PDF files.";
    dropTitle.textContent = "Drag & Drop Your PDF Files Here";
    pdfOptions.classList.remove("hidden");

    selectedPdfAction = "merge";

    document.querySelectorAll(".pdf-action-card").forEach(card => {
      card.classList.toggle("active", card.dataset.action === "merge");
    });

    document.title = "WAEX Tools Studio | PDF Editor Tools";
    updatePdfActionUI();
  }
}

function goBack() {
  document.getElementById("toolPage").classList.add("hidden");
  document.getElementById("servicesPage").classList.remove("hidden");
  resetToolUI();
  document.title = "WAEX Tools Studio | Services";
}

function showStatus(message, type) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove("hidden");
}

function hideStatus() {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.className = "status-message hidden";
  statusMessage.textContent = "";
}

function setButtonLoading(isLoading, text) {
  const uploadButton = document.querySelector(".upload-btn");
  const btnText = document.querySelector(".btn-text");
  const spinner = document.querySelector(".spinner");

  btnText.textContent = text;
  uploadButton.disabled = isLoading;

  if (isLoading) {
    spinner.classList.remove("hidden");
  } else {
    spinner.classList.add("hidden");
  }
}

function startFakeProgress(labelText = "Processing file...") {
  const progressSection = document.getElementById("progressSection");
  const progressLabel = document.getElementById("progressLabel");
  const progressPercent = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");

  let progress = 0;
  progressSection.classList.remove("hidden");
  progressLabel.textContent = labelText;
  progressPercent.textContent = "0%";
  progressFill.style.width = "0%";

  clearInterval(progressInterval);

  progressInterval = setInterval(() => {
    if (progress < 90) {
      progress += Math.floor(Math.random() * 8) + 3;
      if (progress > 90) progress = 90;
      progressFill.style.width = `${progress}%`;
      progressPercent.textContent = `${progress}%`;
    }
  }, 250);
}

function completeProgress(labelText = "Completed") {
  const progressLabel = document.getElementById("progressLabel");
  const progressPercent = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");

  clearInterval(progressInterval);
  progressLabel.textContent = labelText;
  progressFill.style.width = "100%";
  progressPercent.textContent = "100%";
}

function resetProgress() {
  const progressSection = document.getElementById("progressSection");
  const progressLabel = document.getElementById("progressLabel");
  const progressPercent = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");

  clearInterval(progressInterval);
  progressSection.classList.add("hidden");
  progressLabel.textContent = "Preparing file...";
  progressPercent.textContent = "0%";
  progressFill.style.width = "0%";
}

function updatePdfActionUI() {
  const fileInput = document.getElementById("fileInput");
  const fileName = document.getElementById("fileName");
  const pagesGroup = document.getElementById("pdfPagesGroup");
  const rotationGroup = document.getElementById("pdfRotationGroup");
  const passwordGroup = document.getElementById("pdfPasswordGroup");
  const note = document.querySelector(".note");
  const dropTitle = document.querySelector(".drop-title");
  const chooseLabel = document.querySelector(".custom-file-upload");

  pagesGroup.classList.add("hidden");
  rotationGroup.classList.add("hidden");
  passwordGroup.classList.add("hidden");

  fileInput.accept = ".pdf,application/pdf";
  fileInput.value = "";
  fileName.textContent = "No file selected";
  hideStatus();

  if (selectedPdfAction === "merge") {
    fileInput.multiple = true;
    fileInput.setAttribute("multiple", "multiple");
    chooseLabel.textContent = "Choose Files";
    dropTitle.textContent = "Drag & Drop Your PDF Files Here";
    note.textContent = "Upload at least 2 PDF files. Hold Ctrl and click multiple PDFs, or drag and drop multiple PDFs.";
  } else {
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
  }

  if (selectedPdfAction === "split") {
    pagesGroup.classList.remove("hidden");
    note.textContent = "Enter pages to extract. Example: 1,3,5-7";
  }

  if (selectedPdfAction === "delete") {
    pagesGroup.classList.remove("hidden");
    note.textContent = "Enter pages to delete. Example: 1,3,5-7";
  }

  if (selectedPdfAction === "rotate") {
    pagesGroup.classList.remove("hidden");
    rotationGroup.classList.remove("hidden");
    note.textContent = "Enter pages to rotate and choose rotation angle.";
  }

  if (selectedPdfAction === "protect") {
    passwordGroup.classList.remove("hidden");
    note.textContent = "Enter a password to protect the uploaded PDF.";
  }

  if (selectedPdfAction === "unlock") {
    passwordGroup.classList.remove("hidden");
    note.textContent = "Enter the current PDF password to unlock it.";
  }
}

function handleSelectedFile() {
  const fileInput = document.getElementById("fileInput");
  const fileName = document.getElementById("fileName");
  const previewSection = document.getElementById("previewSection");
  const originalCard = document.getElementById("originalCard");
  const resultCard = document.getElementById("resultCard");
  const originalPreviewImg = document.getElementById("originalPreviewImg");
  const resultPreviewImg = document.getElementById("resultPreviewImg");
  const resultInfoCard = document.getElementById("resultInfoCard");
  const downloadAgainBtn = document.getElementById("downloadAgainBtn");

  const files = Array.from(fileInput.files || []);
  const file = files[0];

  hideStatus();

  if (files.length === 0) {
    fileName.textContent = "No file selected";
    previewSection.classList.add("hidden");
    originalCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    originalPreviewImg.src = "";
    resultPreviewImg.src = "";
    resultInfoCard.classList.add("hidden");
    downloadAgainBtn.classList.add("hidden");
    return;
  }

  if (selectedTool === "background" && !file.type.startsWith("image/")) {
    fileInput.value = "";
    fileName.textContent = "No file selected";
    showStatus("Please select an image file for Background Remover.", "error");
    return;
  }

  if (selectedTool === "image" && !file.type.startsWith("image/")) {
    fileInput.value = "";
    fileName.textContent = "No file selected";
    showStatus("Please select an image file for Image to PDF conversion.", "error");
    return;
  }

  if (
    selectedTool === "docx" &&
    !file.name.toLowerCase().endsWith(".doc") &&
    !file.name.toLowerCase().endsWith(".docx")
  ) {
    fileInput.value = "";
    fileName.textContent = "No file selected";
    showStatus("Please select a DOC or DOCX file for conversion.", "error");
    return;
  }

  if (selectedTool === "pdf-editor") {
    const invalidPdf = files.some(item => !item.name.toLowerCase().endsWith(".pdf"));

    if (invalidPdf) {
      fileInput.value = "";
      fileName.textContent = "No file selected";
      showStatus("Please select PDF files only.", "error");
      return;
    }

    if (selectedPdfAction === "merge") {
      if (files.length === 1) {
        fileName.textContent = `${files[0].name} selected. Add at least 1 more PDF for merging.`;
      } else {
        fileName.textContent = `${files.length} PDF files selected: ${files.map(item => item.name).join(", ")}`;
      }
    } else {
      fileName.textContent = files[0].name;
    }

    previewSection.classList.add("hidden");
    originalCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    originalPreviewImg.src = "";
    resultPreviewImg.src = "";
    resultInfoCard.classList.add("hidden");
    downloadAgainBtn.classList.add("hidden");
    return;
  }

  fileName.textContent = file.name;
  resultPreviewImg.src = "";
  resultCard.classList.add("hidden");
  resultInfoCard.classList.add("hidden");
  downloadAgainBtn.classList.add("hidden");

  if ((selectedTool === "background" || selectedTool === "image") && file.type.startsWith("image/")) {
    const reader = new FileReader();

    reader.onload = function (e) {
      originalPreviewImg.src = e.target.result;
      previewSection.classList.remove("hidden");
      originalCard.classList.remove("hidden");
    };

    reader.readAsDataURL(file);
  } else {
    previewSection.classList.add("hidden");
    originalCard.classList.add("hidden");
    originalPreviewImg.src = "";
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function getErrorMessageFromResponse(responseText, fallback) {
  try {
    const errorJson = JSON.parse(responseText);

    if (errorJson && errorJson.error) {
      return errorJson.error;
    }
  } catch (jsonError) {
    // Use fallback below.
  }

  return responseText || fallback;
}

document.addEventListener("DOMContentLoaded", function () {
  const uploadButton = document.querySelector(".upload-btn");
  const fileInput = document.getElementById("fileInput");
  const dropArea = document.getElementById("dropArea");
  const downloadAgainBtn = document.getElementById("downloadAgainBtn");
  const pdfActionCards = document.querySelectorAll(".pdf-action-card");

  pdfActionCards.forEach(card => {
    card.addEventListener("click", function () {
      selectedPdfAction = card.dataset.action;

      pdfActionCards.forEach(item => item.classList.remove("active"));
      card.classList.add("active");

      updatePdfActionUI();
    });
  });

  fileInput.addEventListener("change", function () {
    handleSelectedFile();
  });

  ["dragenter", "dragover"].forEach(eventName => {
    dropArea.addEventListener(eventName, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove("dragover");
    });
  });

  dropArea.addEventListener("drop", function (e) {
    const droppedFiles = e.dataTransfer.files;

    if (!droppedFiles || droppedFiles.length === 0) {
      return;
    }

    const dataTransfer = new DataTransfer();

    if (selectedTool === "pdf-editor" && selectedPdfAction === "merge") {
      Array.from(droppedFiles).forEach(file => dataTransfer.items.add(file));
    } else {
      dataTransfer.items.add(droppedFiles[0]);
    }

    fileInput.files = dataTransfer.files;
    handleSelectedFile();
  });

  downloadAgainBtn.addEventListener("click", function () {
    if (lastDownloadUrl && lastDownloadFilename) {
      triggerDownload(lastDownloadUrl, lastDownloadFilename);
    }
  });

  uploadButton.addEventListener("click", async function () {
    const files = Array.from(fileInput.files || []);

    if (files.length === 0) {
      showStatus("Please upload a file first.", "error");
      return;
    }

    if (selectedTool === "background") {
      await removeBackground(files[0]);
      return;
    }

    if (selectedTool === "image") {
      await convertImageToPdf(files[0]);
      return;
    }

    if (selectedTool === "docx") {
      await convertDocxToPdf(files[0]);
      return;
    }

    if (selectedTool === "pdf-editor") {
      await processPdfEditor();
      return;
    }

    showStatus("Please choose a tool first.", "error");
  });
});

async function removeBackground(file) {
  const formData = new FormData();
  formData.append("file", file);

  const previewSection = document.getElementById("previewSection");
  const originalCard = document.getElementById("originalCard");
  const resultCard = document.getElementById("resultCard");
  const resultPreviewImg = document.getElementById("resultPreviewImg");
  const resultInfoCard = document.getElementById("resultInfoCard");
  const resultFileType = document.getElementById("resultFileType");
  const resultStatusText = document.getElementById("resultStatusText");
  const downloadAgainBtn = document.getElementById("downloadAgainBtn");

  hideStatus();
  startFakeProgress("Removing background...");
  setButtonLoading(true, "Processing...");

  try {
    const response = await fetch("/remove-background", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(getErrorMessageFromResponse(responseText, "Failed to remove background."));
    }

    const blob = await response.blob();

    if (lastDownloadUrl) {
      URL.revokeObjectURL(lastDownloadUrl);
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    lastDownloadUrl = downloadUrl;
    lastDownloadFilename = "waex-background-removed.png";

    resultPreviewImg.src = downloadUrl;
    previewSection.classList.remove("hidden");
    originalCard.classList.remove("hidden");
    resultCard.classList.remove("hidden");
    resultInfoCard.classList.remove("hidden");
    downloadAgainBtn.classList.remove("hidden");

    resultFileType.textContent = "PNG";
    resultStatusText.textContent = "Ready";

    completeProgress("Background removed");
    triggerDownload(downloadUrl, "waex-background-removed.png");

    showStatus("Background removed successfully. Your result is shown below.", "success");
  } catch (error) {
    console.error(error);
    resetProgress();
    showStatus(error.message || "Failed to remove background. Please try again.", "error");
  } finally {
    setTimeout(() => resetProgress(), 800);
    setButtonLoading(false, "Upload & Process");
  }
}

async function convertImageToPdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  hideStatus();
  startFakeProgress("Converting image...");
  setButtonLoading(true, "Converting...");

  try {
    const response = await fetch("/image-to-pdf", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(getErrorMessageFromResponse(responseText, "Failed to convert image to PDF."));
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const originalName = file.name.replace(/\.[^/.]+$/, "");

    completeProgress("Conversion completed");
    triggerDownload(downloadUrl, `${originalName}.pdf`);

    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    showStatus("Image converted successfully. Your PDF has been downloaded.", "success");
  } catch (error) {
    console.error(error);
    resetProgress();
    showStatus(error.message || "Failed to convert image to PDF. Please try again.", "error");
  } finally {
    setTimeout(() => resetProgress(), 800);
    setButtonLoading(false, "Upload & Process");
  }
}

async function convertDocxToPdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  hideStatus();
  startFakeProgress("Converting document...");
  setButtonLoading(true, "Converting...");

  try {
    const response = await fetch("/docx-to-pdf", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(getErrorMessageFromResponse(responseText, "Failed to convert DOCX to PDF."));
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const originalName = file.name.replace(/\.[^/.]+$/, "");

    completeProgress("Conversion completed");
    triggerDownload(downloadUrl, `${originalName}.pdf`);

    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    showStatus("DOCX converted successfully. Your PDF has been downloaded.", "success");
  } catch (error) {
    console.error(error);
    resetProgress();
    showStatus(error.message || "Failed to convert DOCX to PDF. Please try again.", "error");
  } finally {
    setTimeout(() => resetProgress(), 800);
    setButtonLoading(false, "Upload & Process");
  }
}

async function processPdfEditor() {
  const fileInput = document.getElementById("fileInput");
  const action = selectedPdfAction;
  const pages = document.getElementById("pdfPages").value.trim();
  const rotation = document.getElementById("pdfRotation").value;
  const password = document.getElementById("pdfPassword").value;

  const files = Array.from(fileInput.files || []);

  if (action === "merge" && files.length < 2) {
    showStatus("Please upload at least 2 PDF files to merge.", "error");
    return;
  }

  if (action !== "merge" && files.length < 1) {
    showStatus("Please upload a PDF file first.", "error");
    return;
  }

  if (["split", "delete", "rotate"].includes(action) && !pages) {
    showStatus("Please enter page numbers. Example: 1,3,5-7", "error");
    return;
  }

  if (["protect", "unlock"].includes(action) && !password) {
    showStatus("Please enter a password.", "error");
    return;
  }

  const endpointMap = {
    merge: "/merge-pdf",
    split: "/split-pdf",
    delete: "/delete-pdf-pages",
    rotate: "/rotate-pdf-pages",
    protect: "/protect-pdf",
    unlock: "/unlock-pdf"
  };

  const filenameMap = {
    merge: "waex-merged.pdf",
    split: "waex-split.pdf",
    delete: "waex-pages-deleted.pdf",
    rotate: "waex-rotated.pdf",
    protect: "waex-protected.pdf",
    unlock: "waex-unlocked.pdf"
  };

  const formData = new FormData();

  if (action === "merge") {
    files.forEach(file => formData.append("files", file));
  } else {
    formData.append("file", files[0]);
  }

  if (["split", "delete", "rotate"].includes(action)) {
    formData.append("pages", pages);
  }

  if (action === "rotate") {
    formData.append("rotation", rotation);
  }

  if (["protect", "unlock"].includes(action)) {
    formData.append("password", password);
  }

  hideStatus();
  startFakeProgress(`${getPdfActionLabel(action)} in progress...`);
  setButtonLoading(true, "Processing...");

  try {
    const response = await fetch(endpointMap[action], {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(getErrorMessageFromResponse(responseText, `${getPdfActionLabel(action)} failed.`));
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    completeProgress("PDF processed");
    triggerDownload(downloadUrl, filenameMap[action]);

    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    showStatus(`${getPdfActionLabel(action)} completed successfully. Your PDF has been downloaded.`, "success");
  } catch (error) {
    console.error(error);
    resetProgress();
    showStatus(error.message || `${getPdfActionLabel(action)} failed. Please try again.`, "error");
  } finally {
    setTimeout(() => resetProgress(), 800);
    setButtonLoading(false, "Upload & Process");
  }
}