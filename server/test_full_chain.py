#!/usr/bin/env python3
import json
import urllib.request
import os
import sys
import hashlib
import zipfile
import tempfile
import shutil

BASE = "http://localhost:4500/api"
EXH_ID = open('/tmp/testlink-exh-id.txt').read().strip()
UPLOADS_DIR = '/Users/a1-6/Desktop/solo项目/solo-6.14/xcf-190-193/xcf-191/server/uploads'
DB_PATH = '/Users/a1-6/Desktop/solo项目/solo-6.14/xcf-190-193/xcf-191/server/data/db.json'

def http(method, path, data=None, files=None):
    url = BASE + path
    if files:
        import uuid
        boundary = '----TestBoundary' + uuid.uuid4().hex
        body = b''
        for field_name, file_path in files.items():
            with open(file_path, 'rb') as f:
                file_content = f.read()
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
            raw = resp.read()
            return resp.status, json.loads(raw.decode('utf-8')) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, json.loads(raw.decode('utf-8')) if raw else {}

def download_file(url, dest):
    urllib.request.urlretrieve(url, dest)

def count_files_in_dir(d):
    cnt = 0
    for root, dirs, files in os.walk(d):
        cnt += len(files)
    return cnt

def get_state():
    with open(DB_PATH) as f:
        db = json.load(f)
    return {
        'exhibitions': len(db.get('exhibitions', [])),
        'materials': len(db.get('materials', [])),
        'timelines': len(db.get('timelines', [])),
        'messages': len(db.get('messages', [])),
        'familyMembers': len(db.get('familyMembers', [])),
        'familyAlbums': len(db.get('familyAlbums', [])),
        'upload_files': count_files_in_dir(UPLOADS_DIR),
        'db_hash': hashlib.sha256(open(DB_PATH, 'rb').read()).hexdigest()[:16]
    }

def print_state(label, s):
    print(f"  [{label}] 展厅={s['exhibitions']} 素材={s['materials']} 时间线={s['timelines']} 留言={s['messages']} 上传文件={s['upload_files']} DB哈希={s['db_hash']}")

passed = 0
failed = 0

def check(name, cond, detail=''):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✅ PASS: {name} {detail}")
    else:
        failed += 1
        print(f"  ❌ FAIL: {name} {detail}")

print("=" * 70)
print("STEP 3: 导出展厅为 ZIP")
print("=" * 70)
state_before_export = get_state()
print_state("导出前", state_before_export)

status, result = http('POST', f'/backup/export/exhibition/{EXH_ID}')
print(f"  HTTP {status}: {json.dumps(result, ensure_ascii=False)[:300]}")
check("导出返回200", status == 200)
check("返回包含filename", 'filename' in result)
check("返回包含path", 'path' in result)
check("文件实际存在", os.path.exists(result.get('path', '')))

export_zip_path = result['path']
export_filename = result['filename']
export_file_count = result.get('fileCount', 0)

with zipfile.ZipFile(export_zip_path) as zf:
    names = zf.namelist()
    print(f"  ZIP 内文件数: {len(names)}")
    for n in names[:20]:
        print(f"    - {n}")
    check("ZIP包含manifest.json", 'manifest.json' in names)
    check("ZIP包含checksums.json", 'checksums.json' in names)
    check(f"ZIP包含{export_file_count}个素材文件", sum(1 for n in names if n.startswith('files/')) >= export_file_count)

# 检查清单内容
with zipfile.ZipFile(export_zip_path) as zf:
    manifest = json.loads(zf.read('manifest.json').decode('utf-8'))
    checksums = json.loads(zf.read('checksums.json').decode('utf-8'))
    print(f"  清单版本: v{manifest.get('version')} 范围: {manifest.get('scope', {}).get('type')}")
    print(f"  素材数: {len(manifest['data'].get('materials', []))} 时间线: {len(manifest['data'].get('timelines', []))} 留言: {len(manifest['data'].get('messages', []))}")
    check("清单包含展厅数据", manifest.get('data', {}).get('exhibition') is not None)
    check("清单包含3个素材", len(manifest['data'].get('materials', [])) == 3)
    check("清单包含2个时间线", len(manifest['data'].get('timelines', [])) == 2)
    check("清单包含2条留言", len(manifest['data'].get('messages', [])) == 2)
    check("校验清单完整性", 'manifest.json' in checksums)
    check(f"校验清单包含{export_file_count}个文件哈希", len(checksums) >= export_file_count)

# 验证ZIP内每个文件的哈希与checksums.json匹配
print("  验证 ZIP 内文件哈希...")
hash_ok = True
with zipfile.ZipFile(export_zip_path) as zf:
    for rel_path, expected_hash in checksums.items():
        if rel_path in zf.namelist():
            actual_hash = hashlib.sha256(zf.read(rel_path)).hexdigest()
            if actual_hash != expected_hash:
                print(f"    ⚠️ 哈希不匹配: {rel_path}")
                hash_ok = False
check("所有文件哈希与checksums匹配", hash_ok)

state_after_export = get_state()
print_state("导出后", state_after_export)
check("导出不修改数据库", state_before_export['db_hash'] == state_after_export['db_hash'])
check("导出不增加上传文件", state_before_export['upload_files'] == state_after_export['upload_files'])

print("\n" + "=" * 70)
print("STEP 4: 生成静态回忆页")
print("=" * 70)
state_before_static = get_state()
status, result = http('POST', f'/backup/static/exhibition/{EXH_ID}')
print(f"  HTTP {status}: {json.dumps(result, ensure_ascii=False)[:200]}")
check("静态页生成返回200", status == 200)
check("返回包含filename", 'filename' in result)
static_zip_path = result['path']
check("静态页ZIP存在", os.path.exists(static_zip_path))

with zipfile.ZipFile(static_zip_path) as zf:
    names = zf.namelist()
    print(f"  静态页ZIP内容: {len(names)}个文件")
    for n in names:
        print(f"    - {n}")
    check("ZIP包含index.html", 'index.html' in names)
    check("ZIP包含data.json", 'data.json' in names)
    check("ZIP包含checksums.json", 'checksums.json' in names)
    html = zf.read('index.html').decode('utf-8')
    check("HTML包含展厅标题", '完整链路测试展厅' in html)
    check("HTML包含时间线样式", 'timeline' in html.lower())
    check("HTML包含留言板样式", 'messages' in html.lower())

state_after_static = get_state()
check("静态页生成不修改数据库", state_before_static['db_hash'] == state_after_static['db_hash'])

print("\n" + "=" * 70)
print("STEP 5: 校验ZIP文件完整性（API）")
print("=" * 70)
status, result = http('POST', '/backup/verify/checksums', files={'file': export_zip_path})
print(f"  HTTP {status}: {json.dumps(result, ensure_ascii=False)[:300]}")
check("校验API返回200", status == 200)
check("清单有效", result.get('manifestValid') == True)
check("文件校验通过", result.get('checksumsValid') == True)
if result.get('checksumResults'):
    failed_items = [r for r in result['checksumResults'] if not r.get('valid')]
    check(f"校验明细无失败({len(result['checksumResults'])}项)", len(failed_items) == 0)

print("\n" + "=" * 70)
print("STEP 6: 导入预演 (dryRun=true) - 必须完全无写入")
print("=" * 70)

# 先上传备份文件进行分析
print("  6.1 上传并分析备份...")
status, analysis = http('POST', '/backup/import/analyze', files={'file': export_zip_path})
print(f"  HTTP {status}: {json.dumps(analysis, ensure_ascii=False)[:400]}")
check("分析API返回200", status == 200)
check("清单有效", analysis.get('valid') == True)
check("范围=exhibition", analysis.get('scope') == 'exhibition')
check("标题正确", analysis.get('title') == '✨ 完整链路测试展厅')
check("统计含3个素材", analysis.get('stats', {}).get('materials') == 3)
check("统计含2个时间线", analysis.get('stats', {}).get('timelines') == 2)
check("统计含2条留言", analysis.get('stats', {}).get('messages') == 2)
file_name = analysis.get('fileName')
check("返回fileName", file_name is not None)

# 快照当前状态
state_before_dryrun = get_state()
print_state("预演前", state_before_dryrun)

# 列出uploads目录所有文件（预演前后对比）
def list_upload_files():
    result = set()
    for root, dirs, files in os.walk(UPLOADS_DIR):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, UPLOADS_DIR)
            result.add(rel)
    return result

uploads_before = list_upload_files()

print(f"  6.2 执行 dryRun=true 预演导入...")
status, result = http('POST', '/backup/import/execute', {
    'fileName': file_name,
    'dryRun': True,
    'overwrite': False
})
print(f"  HTTP {status}: {json.dumps(result, ensure_ascii=False)[:400]}")
check("预演API返回200", status == 200)
check("标记为dryRun", result.get('dryRun') == True)
check("返回作用域", result.get('scope') == 'exhibition')
check("返回素材数=3", result.get('materialsImported') == 3)
check("返回时间线数=2", result.get('timelinesImported') == 2)
check("返回留言数=2", result.get('messagesImported') == 2)

state_after_dryrun = get_state()
print_state("预演后", state_after_dryrun)

# 关键检查：数据库和文件必须完全不变
check("⚠️ 预演不修改数据库哈希", state_before_dryrun['db_hash'] == state_after_dryrun['db_hash'])
check("⚠️ 预演不修改展厅数量", state_before_dryrun['exhibitions'] == state_after_dryrun['exhibitions'])
check("⚠️ 预演不修改素材数量", state_before_dryrun['materials'] == state_after_dryrun['materials'])
check("⚠️ 预演不修改时间线数量", state_before_dryrun['timelines'] == state_after_dryrun['timelines'])
check("⚠️ 预演不修改留言数量", state_before_dryrun['messages'] == state_after_dryrun['messages'])

uploads_after = list_upload_files()
new_files = uploads_after - uploads_before
deleted_files = uploads_before - uploads_after
print(f"  预演前上传文件数: {len(uploads_before)}")
print(f"  预演后上传文件数: {len(uploads_after)}")
print(f"  新增文件: {new_files if new_files else '(无)'}")
print(f"  删除文件: {deleted_files if deleted_files else '(无)'}")
check("⚠️ 预演不新增上传文件", len(new_files) == 0)
check("⚠️ 预演不删除上传文件", len(deleted_files) == 0)

print("\n" + "=" * 70)
print("STEP 7: 实际导入并验证数据")
print("=" * 70)
state_before_import = get_state()
uploads_before_import = list_upload_files()
print_state("导入前", state_before_import)

status, result = http('POST', '/backup/import/execute', {
    'fileName': file_name,
    'dryRun': False,
    'overwrite': False
})
print(f"  HTTP {status}: {json.dumps(result, ensure_ascii=False)[:400]}")
check("导入API返回200", status == 200)
check("标记为非dryRun", result.get('dryRun') == False)
check("作用域=exhibition", result.get('scope') == 'exhibition')
check("返回新展厅ID", result.get('exhibitionId') is not None)

imported_exh_id = result['exhibitionId']

state_after_import = get_state()
print_state("导入后", state_after_import)

# 验证数据新增
check("展厅数量+1", state_after_import['exhibitions'] == state_before_import['exhibitions'] + 1)
check("素材数量+3", state_after_import['materials'] == state_before_import['materials'] + 3)
check("时间线数量+2", state_after_import['timelines'] == state_before_import['timelines'] + 2)
check("留言数量+2", state_after_import['messages'] == state_before_import['messages'] + 2)

# 验证新展厅能通过API查询到
status, imported_exh = http('GET', f'/exhibitions/{imported_exh_id}')
check("新展厅可通过API查询", status == 200)
if status == 200:
    print(f"  导入的展厅: {imported_exh.get('title')}")
    check("导入的展厅标题正确", '完整链路测试展厅' in imported_exh.get('title', ''))

status, imported_mats = http('GET', f'/materials?exhibitionId={imported_exh_id}')
check("新展厅有3个素材", len(imported_mats) == 3)

status, imported_tls = http('GET', f'/timelines?exhibitionId={imported_exh_id}')
check("新展厅有2个时间线", len(imported_tls) == 2)
if len(imported_tls) == 2:
    titles = sorted([t.get('title') for t in imported_tls])
    check("时间线标题正确", titles == ['初次相遇', '海边旅行'])

status, imported_msgs = http('GET', f'/messages?exhibitionId={imported_exh_id}')
check("新展厅有2条留言", len(imported_msgs) == 2)

# 检查素材文件URL对应的实际文件是否存在
uploads_after_import = list_upload_files()
print(f"  导入前上传文件数: {len(uploads_before_import)}")
print(f"  导入后上传文件数: {len(uploads_after_import)}")
all_material_files_exist = True
for m in imported_mats:
    url = m.get('url', '')
    if url and url.startswith('/uploads/'):
        rel = url.replace('/uploads/', '')
        if rel not in uploads_after_import:
            print(f"    ⚠️ 素材文件缺失: {rel}")
            all_material_files_exist = False
check("导入后所有素材文件在uploads目录存在", all_material_files_exist)

# 验证导入的展厅ID与原展厅不同
check("导入的展厅ID与原始不同（自动生成新ID）", imported_exh_id != EXH_ID)

print("\n" + "=" * 70)
print("STEP 8: 全量导出 + 全量导入预演")
print("=" * 70)
status, result = http('POST', '/backup/export/all')
print(f"  HTTP {status}: {json.dumps(result, ensure_ascii=False)[:200]}")
check("全量导出返回200", status == 200)
check("返回filename", 'filename' in result)
full_export_path = result['path']
check("全量导出文件存在", os.path.exists(full_export_path))

with zipfile.ZipFile(full_export_path) as zf:
    names = zf.namelist()
    manifest = json.loads(zf.read('manifest.json').decode('utf-8'))
    check("全量清单scope=full", manifest.get('scope', {}).get('type') == 'full')
    check("全量清单含exhibitions数组", isinstance(manifest.get('data', {}).get('exhibitions'), list))
    print(f"  全量备份: 展厅={len(manifest['data'].get('exhibitions', []))} 素材={len(manifest['data'].get('materials', []))} 时间线={len(manifest['data'].get('timelines', []))}")

# 全量导入预演
print("  全量导入预演...")
status, analysis = http('POST', '/backup/import/analyze', files={'file': full_export_path})
check("全量分析返回200", status == 200)
check("全量分析scope=full", analysis.get('scope') == 'full')

state_before_fulldry = get_state()
status, result = http('POST', '/backup/import/execute', {
    'fileName': analysis['fileName'],
    'dryRun': True
})
check("全量预演返回200", status == 200)
check("全量预演scope=full", result.get('scope') == 'full')
state_after_fulldry = get_state()
check("⚠️ 全量预演不修改数据库", state_before_fulldry['db_hash'] == state_after_fulldry['db_hash'])

print("\n" + "=" * 70)
print(f"TEST SUMMARY: {passed} passed, {failed} failed")
print("=" * 70)
sys.exit(0 if failed == 0 else 1)
