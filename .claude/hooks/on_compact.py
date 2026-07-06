#!/usr/bin/env python3
# SessionStartフック（matcher: compact）
# 会話の圧縮（コンパクション）が行われた直後に呼ばれ、
# 逐語チャットログ（チャットログ.md）を必ず参照するよう指示を注入する。
# additionalContext としてコンテキストへ差し込むことで、
# 圧縮で失われた細部を復元できるようにする。失敗してもセッションを止めない。
import sys, os, json

# 注入するログ末尾の最大文字数（大きすぎると圧縮の意味が薄れるため上限を設ける）
TAIL_CHARS = 24000

def main():
    proj = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    log = os.path.join(proj, "チャットログ.md")

    tail = ""
    total = 0
    if os.path.exists(log):
        try:
            with open(log, encoding="utf-8") as f:
                data = f.read()
            total = len(data)
            tail = data[-TAIL_CHARS:]
            if total > TAIL_CHARS:
                tail = "…（以前の記録は省略。全文は チャットログ.md を Read すること）\n\n" + tail
        except Exception:
            tail = ""

    msg = (
        "【重要・圧縮後の必須手順】\n"
        "直前に会話の自動圧縮（コンパクション）が行われました。要約により細部が失われている"
        "可能性があります。作業を再開する前に、リポジトリ直下の逐語記録 `チャットログ.md` を"
        "**必ず熟読**し、圧縮前の決定事項・指示・文脈を保持してください。"
        "古い経緯や正確な文言が必要な場合は、末尾の抜粋だけに頼らず `チャットログ.md` の全文を"
        "Read してください。\n\n"
        f"（チャットログ.md 全体は約 {total} 文字。以下は末尾の抜粋です）\n\n"
        "----- チャットログ.md 末尾 -----\n"
        f"{tail}\n"
        "----- 抜粋ここまで -----"
    )

    out = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": msg,
        }
    }
    print(json.dumps(out, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
