import os
import sys
import time
import base64
import requests
from io import BytesIO
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "http://192.168.31.10:3000/v1/images/edits"
API_KEY = "chatgpt2api"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

PROMPT = "保持垫图产品样式完全原封不动！严禁改动原图拍摄角度、透视、长宽比例与任何结构线条！只清除背景杂物换绝对纯白底(#FFFFFF)、去除水印与噪点，高清化。保持原有面板、端子、螺丝、散热孔和真实金属质感等，直接输出白底图。"

OUT_DIR = "/mnt/vscode/hefengqi/batch26_repainted"
os.makedirs(OUT_DIR, exist_ok=True)

PRODUCTS = [
  {
    "prefix": "Vertiv_ER22010-T",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/ER22010-T",
    "files": ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]
  },
  {
    "prefix": "Vertiv_ER22020-T",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/ER22020-T",
    "files": ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]
  },
  {
    "prefix": "Vertiv_NetSure_731_CC2",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/NetSure 731 CC2",
    "files": ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]
  },
  {
    "prefix": "Vertiv_PDU-CP8853",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/PDU-CP8853",
    "files": ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]
  },
  {
    "prefix": "Vertiv_CLRA19KMM",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/CLRA19KMM",
    "files": ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]
  },
  {
    "prefix": "Vertiv_KVM8048",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/KVM8048",
    "files": ["微信图片_20240711102430.jpg", "微信图片_20240711102441.jpg", "微信图片_20240711102446.jpg", "微信图片_20240711102450.jpg", "微信图片_20240711102455.jpg"]
  },
  {
    "prefix": "Vertiv_MP2-220K",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/MP2-220K",
    "files": ["17e5ed6f2488dd87364bb066d9bee82.jpg", "1b98e1955970553c3a4dd958fe03625.jpg", "6547fbb6f0d62d36353b2d34ec1cf35.jpg", "824203a001c26942dfa56257d432cf8.jpg", "86a95e1b2115069f31c2531f01e600a.jpg"]
  },
  {
    "prefix": "Vertiv_RP1V2001",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/1.维谛产品/RP1V2001",
    "files": ["IMG_1592.JPG", "IMG_1593.JPG", "IMG_1594.JPG", "IMG_1595.JPG", "IMG_1596.JPG"]
  },
  {
    "prefix": "Delta_DPR4850C",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/7.台达产品/模块/DPR4850C",
    "files": ["IMG_20210204_142210.jpg", "IMG_20210204_142216.jpg", "IMG_20210204_142226.jpg", "IMG_20210204_142237.jpg", "IMG_20210204_142245.jpg"]
  },
  {
    "prefix": "ZTE_ZXD4000",
    "dir": "/vol02/1000-0-91a04f62/资料/产品/产品图片/6.中兴产品/中兴模块/中兴ZXD4000（5.0）",
    "files": ["IMG_20211208_104436.jpg", "IMG_20211208_104449.jpg", "IMG_20211208_104514.jpg", "IMG_20211208_104523.jpg", "IMG_20211208_104548.jpg"]
  }
]

tasks = []
for p in PRODUCTS:
    for idx, fname in enumerate(p["files"], 1):
        src_path = os.path.join(p["dir"], fname)
        out_name = f"{p['prefix']}_view_{idx}.png"
        out_path = os.path.join(OUT_DIR, out_name)
        tasks.append((src_path, out_path, out_name))

print(f"Total tasks to repaint: {len(tasks)}")

def process_one(task):
    src_path, out_path, out_name = task
    if os.path.exists(out_path) and os.path.getsize(out_path) > 50000:
        print(f"⏩ [Skip] {out_name} already exists ({os.path.getsize(out_path)} bytes)")
        return out_name, True

    if not os.path.exists(src_path):
        print(f"❌ [Not Found] {src_path}")
        return out_name, False

    # 预处理缩小原图尺寸防上传过大超时 (Max 1600x1600)
    try:
        im = Image.open(src_path)
        im.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        buf = BytesIO()
        im.save(buf, format="PNG")
        buf.seek(0)
    except Exception as e:
        print(f"❌ [Image Preprocess Error] {src_path}: {e}")
        return out_name, False

    for attempt in range(1, 4):
        try:
            t0 = time.time()
            files = {"image": (os.path.basename(src_path), buf.getvalue(), "image/png")}
            data = {"model": "gpt-image-2", "prompt": PROMPT}
            resp = requests.post(API_URL, headers=HEADERS, files=files, data=data, timeout=120)
            if resp.status_code == 200:
                res_json = resp.json()
                data_list = res_json.get("data", [])
                if data_list and "b64_json" in data_list[0]:
                    b64 = data_list[0]["b64_json"]
                    with open(out_path, "wb") as f_out:
                        f_out.write(base64.b64decode(b64))
                    print(f"✅ [{out_name}] Repainted in {time.time()-t0:.1f}s")
                    return out_name, True
                elif data_list and "url" in data_list[0]:
                    img_resp = requests.get(data_list[0]["url"], timeout=60)
                    if img_resp.status_code == 200:
                        with open(out_path, "wb") as f_out:
                            f_out.write(img_resp.content)
                        print(f"✅ [{out_name}] Repainted via URL in {time.time()-t0:.1f}s")
                        return out_name, True
            print(f"⚠️ [{out_name}] Attempt {attempt} failed: HTTP {resp.status_code} - {resp.text[:100]}")
        except Exception as e:
            print(f"⚠️ [{out_name}] Attempt {attempt} error: {e}")
        time.sleep(2)

    return out_name, False

# 10 并发执行
success_count = 0
with ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(process_one, t) for t in tasks]
    for f in as_completed(futures):
        name, ok = f.result()
        if ok:
            success_count += 1
        print(f"Overall Progress: {success_count}/{len(tasks)}")

print(f"\n🎉 All tasks finished. Success: {success_count}/{len(tasks)}")
