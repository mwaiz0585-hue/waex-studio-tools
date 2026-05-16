from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
from rembg import remove, new_session
from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

try:
    from docx2pdf import convert as docx2pdf_convert
except Exception:
    docx2pdf_convert = None

import io
import os
import tempfile
import subprocess
import shutil
import json


app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

print("Starting WAEX backend...")


# =========================
# Utilities
# =========================

def find_libreoffice():
    possible_paths = [
        os.environ.get("LIBREOFFICE_PATH"),
        shutil.which("soffice"),
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/usr/bin/soffice",
        "/usr/local/bin/soffice",
    ]

    for path in possible_paths:
        if path and os.path.exists(path):
            return path

    return None


def parse_page_ranges(page_text, total_pages):
    """
    Converts page input like:
    1,3,5-7
    into zero-based page indexes:
    [0, 2, 4, 5, 6]
    """
    if not page_text or not page_text.strip():
        raise ValueError("Please enter page numbers.")

    selected_pages = []
    parts = page_text.replace(" ", "").split(",")

    for part in parts:
        if not part:
            continue

        if "-" in part:
            start_text, end_text = part.split("-", 1)

            if not start_text.isdigit() or not end_text.isdigit():
                raise ValueError("Invalid page range format.")

            start = int(start_text)
            end = int(end_text)

            if start > end:
                raise ValueError("Page range start cannot be greater than end.")

            for page_number in range(start, end + 1):
                if page_number < 1 or page_number > total_pages:
                    raise ValueError(f"Page {page_number} is out of range.")
                selected_pages.append(page_number - 1)

        else:
            if not part.isdigit():
                raise ValueError("Invalid page number format.")

            page_number = int(part)

            if page_number < 1 or page_number > total_pages:
                raise ValueError(f"Page {page_number} is out of range.")

            selected_pages.append(page_number - 1)

    if not selected_pages:
        raise ValueError("No valid pages selected.")

    return selected_pages


def read_pdf_from_upload(file, password=None):
    pdf_bytes = file.read()

    if not pdf_bytes:
        raise ValueError("Uploaded PDF file is empty.")

    reader = PdfReader(io.BytesIO(pdf_bytes))

    if reader.is_encrypted:
        if not password:
            raise ValueError("This PDF is password protected. Please provide the password.")

        decrypt_result = reader.decrypt(password)

        if decrypt_result == 0:
            raise ValueError("Incorrect PDF password.")

    return reader


def send_pdf(writer, filename):
    output = io.BytesIO()
    writer.write(output)
    output.seek(0)

    return send_file(
        output,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )


try:
    bg_session = new_session("u2netp")
    print("Background removal session loaded successfully.")
except Exception as e:
    bg_session = None
    print("Failed to initialise background removal session:", e)


# =========================
# Static Routes
# =========================

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/healthz")
def health():
    return jsonify({"status": "ok"})


# =========================
# Background Remover
# =========================

@app.route("/remove-background", methods=["POST"])
def remove_background():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        input_bytes = file.read()

        if not input_bytes:
            return jsonify({"error": "Uploaded file is empty"}), 400

        if bg_session is None:
            return jsonify({
                "error": "Background removal model is not available on the server"
            }), 500

        output_bytes = remove(input_bytes, session=bg_session)

        return send_file(
            io.BytesIO(output_bytes),
            mimetype="image/png",
            as_attachment=True,
            download_name="waex-background-removed.png"
        )

    except Exception as e:
        print("Background removal error:", e)
        return jsonify({"error": str(e)}), 500


# =========================
# DOCX to PDF
# =========================

@app.route("/docx-to-pdf", methods=["POST"])
def docx_to_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if not file.filename.lower().endswith((".doc", ".docx")):
        return jsonify({"error": "Please upload a DOC or DOCX file"}), 400

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            original_name = os.path.splitext(file.filename)[0]
            input_ext = os.path.splitext(file.filename)[1].lower()

            input_path = os.path.join(temp_dir, f"input{input_ext}")
            output_path = os.path.join(temp_dir, "output.pdf")

            file.save(input_path)

            if os.name == "nt":
                if docx2pdf_convert is None:
                    return jsonify({
                        "error": "docx2pdf is not available. Please install docx2pdf and pywin32."
                    }), 500

                try:
                    docx2pdf_convert(input_path, output_path)

                    if not os.path.exists(output_path):
                        return jsonify({
                            "error": "DOCX to PDF failed. Output PDF was not created."
                        }), 500

                    with open(output_path, "rb") as pdf_file:
                        pdf_bytes = io.BytesIO(pdf_file.read())

                    pdf_bytes.seek(0)

                    return send_file(
                        pdf_bytes,
                        mimetype="application/pdf",
                        as_attachment=True,
                        download_name=f"{original_name}.pdf"
                    )

                except Exception as e:
                    print("docx2pdf conversion error:", e)
                    return jsonify({
                        "error": "DOCX to PDF failed using docx2pdf. Make sure Microsoft Word is installed and activated on this laptop.",
                        "details": str(e)
                    }), 500

            libreoffice_path = find_libreoffice()

            print("LibreOffice path:", libreoffice_path)

            if not libreoffice_path:
                return jsonify({
                    "error": "LibreOffice not found on server."
                }), 500

            lo_profile = os.path.join(temp_dir, "lo_profile")
            os.makedirs(lo_profile, exist_ok=True)

            result = subprocess.run(
                [
                    libreoffice_path,
                    "--headless",
                    "--nologo",
                    "--nofirststartwizard",
                    "--nolockcheck",
                    f"-env:UserInstallation=file://{lo_profile}",
                    "--convert-to",
                    "pdf:writer_pdf_Export",
                    "--outdir",
                    temp_dir,
                    input_path
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=180
            )

            print("LibreOffice return code:", result.returncode)
            print("LibreOffice STDOUT:", result.stdout)
            print("LibreOffice STDERR:", result.stderr)

            if result.returncode != 0:
                return jsonify({
                    "error": "LibreOffice failed to convert the document.",
                    "details": result.stderr or result.stdout
                }), 500

            pdf_files = [
                name for name in os.listdir(temp_dir)
                if name.lower().endswith(".pdf")
            ]

            if not pdf_files:
                return jsonify({
                    "error": "PDF conversion failed. Output PDF was not created.",
                    "stdout": result.stdout,
                    "stderr": result.stderr
                }), 500

            pdf_path = os.path.join(temp_dir, pdf_files[0])

            with open(pdf_path, "rb") as pdf_file:
                pdf_bytes = io.BytesIO(pdf_file.read())

            pdf_bytes.seek(0)

            return send_file(
                pdf_bytes,
                mimetype="application/pdf",
                as_attachment=True,
                download_name=f"{original_name}.pdf"
            )

    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Conversion took too long. Please try a smaller DOCX file."
        }), 500

    except Exception as e:
        print("DOCX to PDF error:", e)
        return jsonify({"error": str(e)}), 500


# =========================
# Image to PDF
# =========================

@app.route("/image-to-pdf", methods=["POST"])
def image_to_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    allowed_extensions = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff", ".tif", ".webp")
    supported_formats = "PNG, JPG, JPEG, BMP, GIF, TIFF, WEBP"

    if not file.filename.lower().endswith(allowed_extensions):
        return jsonify({"error": f"Please upload a supported image file ({supported_formats})."}), 400

    try:
        input_bytes = file.read()

        if not input_bytes:
            return jsonify({"error": "Uploaded image file is empty."}), 400

        try:
            image = Image.open(io.BytesIO(input_bytes))
        except UnidentifiedImageError:
            return jsonify({
                "error": "Unable to identify the image file. Please upload a valid image in supported formats."
            }), 400

        if getattr(image, "is_animated", False):
            image = image.convert("RGB")
        elif image.mode != "RGB":
            image = image.convert("RGB")

        output_bytes = io.BytesIO()
        image.save(output_bytes, format="PDF")
        output_bytes.seek(0)

        return send_file(
            output_bytes,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{os.path.splitext(file.filename)[0]}.pdf"
        )

    except Exception as e:
        print("Image to PDF error:", e)
        return jsonify({"error": "Failed to convert image to PDF. Please upload a supported image file."}), 500


# =========================
# PDF Editor Tools
# =========================

@app.route("/merge-pdf", methods=["POST"])
def merge_pdf():
    files = request.files.getlist("files")

    if not files or len(files) < 2:
        return jsonify({"error": "Please upload at least 2 PDF files to merge."}), 400

    writer = PdfWriter()

    try:
        for file in files:
            if file.filename == "":
                continue

            if not file.filename.lower().endswith(".pdf"):
                return jsonify({"error": "Only PDF files are allowed."}), 400

            reader = read_pdf_from_upload(file)

            for page in reader.pages:
                writer.add_page(page)

        if len(writer.pages) == 0:
            return jsonify({"error": "No valid PDF pages found."}), 400

        return send_pdf(writer, "waex-merged.pdf")

    except Exception as e:
        print("Merge PDF error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/split-pdf", methods=["POST"])
def split_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    file = request.files["file"]
    pages_text = request.form.get("pages", "")

    if file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    try:
        reader = read_pdf_from_upload(file)
        total_pages = len(reader.pages)
        selected_pages = parse_page_ranges(pages_text, total_pages)

        writer = PdfWriter()

        for page_index in selected_pages:
            writer.add_page(reader.pages[page_index])

        original_name = os.path.splitext(file.filename)[0]
        return send_pdf(writer, f"{original_name}-split.pdf")

    except Exception as e:
        print("Split PDF error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/delete-pdf-pages", methods=["POST"])
def delete_pdf_pages():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    file = request.files["file"]
    pages_text = request.form.get("pages", "")

    if file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    try:
        reader = read_pdf_from_upload(file)
        total_pages = len(reader.pages)
        pages_to_delete = set(parse_page_ranges(pages_text, total_pages))

        if len(pages_to_delete) >= total_pages:
            return jsonify({"error": "You cannot delete all pages from the PDF."}), 400

        writer = PdfWriter()

        for index, page in enumerate(reader.pages):
            if index not in pages_to_delete:
                writer.add_page(page)

        original_name = os.path.splitext(file.filename)[0]
        return send_pdf(writer, f"{original_name}-pages-deleted.pdf")

    except Exception as e:
        print("Delete PDF pages error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/rotate-pdf-pages", methods=["POST"])
def rotate_pdf_pages():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    file = request.files["file"]
    pages_text = request.form.get("pages", "")
    rotation_text = request.form.get("rotation", "90")

    if file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    try:
        rotation = int(rotation_text)

        if rotation not in [90, 180, 270]:
            return jsonify({"error": "Rotation must be 90, 180, or 270 degrees."}), 400

        reader = read_pdf_from_upload(file)
        total_pages = len(reader.pages)
        selected_pages = set(parse_page_ranges(pages_text, total_pages))

        writer = PdfWriter()

        for index, page in enumerate(reader.pages):
            if index in selected_pages:
                page.rotate(rotation)
            writer.add_page(page)

        original_name = os.path.splitext(file.filename)[0]
        return send_pdf(writer, f"{original_name}-rotated.pdf")

    except Exception as e:
        print("Rotate PDF pages error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/protect-pdf", methods=["POST"])
def protect_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    file = request.files["file"]
    password = request.form.get("password", "")

    if file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    if not password:
        return jsonify({"error": "Please enter a password to protect the PDF."}), 400

    try:
        reader = read_pdf_from_upload(file)
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        writer.encrypt(password)

        original_name = os.path.splitext(file.filename)[0]
        return send_pdf(writer, f"{original_name}-protected.pdf")

    except Exception as e:
        print("Protect PDF error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/unlock-pdf", methods=["POST"])
def unlock_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    file = request.files["file"]
    password = request.form.get("password", "")

    if file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    if not password:
        return jsonify({"error": "Please enter the PDF password."}), 400

    try:
        reader = read_pdf_from_upload(file, password=password)
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        original_name = os.path.splitext(file.filename)[0]
        return send_pdf(writer, f"{original_name}-unlocked.pdf")

    except Exception as e:
        print("Unlock PDF error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/add-signature-pdf", methods=["POST"])
def add_signature_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    if "signature" not in request.files:
        return jsonify({"error": "No signature image uploaded."}), 400

    pdf_file = request.files["file"]
    signature_file = request.files["signature"]

    page_input = request.form.get("signature_page", "1").strip().lower()
    preview_x_text = request.form.get("signature_x", "0").strip()
    preview_y_text = request.form.get("signature_y", "0").strip()
    preview_width_text = request.form.get("preview_width", "1").strip()
    preview_height_text = request.form.get("preview_height", "1").strip()
    signature_display_width_text = request.form.get("signature_display_width", "150").strip()
    signature_display_height_text = request.form.get("signature_display_height", "60").strip()

    if pdf_file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if signature_file.filename == "":
        return jsonify({"error": "No selected signature image."}), 400

    if not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    if not signature_file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
        return jsonify({"error": "Signature must be PNG, JPG, or JPEG."}), 400

    try:
        preview_x = float(preview_x_text)
        preview_y = float(preview_y_text)
        preview_width = float(preview_width_text)
        preview_height = float(preview_height_text)
        signature_display_width = float(signature_display_width_text)
        signature_display_height = float(signature_display_height_text)

        if preview_width <= 0 or preview_height <= 0:
            return jsonify({"error": "Invalid PDF preview size."}), 400

        if signature_display_width <= 0 or signature_display_height <= 0:
            return jsonify({"error": "Invalid signature size."}), 400

        reader = read_pdf_from_upload(pdf_file)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        signature_bytes = signature_file.read()

        if not signature_bytes:
            return jsonify({"error": "Signature image is empty."}), 400

        try:
            signature_image = Image.open(io.BytesIO(signature_bytes))
            signature_image.verify()
        except Exception:
            return jsonify({"error": "Invalid signature image file."}), 400

        if page_input == "all":
            target_pages = set(range(total_pages))
        else:
            if not page_input.isdigit():
                return jsonify({"error": "Signature page must be a number or 'all'."}), 400

            page_number = int(page_input)

            if page_number < 1 or page_number > total_pages:
                return jsonify({"error": f"Page {page_number} is out of range."}), 400

            target_pages = {page_number - 1}

        for index, page in enumerate(reader.pages):
            if index in target_pages:
                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)

                pdf_x = (preview_x / preview_width) * page_width
                pdf_signature_width = (signature_display_width / preview_width) * page_width
                pdf_signature_height = (signature_display_height / preview_height) * page_height

                pdf_y = page_height - ((preview_y + signature_display_height) / preview_height) * page_height

                overlay_stream = io.BytesIO()
                c = canvas.Canvas(overlay_stream, pagesize=(page_width, page_height))

                c.drawImage(
                    ImageReader(io.BytesIO(signature_bytes)),
                    pdf_x,
                    pdf_y,
                    width=pdf_signature_width,
                    height=pdf_signature_height,
                    mask="auto"
                )

                c.save()
                overlay_stream.seek(0)

                overlay_pdf = PdfReader(overlay_stream)
                page.merge_page(overlay_pdf.pages[0])

            writer.add_page(page)

        original_name = os.path.splitext(pdf_file.filename)[0]
        return send_pdf(writer, f"{original_name}-signed.pdf")

    except Exception as e:
        print("Add signature PDF error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/compress-pdf", methods=["POST"])
def compress_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    try:
        reader = read_pdf_from_upload(file)
        writer = PdfWriter()

        for page in reader.pages:
            try:
                page.compress_content_streams()
            except Exception:
                pass

            writer.add_page(page)

        writer.add_metadata({})

        original_name = os.path.splitext(file.filename)[0]
        return send_pdf(writer, f"{original_name}-compressed.pdf")

    except Exception as e:
        print("Compress PDF error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/edit-pdf-text", methods=["POST"])
def edit_pdf_text():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected PDF file."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    edit_items_text = request.form.get("edit_items", "").strip()

    if not edit_items_text:
        return jsonify({"error": "Please add at least one text box to the PDF."}), 400

    try:
        edit_items = json.loads(edit_items_text)
    except Exception:
        return jsonify({"error": "Invalid edit data received."}), 400

    if not isinstance(edit_items, list) or len(edit_items) == 0:
        return jsonify({"error": "Please add at least one text box to the PDF."}), 400

    allowed_fonts = {
        "Helvetica",
        "Helvetica-Bold",
        "Times-Roman",
        "Times-Bold",
        "Courier",
        "Courier-Bold"
    }

    try:
        reader = read_pdf_from_upload(file)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        for page_index, page in enumerate(reader.pages):
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            overlay_stream = io.BytesIO()
            c = canvas.Canvas(overlay_stream, pagesize=(page_width, page_height))
            has_overlay = False

            for item in edit_items:
                text = str(item.get("text", "")).strip()

                if not text:
                    continue

                apply_to = str(item.get("applyTo", "current")).strip().lower()

                try:
                    item_page = int(item.get("page", 1))
                except Exception:
                    item_page = 1

                should_apply = False

                if apply_to == "all":
                    should_apply = True
                elif item_page - 1 == page_index:
                    should_apply = True

                if not should_apply:
                    continue

                try:
                    preview_x = float(item.get("x", 0))
                    preview_y = float(item.get("y", 0))
                    preview_width = float(item.get("previewWidth", 1))
                    preview_height = float(item.get("previewHeight", 1))
                    display_height = float(item.get("displayHeight", 30))
                    font_size = float(item.get("fontSize", 22))
                except Exception:
                    continue

                font_family = str(item.get("fontFamily", "Helvetica")).strip()
                colour = str(item.get("colour", "#000000")).strip()

                if preview_width <= 0 or preview_height <= 0:
                    continue

                if font_size <= 0:
                    font_size = 22

                if font_family not in allowed_fonts:
                    font_family = "Helvetica"

                if not colour.startswith("#") or len(colour) != 7:
                    colour = "#000000"

                try:
                    red = int(colour[1:3], 16) / 255
                    green = int(colour[3:5], 16) / 255
                    blue = int(colour[5:7], 16) / 255
                except Exception:
                    red, green, blue = 0, 0, 0

                pdf_x = (preview_x / preview_width) * page_width
                pdf_y = page_height - ((preview_y + display_height * 0.75) / preview_height) * page_height
                pdf_font_size = (font_size / preview_height) * page_height

                c.setFont(font_family, pdf_font_size)
                c.setFillColorRGB(red, green, blue)

                lines = text.splitlines() or [text]
                line_gap = pdf_font_size * 1.2

                for line_index, line in enumerate(lines):
                    c.drawString(pdf_x, pdf_y - (line_index * line_gap), line)

                has_overlay = True

            c.save()
            overlay_stream.seek(0)

            if has_overlay:
                overlay_pdf = PdfReader(overlay_stream)
                page.merge_page(overlay_pdf.pages[0])

            writer.add_page(page)

        original_name = os.path.splitext(file.filename)[0]
        return send_pdf(writer, f"{original_name}-edited.pdf")

    except Exception as e:
        print("Edit PDF text error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)