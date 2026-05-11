let selectedTool = "";
let lastDownloadUrl = "";
let lastDownloadFilename = "";
let progressInterval = null;

function showServices() {
  document.getElementById("welcomePage").classList.add("hidden");
  document.getElementById("servicesPage").classList.remove("hidden");
  document.title = "WAEX Tools Studio | Services";
}

function openTool(toolName) {
  selectedTool = toolName;

  document.getElementById("servicesPage").classList.add("hidden");
  document.getElementById("toolPage").classList.remove("hidden");

  const title = document.getElementById("toolTitle");
  const description = document.getElementById("toolDescription");
  const fileInput = document.getElementById("fileInput");
  const note = document.querySelector(".note");
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
  const dropTitle = document.querySelector(".drop-title");

  fileInput.value = "";
  fileName.textContent = "No file selected";
  previewSection.classList.add("hidden");
  originalCard.classList.add("hidden");
  resultCard.classList.add("hidden");
  originalPreviewImg.src = "";
  resultPreviewImg.src = "";
  resultInfoCard.classList.add("hidden");
  resultFileType.textContent = "PNG";
  resultStatusText.textContent = "Ready";
  downloadAgainBtn.classList.add("hidden");
  hideStatus();
  resetProgress();

  if (lastDownloadUrl) {
    URL.revokeObjectURL(lastDownloadUrl);
    lastDownloadUrl = "";
  }

  if (toolName === "background") {
    title.textContent = "Background Remover";
    description.textContent = "Upload an image and remove its background instantly.";
    fileInput.accept = "image/*";
    note.textContent = "Upload an image file and click the button to process it.";
    dropTitle.textContent = "Drag & Drop Your Image Here";
    document.title = "WAEX Tools Studio | Background Remover";
  }

  if (toolName === "docx") {
    title.textContent = "DOCX to PDF Converter";
    description.textContent = "Upload a Word document and convert it into PDF.";
    fileInput.accept = ".doc,.docx";
    note.textContent = "Upload a DOC or DOCX file and click the button to convert it into PDF.";
    dropTitle.textContent = "Drag & Drop Your DOCX File Here";
    document.title = "WAEX Tools Studio | DOCX to PDF";
  }

  if (toolName === "image") {
    title.textContent = "Image to PDF Converter";
    description.textContent = "Upload an image and convert it into a PDF document.";
    fileInput.accept = "image/*";
    note.textContent = "Supported formats: PNG, JPG, JPEG, BMP, GIF, TIFF, WEBP.";
    dropTitle.textContent = "Drag & Drop Your Image Here";
    document.title = "WAEX Tools Studio | Image to PDF";
  }
}

function goBack() {
  document.getElementById("toolPage").classList.add("hidden");
  document.getElementById("servicesPage").classList.remove("hidden");

  document.getElementById("fileInput").value = "";
  document.getElementById("fileName").textContent = "No file selected";
  document.getElementById("previewSection").classList.add("hidden");
  document.getElementById("originalCard").classList.add("hidden");
  document.getElementById("resultCard").classList.add("hidden");
  document.getElementById("originalPreviewImg").src = "";
  document.getElementById("resultPreviewImg").src = "";
  document.getElementById("resultInfoCard").classList.add("hidden");
  document.getElementById("downloadAgainBtn").classList.add("hidden");

  hideStatus();
  resetProgress();

  if (lastDownloadUrl) {
    URL.revokeObjectURL(lastDownloadUrl);
    lastDownloadUrl = "";
  }

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

function handleSelectedFile(file) {
  const fileName = document.getElementById("fileName");
  const previewSection = document.getElementById("previewSection");
  const originalCard = document.getElementById("originalCard");
  const resultCard = document.getElementById("resultCard");
  const originalPreviewImg = document.getElementById("originalPreviewImg");
  const resultPreviewImg = document.getElementById("resultPreviewImg");
  const resultInfoCard = document.getElementById("resultInfoCard");
  const downloadAgainBtn = document.getElementById("downloadAgainBtn");
  const fileInput = document.getElementById("fileInput");

  hideStatus();

  if (!file) {
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
    previewSection.classList.add("hidden");
    originalCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    originalPreviewImg.src = "";
    resultPreviewImg.src = "";
    resultInfoCard.classList.add("hidden");
    downloadAgainBtn.classList.add("hidden");
    showStatus("Please select an image file for Background Remover.", "error");
    return;
  }

  if (selectedTool === "image" && !file.type.startsWith("image/")) {
    fileInput.value = "";
    fileName.textContent = "No file selected";
    previewSection.classList.add("hidden");
    originalCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    originalPreviewImg.src = "";
    resultPreviewImg.src = "";
    resultInfoCard.classList.add("hidden");
    downloadAgainBtn.classList.add("hidden");
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
    previewSection.classList.add("hidden");
    originalCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    originalPreviewImg.src = "";
    resultPreviewImg.src = "";
    resultInfoCard.classList.add("hidden");
    downloadAgainBtn.classList.add("hidden");
    showStatus("Please select a DOC or DOCX file for conversion.", "error");
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

document.addEventListener("DOMContentLoaded", function () {
  const uploadButton = document.querySelector(".upload-btn");
  const fileInput = document.getElementById("fileInput");
  const dropArea = document.getElementById("dropArea");
  const downloadAgainBtn = document.getElementById("downloadAgainBtn");

  fileInput.addEventListener("change", function () {
    const file = fileInput.files[0];
    handleSelectedFile(file);
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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleSelectedFile(files[0]);
    }
  });

  downloadAgainBtn.addEventListener("click", function () {
    if (lastDownloadUrl && lastDownloadFilename) {
      triggerDownload(lastDownloadUrl, lastDownloadFilename);
    }
  });

  uploadButton.addEventListener("click", async function () {
    const file = fileInput.files[0];

    if (!file) {
      showStatus("Please upload a file first.", "error");
      return;
    }

    if (selectedTool === "background") {
      await removeBackground(file);
      return;
    }

    if (selectedTool === "image") {
      await convertImageToPdf(file);
      return;
    }

    if (selectedTool === "docx") {
      await convertDocxToPdf(file);
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
      const errorText = await response.text();
      throw new Error(errorText || "Failed to remove background.");
    }

    const blob = await response.blob();

    if (lastDownloadUrl) {
      URL.revokeObjectURL(lastDownloadUrl);
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    lastDownloadUrl = downloadUrl;

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

    lastDownloadFilename = "waex-background-removed.png";
    showStatus("Background removed successfully. Your result is shown below.", "success");
  } catch (error) {
    console.error(error);
    resetProgress();
    showStatus("Failed to remove background. Please try again.", "error");
  } finally {
    setTimeout(() => {
      resetProgress();
    }, 800);
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
      let errorText = "Failed to convert image to PDF.";
      const responseText = await response.text();
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson && errorJson.error) {
          errorText = errorJson.error;
        } else if (responseText) {
          errorText = responseText;
        }
      } catch (jsonError) {
        if (responseText) {
          errorText = responseText;
        }
      }
      throw new Error(errorText || "Failed to convert image to PDF.");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const originalName = file.name.replace(/\.[^/.]+$/, "");

    lastDownloadFilename = `${originalName}.pdf`;
    triggerDownload(downloadUrl, `${originalName}.pdf`);

    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    completeProgress("Conversion completed");
    showStatus("Image converted successfully. Your PDF has been downloaded.", "success");
  } catch (error) {
    console.error(error);
    resetProgress();
    showStatus(error.message || "Failed to convert image to PDF. Please try again.", "error");
  } finally {
    setTimeout(() => {
      resetProgress();
    }, 800);
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
      let errorText = "Failed to convert DOCX to PDF.";
      const responseText = await response.text();
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson && errorJson.error) {
          errorText = errorJson.error;
        } else if (responseText) {
          errorText = responseText;
        }
      } catch (jsonError) {
        if (responseText) {
          errorText = responseText;
        }
      }
      throw new Error(errorText || "Failed to convert DOCX to PDF.");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const originalName = file.name.replace(/\.[^/.]+$/, "");
    completeProgress("Conversion completed");
    lastDownloadFilename = `${originalName}.pdf`;
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
    setTimeout(() => {
      resetProgress();
    }, 800);
    setButtonLoading(false, "Upload & Process");
  }
}