import ast, sys
try:
    src = open('app/services/scorer.py').read()
    ast.parse(src)
    print("OK")
except SyntaxError as e:
    print(f"SyntaxError at line {e.lineno}: {e.msg}")
    print(f"  Text: {e.text}")
