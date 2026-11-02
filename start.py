import http.server,functools,pathlib,webbrowser,posixpath
root=pathlib.Path(__file__).resolve().parent/'dist'
class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        # Đường dẫn trang (/vision, /project…) không có phần mở rộng → trả index.html để ứng dụng tự định tuyến.
        path=self.path.split('?',1)[0]
        if path!='/' and not posixpath.splitext(path)[1] and not pathlib.Path(self.translate_path(path)).exists():
            self.path='/index.html'
        return super().send_head()
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(Handler,directory=str(root)))
print('EcoTray: http://127.0.0.1:8765 — Ctrl+C để dừng')
webbrowser.open('http://127.0.0.1:8765')
try:server.serve_forever()
except KeyboardInterrupt:server.server_close()
