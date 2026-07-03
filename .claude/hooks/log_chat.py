#!/usr/bin/env python3
# Stopフック：直近の1ターン（ユーザー発言＋アシスタント応答）を逐語でチャットログ.mdへ追記する。
# Claude Codeが応答を終えるたびに呼ばれる。失敗してもターンを止めないよう常に exit 0。
import sys, os, json, datetime

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    tp = data.get("transcript_path")
    if not tp or not os.path.exists(tp):
        return

    entries = []
    try:
        with open(tp, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except Exception:
                    pass
    except Exception:
        return
    if not entries:
        return

    def text_of(msg):
        c = msg.get("content")
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            parts = [b.get("text", "") for b in c
                     if isinstance(b, dict) and b.get("type") == "text"]
            return "\n".join(p for p in parts if p)
        return ""

    # 直近の「実ユーザー発言」（tool_resultのみのuserは除外）を探す
    last_user_text, last_user_idx = "", -1
    for i, e in enumerate(entries):
        if e.get("type") == "user":
            t = text_of(e.get("message", {}))
            if t.strip():
                last_user_text, last_user_idx = t, i

    # その後のアシスタント本文をすべて連結
    assistant_parts, last_asst_uuid = [], None
    for e in entries:
        if e.get("type") == "assistant":
            last_asst_uuid = e.get("uuid") or last_asst_uuid
    for e in entries[last_user_idx + 1:]:
        if e.get("type") == "assistant":
            t = text_of(e.get("message", {}))
            if t.strip():
                assistant_parts.append(t.strip())
    assistant_text = "\n\n".join(assistant_parts)

    if not last_user_text.strip() and not assistant_text.strip():
        return

    proj = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    hooks_dir = os.path.join(proj, ".claude", "hooks")
    state = os.path.join(hooks_dir, ".last_logged")
    log = os.path.join(proj, "チャットログ.md")

    # 重複防止：同じアシスタント応答（uuid）は二度書かない
    try:
        if last_asst_uuid and os.path.exists(state):
            with open(state, encoding="utf-8") as f:
                if f.read().strip() == last_asst_uuid:
                    return
    except Exception:
        pass

    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        new = not os.path.exists(log)
        with open(log, "a", encoding="utf-8") as f:
            if new:
                f.write("# チャットログ（自動記録・逐語）— 株式会社Re:venge サイト制作\n\n"
                        "> Stopフックにより、応答ごとに「ユーザー発言＋アシスタント応答」を自動追記。\n")
            f.write(f"\n---\n\n## {ts}\n\n**[ユーザー]**\n\n{last_user_text.strip()}\n\n"
                    f"**[Claude]**\n\n{assistant_text.strip()}\n")
        if last_asst_uuid:
            os.makedirs(hooks_dir, exist_ok=True)
            with open(state, "w", encoding="utf-8") as f:
                f.write(last_asst_uuid)
    except Exception:
        return

if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
