let selectedTool = "";
let lastDownloadUrl = "";
let lastDownloadFilename = "";
let progressInterval = null;
let selectedPdfAction = "merge";

let signaturePdfDoc = null;
let signatureCurrentPage = 1;
let signatureTotalPages = 0;
let signatureImageUrl = "";
let signatureDragging = false;
let signatureDragOffsetX = 0;
let signatureDragOffsetY = 0;

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
    unlock: "Unlock PDF",
    signature: "Add Signature",
    compress: "Compress PDF"
  };

  return labels[action] || "PDF Editor";
}

function resetSignatureEditor() {
  signaturePdfDoc = null;
  signatureCurrentPage = 1;
  signatureTotalPages = 0;

  const signatureInput = document.getElementById("pdfSignatureImage");
  const signatureImage = document.getElementById("signatureDraggable");
  const wrapper = document.getElementById("signaturePreviewWrapper");
  const emptyState = document.getElementById("signatureEmptyState");
  const pageInfo = document.getElementById("signaturePageInfo");
  const widthRange = document.getElementById("pdfSignatureWidthRange");
  const applyMode = document.getElementById("pdfSignatureApplyMode");

  if (signatureInput) {
    signatureInput.value = "";
  }

  if (signatureImage) {
    signatureImage.src = "";
    signatureImage.classList.add("hidden");
    signatureImage.style.left = "20px";
    signatureImage.style.top = "20px";
    signatureImage.style.width = "150px";
  }

  if (signatureImageUrl) {
    URL.revokeObjectURL(signatureImageUrl);
    signatureImageUrl = "";
  }

  if (wrapper) {
    wrapper.classList.add("hidden");
    wrapper.style.width = "";
    wrapper.style.height = "";
  }

  if (emptyState) {
    emptyState.classList.remove("hidden");
  }

  if (pageInfo) {
    pageInfo.textContent = "Upload a PDF to preview pages";
  }

  if (widthRange) {
    widthRange.value = "150";
  }

  if (applyMode) {
    applyMode.value = "current";
  }
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

  resetSignatureEditor();
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
    note.textContent = "Merge, split, delete, rotate, protect, unlock, or sign PDF files.";
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
  const signatureGroup = document.getElementById("pdfSignatureGroup");
  const note = document.querySelector(".note");
  const dropTitle = document.querySelector(".drop-title");
  const chooseLabel = document.querySelector(".custom-file-upload");

  pagesGroup.classList.add("hidden");
  rotationGroup.classList.add("hidden");
  passwordGroup.classList.add("hidden");

  if (signatureGroup) {
    signatureGroup.classList.add("hidden");
  }

  fileInput.accept = ".pdf,application/pdf";
  fileInput.value = "";
  fileName.textContent = "No file selected";
  hideStatus();
  resetSignatureEditor();

  if (selectedPdfAction === "merge") {
    fileInput.multiple = true;
    fileInput.setAttribute("multiple", "multiple");
    chooseLabel.textContent = "Choose Files";
    dropTitle.textContent = "Drag & Drop Your PDF Files Here";
    note.textContent = "Upload at least 2 PDF files. Hold Ctrl and click multiple PDFs, or drag and drop multiple PDFs.";
  }

  if (selectedPdfAction === "split") {
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
    pagesGroup.classList.remove("hidden");
    note.textContent = "Enter pages to extract. Example: 1,3,5-7";
  }

  if (selectedPdfAction === "delete") {
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
    pagesGroup.classList.remove("hidden");
    note.textContent = "Enter pages to delete. Example: 1,3,5-7";
  }

  if (selectedPdfAction === "rotate") {
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
    pagesGroup.classList.remove("hidden");
    rotationGroup.classList.remove("hidden");
    note.textContent = "Enter pages to rotate and choose rotation angle.";
  }

  if (selectedPdfAction === "protect") {
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
    passwordGroup.classList.remove("hidden");
    note.textContent = "Enter a password to protect the uploaded PDF.";
  }

  if (selectedPdfAction === "unlock") {
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
    passwordGroup.classList.remove("hidden");
    note.textContent = "Enter the current PDF password to unlock it.";
  }

  if (selectedPdfAction === "signature") {
    if (signatureGroup) {
      signatureGroup.classList.remove("hidden");
    }

    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose PDF";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
    note.textContent = "Upload a PDF, upload your signature image, drag it into place, then process.";
  }

  if (selectedPdfAction === "compress") {
    fileInput.multiple = false;
    fileInput.removeAttribute("multiple");
    chooseLabel.textContent = "Choose File";
    dropTitle.textContent = "Drag & Drop Your PDF File Here";
    note.textContent = "Upload one PDF file and compress it.";
  }
}

async function renderSignaturePage() {
  if (!signaturePdfDoc) {
    return;
  }

  const canvas = document.getElementById("pdfSignatureCanvas");
  const wrapper = document.getElementById("signaturePreviewWrapper");
  const pageInfo = document.getElementById("signaturePageInfo");
  const shell = document.getElementById("signaturePreviewShell");

  const page = await signaturePdfDoc.getPage(signatureCurrentPage);

  const baseViewport = page.getViewport({ scale: 1 });
  const maxWidth = Math.min(shell.clientWidth - 28, 820);
  const scale = Math.max(0.4, Math.min(maxWidth / baseViewport.width, 1.35));
  const viewport = page.getViewport({ scale });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  wrapper.style.width = `${canvas.width}px`;
  wrapper.style.height = `${canvas.height}px`;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  pageInfo.textContent = `Page ${signatureCurrentPage} of ${signatureTotalPages}`;
  placeSignatureDefault();
}

function placeSignatureDefault() {
  const signature = document.getElementById("signatureDraggable");
  const wrapper = document.getElementById("signaturePreviewWrapper");

  if (!signature || signature.classList.contains("hidden") || wrapper.classList.contains("hidden")) {
    return;
  }

  const sigWidth = signature.offsetWidth || 150;
  const sigHeight = signature.offsetHeight || 60;

  const left = Math.max(12, wrapper.clientWidth - sigWidth - 40);
  const top = Math.max(12, wrapper.clientHeight - sigHeight - 40);

  signature.style.left = `${left}px`;
  signature.style.top = `${top}px`;
}

function handleSignatureImageChange() {
  const signatureInput = document.getElementById("pdfSignatureImage");
  const signature = document.getElementById("signatureDraggable");
  const widthRange = document.getElementById("pdfSignatureWidthRange");

  const file = signatureInput.files[0];

  if (!file) {
    signature.classList.add("hidden");
    signature.src = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    signatureInput.value = "";
    showStatus("Please upload a valid signature image.", "error");
    return;
  }

  if (signatureImageUrl) {
    URL.revokeObjectURL(signatureImageUrl);
  }

  signatureImageUrl = URL.createObjectURL(file);
  signature.src = signatureImageUrl;
  signature.style.width = `${widthRange.value}px`;
  signature.classList.remove("hidden");

  signature.onload = function () {
    placeSignatureDefault();
  };
}

function updateSignatureSize() {
  const signature = document.getElementById("signatureDraggable");
  const widthRange = document.getElementById("pdfSignatureWidthRange");

  if (!signature) {
    return;
  }

  signature.style.width = `${widthRange.value}px`;

  const wrapper = document.getElementById("signaturePreviewWrapper");
  const left = Math.min(signature.offsetLeft, wrapper.clientWidth - signature.offsetWidth);
  const top = Math.min(signature.offsetTop, wrapper.clientHeight - signature.offsetHeight);

  signature.style.left = `${Math.max(0, left)}px`;
  signature.style.top = `${Math.max(0, top)}px`;
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
    resetSignatureEditor();
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

    if (selectedPdfAction === "signature") {
      prepareSignaturePdfPreview(file);
    }

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
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const uploadButton = document.querySelector(".upload-btn");
  const fileInput = document.getElementById("fileInput");
  const dropArea = document.getElementById("dropArea");
  const downloadAgainBtn = document.getElementById("downloadAgainBtn");
  const pdfActionCards = document.querySelectorAll(".pdf-action-card");

  const signatureInput = document.getElementById("pdfSignatureImage");
  const widthRange = document.getElementById("pdfSignatureWidthRange");
  const prevPageBtn = document.getElementById("signaturePrevPage");
  const nextPageBtn = document.getElementById("signatureNextPage");
  const signature = document.getElementById("signatureDraggable");
  const wrapper = document.getElementById("signaturePreviewWrapper");

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

  if (signatureInput) {
    signatureInput.addEventListener("change", handleSignatureImageChange);
  }

  if (widthRange) {
    widthRange.addEventListener("input", updateSignatureSize);
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", async function () {
      if (!signaturePdfDoc || signatureCurrentPage <= 1) {
        return;
      }

      signatureCurrentPage -= 1;
      await renderSignaturePage();
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", async function () {
      if (!signaturePdfDoc || signatureCurrentPage >= signatureTotalPages) {
        return;
      }

      signatureCurrentPage += 1;
      await renderSignaturePage();
    });
  }

  if (signature && wrapper) {
    signature.addEventListener("pointerdown", function (e) {
      signatureDragging = true;

      const sigRect = signature.getBoundingClientRect();
      signatureDragOffsetX = e.clientX - sigRect.left;
      signatureDragOffsetY = e.clientY - sigRect.top;

      signature.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    signature.addEventListener("pointermove", function (e) {
      if (!signatureDragging) {
        return;
      }

      const wrapperRect = wrapper.getBoundingClientRect();

      let newLeft = e.clientX - wrapperRect.left - signatureDragOffsetX;
      let newTop = e.clientY - wrapperRect.top - signatureDragOffsetY;

      newLeft = Math.max(0, Math.min(newLeft, wrapper.clientWidth - signature.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, wrapper.clientHeight - signature.offsetHeight));

      signature.style.left = `${newLeft}px`;
      signature.style.top = `${newTop}px`;
    });

    signature.addEventListener("pointerup", function () {
      signatureDragging = false;
    });

    signature.addEventListener("pointercancel", function () {
      signatureDragging = false;
    });
  }

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

  const signatureImage = document.getElementById("pdfSignatureImage");
  const signatureApplyMode = document.getElementById("pdfSignatureApplyMode");
  const signatureElement = document.getElementById("signatureDraggable");
  const signatureWrapper = document.getElementById("signaturePreviewWrapper");
  const signatureCanvas = document.getElementById("pdfSignatureCanvas");

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

  if (action === "signature") {
    if (!signatureImage.files || signatureImage.files.length === 0) {
      showStatus("Please upload a signature image.", "error");
      return;
    }

    if (!signaturePdfDoc || signatureWrapper.classList.contains("hidden")) {
      showStatus("Please wait for the PDF preview to load.", "error");
      return;
    }

    if (signatureElement.classList.contains("hidden")) {
      showStatus("Please place the signature on the PDF preview.", "error");
      return;
    }
  }

  const endpointMap = {
    merge: "/merge-pdf",
    split: "/split-pdf",
    delete: "/delete-pdf-pages",
    rotate: "/rotate-pdf-pages",
    protect: "/protect-pdf",
    unlock: "/unlock-pdf",
    signature: "/add-signature-pdf",
    compress: "/compress-pdf"
  };

  const filenameMap = {
    merge: "waex-merged.pdf",
    split: "waex-split.pdf",
    delete: "waex-pages-deleted.pdf",
    rotate: "waex-rotated.pdf",
    protect: "waex-protected.pdf",
    unlock: "waex-unlocked.pdf",
    signature: "waex-signed.pdf",
    compress: "waex-compressed.pdf"
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

  if (action === "signature") {
    formData.append("signature", signatureImage.files[0]);

    const pageValue = signatureApplyMode.value === "all" ? "all" : String(signatureCurrentPage);

    formData.append("signature_page", pageValue);
    formData.append("signature_x", String(signatureElement.offsetLeft));
    formData.append("signature_y", String(signatureElement.offsetTop));
    formData.append("preview_width", String(signatureCanvas.width));
    formData.append("preview_height", String(signatureCanvas.height));
    formData.append("signature_display_width", String(signatureElement.offsetWidth));
    formData.append("signature_display_height", String(signatureElement.offsetHeight));
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