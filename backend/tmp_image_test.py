from app import app
from PIL import Image
import io

for fmt, name in [('PNG', 'test.png'), ('JPEG', 'test.jpg'), ('BMP', 'test.bmp'), ('GIF', 'test.gif'), ('TIFF', 'test.tiff'), ('WEBP', 'test.webp')]:
    try:
        img = Image.new('RGB', (50, 50), color='blue')
        buf = io.BytesIO()
        img.save(buf, format=fmt)
        buf.seek(0)
        with app.test_client() as client:
            data = {'file': (buf, name)}
            resp = client.post('/image-to-pdf', content_type='multipart/form-data', data=data)
            print(name, resp.status_code, 'len', len(resp.data) if resp.status_code == 200 else resp.get_data(as_text=True))
    except Exception as e:
        print('ERROR', name, e)
