from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from rembg import remove, new_session
import io
import os
import tempfile
import subprocess
import shutil

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

print("Starting WAEX backend...")

try:
    bg_session = new_session("u2netp")
    print("Background removal session loaded successfully.")
except Exception as e:
    bg_session = None
    print("Failed to initialize background removal session:", e)

@app.route("/")
def serve_index():
    return app.send_static_file("index.html")

@app.route("/healthz")
def health():
    return jsonify({"status": "ok"})

@app.route("/<path:path>")
def serve_static(path):
    return app.send_static_file(path)

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
            return jsonify({"error": "Background removal model is not available on the server"}), 500

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

            libreoffice_path = os.environ.get("LIBREOFFICE_PATH") or shutil.which("soffice")

            if not libreoffice_path:
                return jsonify({
                    "error": "LibreOffice not found in deployment environment."
                }), 500

            subprocess.run([
                libreoffice_path,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", temp_dir,
                input_path
            ], check=True)

            pdf_filename = os.path.splitext(file.filename)[0] + ".pdf"
            pdf_path = os.path.join(temp_dir, pdf_filename)

            if not os.path.exists(pdf_path):
                return jsonify({"error": "PDF conversion failed."}), 500

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
        print("LibreOffice conversion error:", e)
        return jsonify({"error": "LibreOffice failed to convert the document."}), 500

    except Exception as e:
        print("DOCX to PDF error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)