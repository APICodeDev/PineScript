<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

function respond($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function request_json(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: LiquidityHeatmap/1.0',
        ],
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false || $err) {
        throw new Exception('Network error: ' . $err);
    }
    if ($code < 200 || $code >= 300) {
        throw new Exception('HTTP error ' . $code);
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new Exception('Invalid JSON response');
    }
    return $decoded;
}

$action = $_GET['action'] ?? '';
$symbol = strtoupper($_GET['symbol'] ?? 'BTCUSDT');
$interval = $_GET['interval'] ?? '5m';
$limit = (int) ($_GET['limit'] ?? 288);

try {
    switch ($action) {
        case 'symbols':
            $data = request_json('https://api.binance.com/api/v3/exchangeInfo');
            respond($data);
            break;

        case 'klines':
            $url = sprintf(
                'https://api.binance.com/api/v3/klines?symbol=%s&interval=%s&limit=%d',
                urlencode($symbol),
                urlencode($interval),
                max(10, min(1000, $limit))
            );
            $data = request_json($url);
            respond($data);
            break;

        case 'ticker':
            $url = sprintf('https://api.binance.com/api/v3/ticker/24hr?symbol=%s', urlencode($symbol));
            $data = request_json($url);
            respond($data);
            break;

        default:
            respond(['error' => 'Invalid action. Use symbols|klines|ticker'], 400);
    }
} catch (Throwable $e) {
    respond(['error' => $e->getMessage()], 502);
}
