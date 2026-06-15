#!/usr/bin/env python3
import json
import urllib.request

BASE = "http://localhost:4500/api"

def http(method, path, data=None, files=None):
    url = BASE + path
    if files:
        import uuid
        boundary = '----TestBoundary' + uuid.uuid4().hex
        body = b''
        for field_name, file_path in files.items():
            with open(file_path, 'rb') as f:
                file_content = f.read()
            import os
            filename = os.path.basename(file_path)
            body += f'--{boundary}\r\n'.encode()
            body += f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode()
            body += b'Content-Type: application/octet-stream\r\n\r\n'
            body += file_content + b'\r\n'
        body += f'--{boundary}--\r\n'.encode()
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    else:
        if data is not None:
            body = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(url, data=body, method=method)
            req.add_header('Content-Type', 'application/json')
        else:
            req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8')) if e.read() else {}

print("=" * 60)
print("Step 1: 创建测试展厅")
print("=" * 60)
status, exh = http('POST', '/exhibitions', {
    'title': '✨ 完整链路测试展厅',
    'description': '用于验证导出、静态页、校验、导入全流程的测试展厅',
    'theme': 'default'
})
print(f"[{status}] 展厅: {exh.get('title')} ID={exh.get('id')}")
EXH_ID = exh['id']

print("\n" + "=" * 60)
print("Step 2: 上传文件")
print("=" * 60)
status, up = http('POST', '/files/upload', files={'files': 'test-assets/test-image.png'})
img_url = up['files'][0]['url']
print(f"[{status}] 图片上传: {img_url}")
status, up = http('POST', '/files/upload', files={'files': 'test-assets/test-audio.wav'})
aud_url = up['files'][0]['url']
print(f"[{status}] 音频上传: {aud_url}")

print("\n" + "=" * 60)
print("Step 3: 创建素材")
print("=" * 60)
status, mat1 = http('POST', '/materials', {
    'exhibitionId': EXH_ID, 'type': 'image', 'url': img_url,
    'title': '测试图片素材', 'description': '一张蓝色渐变的测试图片'
})
MAT1_ID = mat1['id']
print(f"[{status}] 素材1(图片): {mat1['title']} ID={MAT1_ID}")

status, mat2 = http('POST', '/materials', {
    'exhibitionId': EXH_ID, 'type': 'audio', 'url': aud_url,
    'title': '海浪声音频', 'description': '录制的海浪声'
})
MAT2_ID = mat2['id']
print(f"[{status}] 素材2(音频): {mat2['title']} ID={MAT2_ID}")

status, mat3 = http('POST', '/materials', {
    'exhibitionId': EXH_ID, 'type': 'text', 'url': '',
    'title': '文字回忆', 'description': '那是一个阳光明媚的下午，我们在海边散步，海浪拍打着沙滩...'
})
MAT3_ID = mat3['id']
print(f"[{status}] 素材3(文字): {mat3['title']} ID={MAT3_ID}")

print("\n" + "=" * 60)
print("Step 4: 创建时间线")
print("=" * 60)
status, tl1 = http('POST', '/timelines', {
    'exhibitionId': EXH_ID, 'title': '初次相遇',
    'description': '在咖啡厅的第一次见面',
    'eventDate': '2018-03-15T00:00:00.000Z',
    'materialIds': [MAT1_ID, MAT3_ID],
    'location': {'name': '星巴克咖啡厅', 'address': '北京市朝阳区', 'lat': 39.9042, 'lng': 116.4074}
})
print(f"[{status}] 时间线1: {tl1['title']} ID={tl1['id']}")

status, tl2 = http('POST', '/timelines', {
    'exhibitionId': EXH_ID, 'title': '海边旅行',
    'description': '那年夏天的海边',
    'eventDate': '2019-07-20T00:00:00.000Z',
    'materialIds': [MAT1_ID, MAT2_ID],
    'location': {'name': '三亚海滩', 'lat': 18.2528, 'lng': 109.5120}
})
print(f"[{status}] 时间线2: {tl2['title']} ID={tl2['id']}")

print("\n" + "=" * 60)
print("Step 5: 创建留言")
print("=" * 60)
status, msg1 = http('POST', '/messages', {
    'exhibitionId': EXH_ID, 'author': '测试用户A',
    'content': '这个展厅真的太棒了，满满的回忆！', 'avatar': ''
})
print(f"[{status}] 留言1: {msg1['author']}: {msg1['content']}")

status, msg2 = http('POST', '/messages', {
    'exhibitionId': EXH_ID, 'author': '测试用户B',
    'content': '加油，期待更多内容！', 'avatar': ''
})
print(f"[{status}] 留言2: {msg2['author']}: {msg2['content']}")

print("\n" + "=" * 60)
print("Step 6: 验证数据完整性")
print("=" * 60)
status, _ = http('GET', f'/exhibitions/{EXH_ID}')
print(f"展厅存在: {status == 200}")
status, mats = http('GET', f'/materials?exhibitionId={EXH_ID}')
print(f"素材数量: {len(mats)}")
status, timelines = http('GET', f'/timelines?exhibitionId={EXH_ID}')
print(f"时间线数量: {len(timelines)}")
status, msgs = http('GET', f'/messages?exhibitionId={EXH_ID}')
print(f"留言数量: {len(msgs)}")

with open('/tmp/testlink-exh-id.txt', 'w') as f:
    f.write(EXH_ID)
print(f"\n✅ 测试数据准备完成，展厅ID已保存: {EXH_ID}")
