<?php
/* ============================================================
   お問い合わせフォーム送信（PHP mail）→ info@revenge.co.jp
   静的サイト＋PHPのハイブリッド（CoreServer）で動作。
   - fetch(XHR) からは JSON を返す
   - 通常POST（JS無効）には簡易HTMLで結果を表示
   ============================================================ */

$TO      = 'info@revenge.co.jp';           // 受信先
$FROM    = 'info@revenge.co.jp';           // 送信元（同一ドメイン＝SPF通過）
$SITE    = '株式会社Revenge';

// JSONを期待するリクエストか（fetch/XHR）
$wantsJson = (
  (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && stripos($_SERVER['HTTP_X_REQUESTED_WITH'], 'fetch') !== false) ||
  (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
);

function respond($ok, $msg, $wantsJson) {
  if ($wantsJson) {
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(array('ok' => $ok, 'msg' => $msg), JSON_UNESCAPED_UNICODE);
  } else {
    header('Content-Type: text/html; charset=UTF-8');
    $t = $ok ? '送信が完了しました' : '送信できませんでした';
    echo '<!doctype html><html lang="ja"><head><meta charset="UTF-8">'
       . '<meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>' . $t . ' | 株式会社Revenge</title>'
       . '<style>body{font-family:sans-serif;max-width:640px;margin:12vh auto;padding:0 24px;line-height:1.9;color:#1a1a1a}'
       . 'a{color:#e60012}</style></head><body>'
       . '<h1 style="font-size:1.3rem">' . $t . '</h1><p>' . htmlspecialchars($msg, ENT_QUOTES, 'UTF-8') . '</p>'
       . '<p><a href="index.html">トップへ戻る</a></p></body></html>';
  }
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(false, '不正なアクセスです。', $wantsJson);
}

// ハニーポット（bot対策）：未記入のはずのフィールドに値があれば静かに成功扱い
if (!empty($_POST['website'])) {
  respond(true, 'お問い合わせありがとうございます。', $wantsJson);
}

function field($k) { return isset($_POST[$k]) ? trim($_POST[$k]) : ''; }
$company = field('company');
$name    = field('name');
$type    = field('type');
$email   = field('email');
$message = field('message');

$errors = array();
if ($name === '') $errors[] = 'お名前';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'メールアドレス';
if ($message === '') $errors[] = 'お問い合わせ内容';
// 改行インジェクション対策（ヘッダに載る値）
if (preg_match('/[\r\n]/', $name . $email)) $errors[] = '不正な文字';
if ($errors) {
  http_response_code(422);
  respond(false, '次の項目をご確認ください：' . implode('・', $errors), $wantsJson);
}

$typeMap = array(
  'promotion' => 'セールスプロモーションについて',
  'bpo'       => 'BPO事業について',
  'training'  => '教育・研修事業について',
  'digital'   => 'デジタルソリューションについて',
  'other'     => 'その他',
);
$typeLabel = isset($typeMap[$type]) ? $typeMap[$type] : 'その他';

/* 全体をUTF-8で統一。mb_send_mail + mb_language('Japanese') は本文をISO-2022-JPへ
   再変換してしまい、UTF-8宣言のヘッダーと矛盾して文字化けするため使用しない。 */
if (function_exists('mb_internal_encoding')) { mb_internal_encoding('UTF-8'); }

$subject = '【お問い合わせ】' . $typeLabel . ' / ' . ($company !== '' ? $company : $name);
$body =
  $SITE . " お問い合わせフォーム\n\n" .
  "■ 種別　　： " . $typeLabel . "\n" .
  "■ 会社名　： " . ($company !== '' ? $company : '(未記入)') . "\n" .
  "■ お名前　： " . $name . "\n" .
  "■ メール　： " . $email . "\n" .
  "■ 内容　　：\n" . $message . "\n\n" .
  "--------------------------------------------\n" .
  "送信日時： " . date('Y-m-d H:i:s') . "\n" .
  "IP　　　： " . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '') . "\n";

/* 件名・送信者名は UTF-8 のMIMEヘッダーとしてエンコード（=?UTF-8?B?...?=） */
$encSubject = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($subject, 'UTF-8', 'B') : $subject;
$replyName  = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($name, 'UTF-8', 'B') : $name;
$fromName   = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($SITE, 'UTF-8', 'B') : $SITE;
$headers =
  'From: ' . $fromName . ' <' . $FROM . ">\r\n" .
  'Reply-To: ' . $replyName . ' <' . $email . ">\r\n" .
  "MIME-Version: 1.0\r\n" .
  "Content-Type: text/plain; charset=UTF-8\r\n" .
  "Content-Transfer-Encoding: 8bit\r\n" .
  "X-Mailer: PHP/" . phpversion();

/* 本文はUTF-8のまま送信（mb_send_mailは使わない） */
$sent = mail($TO, $encSubject, $body, $headers);

if ($sent) {
  respond(true, 'お問い合わせありがとうございます。内容を送信しました。担当者より折り返しご連絡いたします。', $wantsJson);
} else {
  http_response_code(500);
  respond(false, '送信に失敗しました。お手数ですが info@revenge.co.jp まで直接ご連絡ください。', $wantsJson);
}
