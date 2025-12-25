import re

# 讀取 HTML 文件
with open('示範.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 提取 React 代碼
pattern = r'&gt;(import React.*?export default App;)'
match = re.search(pattern, html, re.DOTALL)

if match:
    code = match.group(1)
    # HTML 實體解碼
    code = code.replace('&amp;#x27;', "'")
    code = code.replace('&amp;quot;', '"')
    code = code.replace('&amp;lt;', '<')
    code = code.replace('&amp;gt;', '>')
    code = code.replace('&amp;amp;', '&')
    
    # 寫入文件
    with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print('成功提取並保存代碼')
else:
    print('未找到匹配的代碼')
