import re
with open('app/services/gemini_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('return [])', 'return []')
content = content.replace('return None)', 'return None')
content = content.replace('return {})', 'return {}')
content = content.replace('return {)', 'return {')
content = content.replace('return "")', 'return ""')

with open('app/services/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
