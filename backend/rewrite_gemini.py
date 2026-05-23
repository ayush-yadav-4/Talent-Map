import re
import os

with open('app/services/gemini_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports and setup
content = re.sub(
    r'# Suppress legacy package deprecation.*?import google\.generativeai as genai',
    r'from openai import OpenAI\nimport os\n\nclient = None\nif (settings.openai_api_key or "").strip():\n    client = OpenAI(api_key=settings.openai_api_key)\n',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'if \(settings\.gemini_api_key or ""\)\.strip\(\):\n\s*genai\.configure\(api_key=settings\.gemini_api_key\)',
    '',
    content
)

content = re.sub(r'gemini-1\.5-flash', 'gpt-4o', content)
content = re.sub(r'settings\.gemini_model', 'settings.openai_model', content)
content = re.sub(r'settings\.gemini_api_key', 'settings.openai_api_key', content)

# 2. _gemini_configured
content = re.sub(
    r'def _gemini_configured\(\) -> bool:\n\s*return bool\(\(settings\.openai_api_key or ""\)\.strip\(\)\)',
    r'def _gemini_configured() -> bool:\n        return bool((settings.openai_api_key or "").strip())',
    content
)

# 3. model = genai.GenerativeModel(...) -> remove or comment out
content = re.sub(r'\s*model = genai\.GenerativeModel\([^)]*\)', '', content)

# 4. generate_content with schema
def replace_with_schema(m):
    prompt_var = m.group(1)
    schema = m.group(2)
    return f'''response = client.beta.chat.completions.parse(
                model=get_model_name(),
                messages=[{{"role": "user", "content": {prompt_var}}}],
                response_format={schema}
            )'''

content = re.sub(
    r'response = model\.generate_content\(\s*([^,]+),\s*generation_config=genai\.GenerationConfig\(\s*response_mime_type="application/json",\s*response_schema=([^)\s]+)\s*\),?\s*\)',
    replace_with_schema,
    content
)

# 5. return Schema.model_validate_json(response.text)
content = re.sub(
    r'return ([A-Za-z0-9_]+)\.model_validate_json\(response\.text\)',
    r'return response.choices[0].message.parsed',
    content
)

content = re.sub(
    r'([A-Za-z0-9_]+)\.model_validate_json\(response\.text\)',
    r'response.choices[0].message.parsed',
    content
)

# 6. generate_content without schema (just json)
def replace_without_schema(m):
    prompt_var = m.group(1)
    return f'''response = client.chat.completions.create(
                model=get_model_name(),
                messages=[{{"role": "user", "content": {prompt_var}}}],
                response_format={{"type": "json_object"}}
            )
            response_text = response.choices[0].message.content'''

content = re.sub(
    r'response = model\.generate_content\(\s*([^,]+),\s*generation_config=genai\.GenerationConfig\(\s*response_mime_type="application/json"\s*\),?\s*\)',
    replace_without_schema,
    content
)

content = re.sub(
    r'normalized = GeminiService\._coerce_role_extraction_payload\(response\.text\)',
    r'normalized = GeminiService._coerce_role_extraction_payload(response_text)',
    content
)

content = re.sub(
    r'json\.loads\(response\.text\)',
    r'json.loads(response_text if "response_text" in locals() else response.choices[0].message.content)',
    content
)

content = re.sub(
    r'normalized = GeminiService\._coerce_role_suggestions_payload\(response\.text\)',
    r'normalized = GeminiService._coerce_role_suggestions_payload(response_text)',
    content
)

content = re.sub(
    r'normalized = GeminiService\._coerce_skill_roadmap_payload\(response\.text, target_role\)',
    r'normalized = GeminiService._coerce_skill_roadmap_payload(response_text, target_role)',
    content
)

# 7. plain generate_content
def replace_plain(m):
    prompt_var = m.group(1)
    return f'''response = client.chat.completions.create(
                model=get_model_name(),
                messages=[{{"role": "user", "content": {prompt_var}}}]
            )'''
content = re.sub(r'response = model\.generate_content\(([^,)]+)\)', replace_plain, content)

content = re.sub(r'response\.text', 'response.choices[0].message.content', content)

# 8. embeddings
content = re.sub(
    r'genai\.embed_content\(\s*model=model_name,\s*content=text,\s*task_type=task_type,?\s*\)',
    r'client.embeddings.create(model=model_name, input=text).data[0].embedding',
    content
)
content = re.sub(
    r'result\["embedding"\]',
    r'result',
    content
)

with open('app/services/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
