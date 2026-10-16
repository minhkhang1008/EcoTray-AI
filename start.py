import http.server,functools,pathlib,webbrowser
root=pathlib.Path(__file__).resolve().parent/'dist'
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
print('EcoTray: http://127.0.0.1:8765 — Ctrl+C để dừng')
webbrowser.open('http://127.0.0.1:8765')
try:server.serve_forever()
except KeyboardInterrupt:server.server_close()
