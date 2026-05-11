from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
from rembg import remove, new_session
from PIL import Image, UnidentifiedImageError
import io
import os
import tempfile
import subprocess
import shutil

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

print("Starting WAEX backend...")


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


try:
    bg_session = new_session("u2netp")
    print("Background removal session loaded successfully.")
except Exception as e:
    bg_session = None
    print("Failed to initialize background removal session:", e)


@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/healthz")
def health():
    return jsonify({"status": "ok"})


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
            input_path = os.path.join(temp_dir, file.filename)
            file.save(input_path)

            libreoffice_path = find_libreoffice()

            print("LibreOffice path:", libreoffice_path)

            if not libreoffice_path:
                return jsonify({
                    "error": "LibreOffice not found. Please install LibreOffice or check the soffice.exe path."
                }), 500

            subprocess.run(
                [
                    libreoffice_path,
                    "--headless",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    temp_dir,
                    input_path
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            pdf_filename = os.path.splitext(file.filename)[0] + ".pdf"
            pdf_path = os.path.join(temp_dir, pdf_filename)

            if not os.path.exists(pdf_path):
                return jsonify({"error": "PDF conversion failed. Output PDF was not created."}), 500

            with open(pdf_path, "rb") as pdf_file:
                pdf_bytes = io.BytesIO(pdf_file.read())

            pdf_bytes.seek(0)

            return send_file(
                pdf_bytes,
                mimetype="application/pdf",
                as_attachment=True,
                download_name=pdf_filename
            )

    except subprocess.CalledProcessError as e:
        print("LibreOffice conversion error:")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)

        return jsonify({
            "error": "LibreOffice failed to convert the document.",
            "details": e.stderr
        }), 500


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
            return jsonify({"error": "Unable to identify the image file. Please upload a valid image in supported formats."}), 400

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


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)