import re
with open('app/services/gemini_service.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'\"\"\"\)', '\"\"\"', content)
with open('app/services/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
