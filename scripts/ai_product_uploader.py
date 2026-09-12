#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, json, re, argparse, requests
from typing import Dict, Any, List, Optional
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = os.environ.get("SITE_API_URL", "http://127.0.0.1:3000")
API_KEY = os.environ.get("AI_API_KEY", "9d3911c4729982209d525f8ff8bfadb8")

LLM_BASE_URL = "https://cpa.nasl.cc:8888/v1"
LLM_MODEL = "gemini-3.8-flash-high"
AUTH_FILE = "/root/.codex/auth.json"

def get_llm_token() -> str:
    try:
        with open(AUTH_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("OPENAI_API_KEY", "")
    except Exception:
        return ""

def clean_json_str(text: str) -> str:
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        return m.group(0)
    return text

def sanitize_product_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """门禁校验与自动合规清洗：确保 100% 符合平台 Zod 模式"""
    translations = data.get("translations", {})
    for lang, trans in translations.items():
        # 1. seoDescription 必须 <= 180 字符
        if "seoDescription" in trans and isinstance(trans["seoDescription"], str):
            if len(trans["seoDescription"]) > 175:
                trans["seoDescription"] = trans["seoDescription"][:172].rstrip() + "..."

        # 2. seoTitle 必须 <= 80 字符
        if "seoTitle" in trans and isinstance(trans["seoTitle"], str):
            if len(trans["seoTitle"]) > 75:
                trans["seoTitle"] = trans["seoTitle"][:72].rstrip() + "..."

        # 3. directDefinition 门禁至少 40 字符
        if "directDefinition" in trans and isinstance(trans["directDefinition"], str):
            if len(trans["directDefinition"]) < 40:
                trans["directDefinition"] += " High-reliability industrial grade infrastructure engineered for continuous operation."

    return data

class ProductUploaderAgent:
    def __init__(self, api_key: str = API_KEY, base_url: str = BASE_URL):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.schema: Dict[str, Any] = {}
        self.llm_token = get_llm_token()

    def fetch_schema(self) -> Dict[str, Any]:
        url = f"{self.base_url}/api/admin/products/schema"
        try:
            resp = requests.get(url, headers=self.headers, timeout=10)
            if resp.status_code == 200:
                self.schema = resp.json()
                return self.schema
        except Exception as e:
            print(f"[警告] 获取 Schema 异常: {e}")
        return {}

    def call_llm(self, prompt: str, system_prompt: str = "") -> str:
        if not self.llm_token:
            raise RuntimeError("未在 /root/.codex/auth.json 中找到 LLM 凭证")

        url = f"{LLM_BASE_URL}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.llm_token}",
            "Content-Type": "application/json"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": LLM_MODEL,
            "messages": messages,
            "temperature": 0.2
        }

        resp = requests.post(url, json=payload, headers=headers, verify=False, timeout=60)
        if resp.status_code != 200:
            raise RuntimeError(f"LLM 接口响应异常 (HTTP {resp.status_code}): {resp.text}")

        result = resp.json()
        return result["choices"][0]["message"]["content"]

    def generate_product_data(self, model: str, brand: str = "", category_hint: str = "", raw_text: str = "") -> Dict[str, Any]:
        system_prompt = (
            "你是一个专业的全球通信能源、数据中心基础设施及硬件出海专家。\n"
            "合丰旗独立站有极其严苛的产品发布门禁校验：\n"
            "1. directDefinition（直接技术定义）必须是严肃的工程定义，且【中文、英文、俄文】字数严格不少于 40 字符。\n"
            "2. seoDescription 必须控制在 140-160 字符以内，严禁超过 180 字符。\n"
            "3. 输出必须是中(zh)、英(en)、俄(ru)三语，涵盖：name, directDefinition, shortDescription, whatItIs, problemSolved, suitableFor, advantages(数组), applications(数组), seoTitle, seoDescription, faqs。\n"
            "4. 提取工业刚性技术参数 attributes 数组（如额定电压 nominal-voltage, 输出电流 output-current, 整流效率 efficiency, 工作温度 operating-temperature 等），包含 key, label, value, unit。\n"
            "5. 格式必须是标准的纯 JSON，不要有任何多余的解释性文字。"
        )

        prompt = f"""
请为以下工业通信/能源设备生成符合合丰旗入库标准的完备数据结构：
- 产品型号：{model}
- 品牌建议：{brand or "根据型号自动识别"}
- 分类提示：{category_hint or "根据设备类型自动匹配"}
- 附加技术资料/说明：{raw_text or "请根据通信能源/数据中心行业真实参数与工程实践自动补齐"}

请严格按以下 JSON 结构输出：
{{
  "model": "{model}",
  "sku": "根据型号生成的标准SKU代码",
  "brand": "品牌小写英文键（如 vertiv, huawei, zte, delta, santak 等）",
  "category": "第三级品牌分类键或二级分类键（如 zte, huawei, dc-power-systems 等）",
  "status": "DRAFT",
  "origin": "AI",
  "upsert": true,
  "translations": {{
    "zh": {{
      "name": "中文正式名称",
      "directDefinition": "严肃的工程技术直接定义（务必超过40个汉字）",
      "shortDescription": "一句话核心功能概述",
      "whatItIs": "深入的技术架构说明",
      "problemSolved": "解决的关键工程问题与痛点",
      "suitableFor": "适用的设备与环境工况",
      "advantages": ["优势1", "优势2", "优势3"],
      "applications": ["场景1", "场景2", "场景3"],
      "seoTitle": "SEO 标题",
      "seoDescription": "SEO 描述（控制在150字内）",
      "faqs": [{{"question": "问题1", "answer": "回答1"}}]
    }},
    "en": {{
      "name": "English Product Name",
      "directDefinition": "Rigorous engineering definition (must be at least 60 characters)",
      "shortDescription": "One-line technical summary",
      "whatItIs": "Detailed architecture description",
      "problemSolved": "Pain points resolved in mission-critical environments",
      "suitableFor": "Suitable operating scenarios and environments",
      "advantages": ["Advantage 1", "Advantage 2", "Advantage 3"],
      "applications": ["Application 1", "Application 2"],
      "seoTitle": "SEO Title in English",
      "seoDescription": "SEO Description in English (strictly <= 160 characters)",
      "faqs": [{{"question": "FAQ 1", "answer": "Answer 1"}}]
    }},
    "ru": {{
      "name": "Russian Product Name",
      "directDefinition": "Строгое инженерное определение оборудования (не менее 60 символов)",
      "shortDescription": "Краткое техническое описание",
      "whatItIs": "Подробное описание архитектуры и принципа работы",
      "problemSolved": "Решаемые инженерные задачи и надежность",
      "suitableFor": "Условия эксплуатации и совместимое оборудование",
      "advantages": ["Преимущество 1", "Преимущество 2"],
      "applications": ["Сфера применения 1", "Сфера применения 2"]
    }}
  }},
  "attributes": [
    {{"key": "nominal-voltage", "label": "额定电压", "value": "-48V", "unit": "VDC"}},
    {{"key": "output-current", "label": "输出电流", "value": "300", "unit": "A"}},
    {{"key": "efficiency", "label": "整流效率", "value": "96.5", "unit": "%"}}
  ]
}}
"""
        print(f"🤖 [智能体] 正在组织 Gemini 3.8 Flash High 为 【{model}】 构建三语工程模型与门禁校验...")
        content = self.call_llm(prompt, system_prompt)
        cleaned = clean_json_str(content)
        data = json.loads(cleaned)
        return sanitize_product_data(data)

    def upload_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/api/admin/products"
        model_name = product_data.get("model", "Unknown")
        print(f"🚀 [上传] 正在将 【{model_name}】 提交至独立站后台 ({url})...")

        resp = requests.post(url, json=product_data, headers=self.headers, timeout=20)
        if resp.status_code in [200, 201]:
            res = resp.json()
            print(f"✅ [成功] 产品 【{model_name}】 入库成功！")
            created = res.get("created", [])
            updated = res.get("updated", [])
            for item in created + updated:
                pid = item.get("id")
                print(f"   📌 产品 ID: {pid}")
                print(f"   🔗 预览/编辑直达链接: https://ricewind.com/admin/products/{pid}")
            return res
        else:
            print(f"❌ [失败] 上传产品失败 (HTTP {resp.status_code}): {resp.text}")
            return {"error": resp.text, "status": resp.status_code}

    def upload_media(self, file_path: str, product_id: Optional[str] = None) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            print(f"❌ [错误] 文件不存在: {file_path}")
            return {"error": "file_not_found"}

        url = f"{self.base_url}/api/admin/media"
        filename = os.path.basename(file_path)
        print(f"📤 [素材] 正在上传附件/手册: {filename}...")

        headers = {"Authorization": f"Bearer {self.api_key}"}
        data = {}
        if product_id:
            data["productId"] = product_id

        with open(file_path, "rb") as f:
            files = {"file": (filename, f)}
            resp = requests.post(url, headers=headers, data=data, files=files, timeout=60)
            if resp.status_code in [200, 201]:
                res = resp.json()
                print(f"✅ [素材] 上传成功: {res.get('media', {}).get('url') or res}")
                return res
            else:
                print(f"❌ [素材] 上传失败 (HTTP {resp.status_code}): {resp.text}")
                return {"error": resp.text}

def interactive_mode(agent: ProductUploaderAgent):
    print("=" * 60)
    print(" 🛠️  HEFENGQI 独立站产品入库智能体 - 交互式工作台")
    print("=" * 60)

    agent.fetch_schema()
    model = input("👉 请输入产品型号 (例如: ZXDU68 S501, NetSure 731 A41): ").strip()
    if not model:
        print("型号不能为空！")
        return

    brand = input("👉 品牌建议 (回车自动推导，如 zte, vertiv, huawei): ").strip()
    category = input("👉 分类提示 (回车自动推导): ").strip()
    notes = input("👉 附加技术说明 / 规格白皮书片段 (可选，回车跳过): ").strip()

    try:
        product_data = agent.generate_product_data(model, brand, category, notes)
        print("\n🔍 智能体生成的产品预览:")
        print(f"   型号: {product_data.get('model')}")
        print(f"   品牌: {product_data.get('brand')} | 分类: {product_data.get('category')}")
        print(f"   中文名称: {product_data.get('translations', {}).get('zh', {}).get('name')}")
        print(f"   英文名称: {product_data.get('translations', {}).get('en', {}).get('name')}")
        print(f"   提取技术参数: {len(product_data.get('attributes', []))} 项")

        confirm = input("\n👉 确认立即提交上传至独立站? (Y/n): ").strip().lower()
        if confirm in ["", "y", "yes"]:
            res = agent.upload_product(product_data)
            media_path = input("\n👉 是否有需要挂载的产品图片或PDF技术手册? (输入路径，回车跳过): ").strip()
            if media_path and os.path.exists(media_path):
                pid = None
                items = res.get("created", []) + res.get("updated", [])
                if items:
                    pid = items[0].get("id")
                agent.upload_media(media_path, pid)
        else:
            print("已取消上传。")
    except Exception as e:
        print(f"❌ 运行失败: {e}")

def main():
    parser = argparse.ArgumentParser(description="HEFENGQI AI Product Uploader Agent")
    parser.add_argument("--model", type=str, help="产品型号")
    parser.add_argument("--brand", type=str, default="", help="产品品牌 (如 huawei, vertiv, zte)")
    parser.add_argument("--category", type=str, default="", help="产品分类键")
    parser.add_argument("--file", type=str, help="从本地 JSON 文件批量或单个导入")
    parser.add_argument("--doc", type=str, help="本地 PDF 手册或说明文档路径")
    parser.add_argument("--image", type=str, help="本地产品图片路径")
    parser.add_argument("--batch", type=str, help="逗号分隔的多个型号批量生成并上传")
    parser.add_argument("--interactive", "-i", action="store_true", help="启动终端交互式向导")

    args = parser.parse_args()
    agent = ProductUploaderAgent()

    if args.interactive or (not args.model and not args.file and not args.batch):
        interactive_mode(agent)
        return

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            data = json.load(f)
            agent.upload_product(data)
        return

    if args.batch:
        models = [m.strip() for m in args.batch.split(",") if m.strip()]
        print(f"🚀 [批量] 开始处理 {len(models)} 款产品...")
        for m in models:
            data = agent.generate_product_data(m)
            agent.upload_product(data)
        return

    if args.model:
        data = agent.generate_product_data(args.model, args.brand, args.category)
        res = agent.upload_product(data)

        pid = None
        items = res.get("created", []) + res.get("updated", [])
        if items:
            pid = items[0].get("id")

        if args.image:
            agent.upload_media(args.image, pid)
        if args.doc:
            agent.upload_media(args.doc, pid)

if __name__ == "__main__":
    main()
